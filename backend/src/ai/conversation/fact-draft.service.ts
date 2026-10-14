import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ConversationFactCandidateStatus, ConversationMessageRole, Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationAction } from '../../platform/authorization/authorization.types';
import { AuthorizationService } from '../../platform/authorization/authorization.service';
import type { AuthorizationRequest } from '../../platform/authorization/authorization.service';
import { RegistryService } from '../../platform/registry/registry.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { ConversationService } from './conversation.service';
import { UsersService } from '../../users/users.service';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { FarmsService } from '../../farms/farms.service';
import { CropsService } from '../../crops/crops.service';
import { LivestockService } from '../../livestock/livestock.service';
import { MarketplaceService } from '../../marketplace/marketplace.service';
import { UpdateFarmDto } from '../../farms/dto/update-farm.dto';
import { UpdateCropDto } from '../../crops/dto/update-crop.dto';
import { UpdateLivestockDto } from '../../livestock/dto/update-livestock.dto';
import { UpdateListingDto } from '../../marketplace/dto/update-listing.dto';

type AiTargetContext = {
  ownerId: string;
  farmId?: string;
};

export interface CreateFactDraftInput {
  targetModuleId: string;
  targetEntityType: string;
  targetFieldId: string;
  evidenceMessageId: string;
  targetEntityId?: string;
  proposedValue: unknown;
  confidence?: number;
  sessionId?: string;
}

/**
 * Creates validation-pending proposals only. It never applies a domain write.
 * Field identity/normalization comes from the platform resource registry;
 * module and entity eligibility comes from the canonical AI module contracts.
 */
@Injectable()
export class FactDraftService {
  constructor(
    private readonly conversations: ConversationService,
    private readonly aiRegistry: AiRegistryService,
    private readonly platformRegistry: RegistryService,
    private readonly authorization: AuthorizationService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly users: UsersService,
    @Optional() private readonly farms?: FarmsService,
    @Optional() private readonly crops?: CropsService,
    @Optional() private readonly livestock?: LivestockService,
    @Optional() private readonly marketplace?: MarketplaceService,
  ) {}

  async createDraft(input: CreateFactDraftInput, actor: { userId: string; role: UserRole }, conversationId: string) {
    if (!actor?.userId || !Object.values(UserRole).includes(actor.role)) {
      throw new ForbiddenException('A valid authenticated actor is required to draft an AI fact.');
    }

    const conversation = await this.conversations.getConversation(conversationId, actor.userId);
    const targetModule = this.aiRegistry.getModule(input.targetModuleId);
    if (!targetModule.allowedCapabilities.includes('EXTRACTION')) {
      throw new ForbiddenException('The target AI module does not permit fact extraction.');
    }
    if (!targetModule.candidateFactTargets.includes(input.targetEntityType)) {
      throw new BadRequestException('The target entity is not registered as a fact candidate target for this module.');
    }
    const isOwnUserProfileUpdate =
      input.targetModuleId === 'KK-USER-001' &&
      input.targetEntityType === 'User' &&
      input.targetEntityId === actor.userId;
    if (isOwnUserProfileUpdate && actor.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin AI profile changes require explicit God Mode authorization; this user-profile handler does not grant that authority.');
    }
    let existingTargetContext: AiTargetContext | undefined;
    if (input.targetEntityId && !isOwnUserProfileUpdate) {
      this.assertAiUpdateTarget(input.targetModuleId, input.targetEntityType, input.targetFieldId);
      existingTargetContext = await this.getAiTargetContext(
        input.targetModuleId,
        input.targetEntityType,
        input.targetEntityId,
      );
    }
    if (isOwnUserProfileUpdate) {
      this.assertAiUpdateTarget(input.targetModuleId, input.targetEntityType, input.targetFieldId);
    }
    if (input.targetModuleId === 'KK-USER-001' && input.targetEntityType === 'User' && !isOwnUserProfileUpdate) {
      throw new BadRequestException('User profile drafts must target the authenticated user record.');
    }
    if (
      input.targetFieldId === 'id' ||
      /password|secret|token|credential|privatekey|passwordhash/i.test(input.targetFieldId)
    ) {
      throw new ForbiddenException('Restricted fields cannot be drafted by AI.');
    }
    if (input.proposedValue === undefined || input.proposedValue === null) {
      throw new BadRequestException('proposedValue must be a non-null JSON value.');
    }
    if (typeof input.proposedValue === 'number' && !Number.isFinite(input.proposedValue)) {
      throw new BadRequestException('proposedValue must be a finite JSON number.');
    }
    if (input.confidence !== undefined && (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1)) {
      throw new BadRequestException('confidence must be a number between 0 and 1.');
    }

    const evidence = conversation.messages.find((message) => message.id === input.evidenceMessageId);
    if (!evidence || evidence.role !== ConversationMessageRole.USER) {
      throw new NotFoundException('A user-authored evidence message in this conversation is required.');
    }

    const resource = this.platformRegistry.getAll().find((candidate) => candidate.model === input.targetEntityType);
    if (!resource) {
      throw new BadRequestException('The target entity has no registered platform resource.');
    }
    if (!resource.fields || !Object.prototype.hasOwnProperty.call(resource.fields, input.targetFieldId)) {
      throw new BadRequestException('The target field is not registered for the selected entity.');
    }

    // Resource-level CREATE/UPDATE permission and field-level WRITE policy
    // must both allow this proposal before it is saved for review.
    await this.assertAiWriteAuthorization(actor, {
      user: actor,
      module: resource.module,
      resource: resource.name,
      action: isOwnUserProfileUpdate || existingTargetContext ? AuthorizationAction.UPDATE : AuthorizationAction.CREATE,
      ...(isOwnUserProfileUpdate
        ? { resourceId: actor.userId }
        : existingTargetContext && input.targetEntityId
          ? { resourceId: input.targetEntityId }
          : {}),
      ...(existingTargetContext?.farmId ? { farmId: existingTargetContext.farmId } : {}),
      ownerId: existingTargetContext?.ownerId ?? actor.userId,
    }, [input.targetFieldId], 'Authorization denied for the target resource or field.');

    const validation = this.platformRegistry.validateResourceField(
      resource.name,
      input.targetFieldId,
      input.proposedValue,
    );
    const normalizedValue = validation.value;
    if (normalizedValue === undefined || normalizedValue === null) {
      throw new BadRequestException('The proposed value cannot be normalized to a storable value.');
    }

    let previousValue: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;
    if (isOwnUserProfileUpdate) {
      const field = input.targetFieldId;
      const current = await this.prisma.user.findUnique({
        where: { id: actor.userId },
        select: { [field]: true } as any,
      }) as Record<string, unknown> | null;
      if (!current) throw new NotFoundException('The authenticated user profile no longer exists.');
      previousValue = this.toJsonValue(current[field]);
    } else if (existingTargetContext && input.targetEntityId) {
      previousValue = this.toJsonValue(await this.readAiTargetField(
        this.prisma,
        input.targetEntityType,
        input.targetEntityId,
        input.targetFieldId,
      ));
    }

    const evidenceLanguage = evidence.language ?? conversation.primaryLanguage ?? 'und';
    const provenance: Prisma.InputJsonObject = {
      providerId: 'conversation-draft-service',
      modelId: 'not-applicable',
      modelVersion: 'not-applicable',
      mode: 'DISABLED',
      language: evidenceLanguage,
      source: 'USER_AUTHORED_EVIDENCE',
      generatedAt: evidence.createdAt.toISOString(),
      evidenceMessageId: evidence.id,
      extractionModelUsed: false,
    };

    const candidate = await this.conversations.createFactCandidate({
      conversationId,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      userId: actor.userId,
      moduleId: input.targetModuleId,
      targetEntityType: input.targetEntityType,
      ...(isOwnUserProfileUpdate
        ? { targetEntityId: actor.userId }
        : input.targetEntityId
          ? { targetEntityId: input.targetEntityId }
          : {}),
      targetFieldId: input.targetFieldId,
      proposedValue: normalizedValue as Prisma.InputJsonValue,
      ...(previousValue === undefined ? {} : { previousValue }),
      confidence: input.confidence,
      source: 'CONVERSATION_DRAFT',
      status: ConversationFactCandidateStatus.VALIDATION_PENDING,
      requiresConfirmation: true,
      evidenceReference: evidence.id,
      provenance,
      validationResult: {
        valid: validation.valid,
        errors: validation.errors,
        normalized: validation.valid,
        fieldDefinition: input.targetFieldId,
        resource: resource.name,
        policySource: 'CENTRAL_PLATFORM_REGISTRY',
      } as Prisma.InputJsonValue,
    }, actor.userId);

    return {
      candidate,
      previewHash: this.previewHash(candidate),
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        normalizedValue,
        requiresUserConfirmation: true,
        applied: false,
      },
    };
  }

  async listDrafts(conversationId: string, actorUserId: string) {
    const candidates = await this.conversations.listFactCandidates(conversationId, actorUserId);
    return candidates.map((candidate) => ({
      ...candidate,
      previewHash: this.previewHash(candidate),
      applied: candidate.status === ConversationFactCandidateStatus.APPLIED,
    }));
  }

  async confirmDraft(
    conversationId: string,
    candidateId: string,
    suppliedPreviewHash: string,
    actor: { userId: string; role: UserRole },
  ) {
    const conversation = await this.conversations.getConversation(conversationId, actor.userId);
    const candidate = await this.prisma.conversationFactCandidate.findFirst({
      where: { id: candidateId, conversationId: conversation.id, userId: actor.userId },
    });
    if (!candidate) throw new NotFoundException('Fact draft was not found.');

    if (
      candidate.status !== ConversationFactCandidateStatus.VALIDATION_PENDING &&
      candidate.status !== ConversationFactCandidateStatus.AWAITING_CONFIRMATION
    ) {
      throw new ConflictException('This fact draft is no longer awaiting confirmation.');
    }
    const validation = candidate.validationResult;
    if (!validation || typeof validation !== 'object' || Array.isArray(validation) ||
        (validation as Record<string, unknown>).valid !== true) {
      throw new BadRequestException('A draft with failed or missing central validation cannot be confirmed.');
    }
    this.assertEvidenceStillPresent(conversation.messages, candidate.evidenceReference);
    this.assertPreviewHash(candidate, suppliedPreviewHash);

    const module = this.aiRegistry.getModule(candidate.moduleId);
    if (!module.allowedCapabilities.includes('EXTRACTION') ||
        !module.candidateFactTargets.includes(candidate.targetEntityType ?? '')) {
      throw new ForbiddenException('The draft no longer matches the canonical AI module contract.');
    }
    const resource = this.platformRegistry.getAll().find((item) => item.model === candidate.targetEntityType);
    if (!resource || !resource.fields || !candidate.targetFieldId ||
        !Object.prototype.hasOwnProperty.call(resource.fields, candidate.targetFieldId)) {
      throw new BadRequestException('The draft target is no longer registered in the platform field registry.');
    }
    const isOwnUserProfileUpdate = candidate.moduleId === 'KK-USER-001' &&
      candidate.targetEntityType === 'User' && candidate.targetEntityId === actor.userId;
    if (isOwnUserProfileUpdate) {
      this.assertAiUpdateTarget(candidate.moduleId, 'User', candidate.targetFieldId ?? '');
    }
    let existingTargetContext: AiTargetContext | undefined;
    if (candidate.targetEntityId && !isOwnUserProfileUpdate) {
      this.assertAiUpdateTarget(candidate.moduleId, candidate.targetEntityType ?? '', candidate.targetFieldId ?? '');
      existingTargetContext = await this.getAiTargetContext(
        candidate.moduleId,
        candidate.targetEntityType ?? '',
        candidate.targetEntityId,
      );
    }
    await this.assertAiWriteAuthorization(actor, {
      user: actor,
      module: resource.module,
      resource: resource.name,
      action: isOwnUserProfileUpdate || existingTargetContext ? AuthorizationAction.UPDATE : AuthorizationAction.CREATE,
      ...(isOwnUserProfileUpdate
        ? { resourceId: actor.userId }
        : existingTargetContext && candidate.targetEntityId
          ? { resourceId: candidate.targetEntityId }
          : {}),
      ...(existingTargetContext?.farmId ? { farmId: existingTargetContext.farmId } : {}),
      ownerId: existingTargetContext?.ownerId ?? actor.userId,
    }, [candidate.targetFieldId], 'Current authorization no longer permits confirming this draft.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.conversationFactCandidate.updateMany({
        where: {
          id: candidate.id,
          conversationId: conversation.id,
          userId: actor.userId,
          status: { in: [ConversationFactCandidateStatus.VALIDATION_PENDING, ConversationFactCandidateStatus.AWAITING_CONFIRMATION] },
        },
        data: {
          status: ConversationFactCandidateStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedByUserId: actor.userId,
        },
      });
      if (transition.count !== 1) throw new ConflictException('The draft changed while it was being confirmed; reload the preview.');
      const saved = await tx.conversationFactCandidate.findUnique({ where: { id: candidate.id } });
      if (!saved) throw new NotFoundException('Confirmed fact draft could not be reloaded.');
      await this.audit.createInTransaction(tx, {
        actorId: actor.userId,
        action: 'AI_FACT_DRAFT_CONFIRMED',
        resourceType: 'ConversationFactCandidate',
        resourceId: candidate.id,
        description: 'User confirmed the exact validated fact draft preview; no domain record was applied.',
        metadata: {
          conversationId,
          moduleId: candidate.moduleId,
          targetEntityType: candidate.targetEntityType ?? '',
          targetFieldId: candidate.targetFieldId ?? '',
          evidenceReference: candidate.evidenceReference ?? '',
          previewHash: suppliedPreviewHash,
          applied: false,
        },
      });
      return saved;
    });

    return { candidate: updated, previewHash: this.previewHash(updated), applied: false };
  }

  async applyConfirmedDraft(
    conversationId: string,
    candidateId: string,
    suppliedPreviewHash: string,
    actor: { userId: string; role: UserRole },
  ) {
    const conversation = await this.conversations.getConversation(conversationId, actor.userId);
    const candidate = await this.prisma.conversationFactCandidate.findFirst({
      where: { id: candidateId, conversationId: conversation.id, userId: actor.userId },
    });
    if (!candidate) throw new NotFoundException('Fact draft was not found.');
    if (candidate.status !== ConversationFactCandidateStatus.CONFIRMED) {
      throw new ConflictException('Only a confirmed draft can be applied. Confirm the current preview first.');
    }
    const validation = candidate.validationResult;
    if (!validation || typeof validation !== 'object' || Array.isArray(validation) ||
        (validation as Record<string, unknown>).valid !== true) {
      throw new BadRequestException('A draft with failed or missing central validation cannot be applied.');
    }
    this.assertEvidenceStillPresent(conversation.messages, candidate.evidenceReference);
    this.assertPreviewHash(candidate, suppliedPreviewHash);

    const module = this.aiRegistry.getModule(candidate.moduleId);
    if (!module.allowedCapabilities.includes('EXTRACTION') ||
        !module.candidateFactTargets.includes(candidate.targetEntityType ?? '')) {
      throw new ForbiddenException('The draft no longer matches the canonical AI module contract.');
    }
    const resource = this.platformRegistry.getAll().find((item) => item.model === candidate.targetEntityType);
    const field = candidate.targetFieldId;
    const ownProfileUpdate = candidate.moduleId === 'KK-USER-001' &&
      candidate.targetEntityType === 'User' && candidate.targetEntityId === actor.userId;
    let existingTargetContext: AiTargetContext | undefined;
    if (!field || !resource || !resource.fields ||
        !Object.prototype.hasOwnProperty.call(resource.fields, field)) {
      throw new ForbiddenException('The target field is not registered for the selected resource.');
    }
    if (ownProfileUpdate) {
      if (resource.model !== 'User') {
        throw new ForbiddenException('AI profile application requires the registered User resource.');
      }
      this.assertAiUpdateTarget(candidate.moduleId, 'User', field);
    } else {
      if (!candidate.targetEntityId) {
        throw new ForbiddenException('A new-record fact requires a module-owned multi-field creation workflow; this draft remains confirmed but unapplied.');
      }
      this.assertAiUpdateTarget(candidate.moduleId, candidate.targetEntityType ?? '', field);
      existingTargetContext = await this.getAiTargetContext(
        candidate.moduleId,
        candidate.targetEntityType ?? '',
        candidate.targetEntityId,
      );
    }

    await this.assertAiWriteAuthorization(actor, {
      user: actor,
      module: resource.module,
      resource: resource.name,
      action: AuthorizationAction.UPDATE,
      resourceId: ownProfileUpdate ? actor.userId : candidate.targetEntityId!,
      ...(existingTargetContext?.farmId ? { farmId: existingTargetContext.farmId } : {}),
      ownerId: existingTargetContext?.ownerId ?? actor.userId,
    }, [field], 'Current authorization no longer permits applying this draft.');

    const normalized = this.platformRegistry.validateResourceField(resource.name, field, candidate.proposedValue);
    if (!normalized.valid || normalized.value === undefined) {
      throw new BadRequestException('The proposed value no longer passes central field validation.');
    }
    const userUpdate = ownProfileUpdate ? { [field]: normalized.value } as UpdateUserDto : undefined;

    const applied = await this.prisma.$transaction(async (tx) => {
      // Lock the target row and compare against the value captured at draft time;
      // stale previews must be recreated rather than overwriting newer record data.
      let currentValue: unknown;
      if (ownProfileUpdate) {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${actor.userId} FOR UPDATE`);
        const current = await tx.user.findUnique({
          where: { id: actor.userId },
          select: { [field]: true } as any,
        }) as Record<string, unknown> | null;
        if (!current) throw new NotFoundException('The authenticated user profile no longer exists.');
        currentValue = current[field] ?? null;
      } else {
        await this.lockAiTargetRow(tx, candidate.targetEntityType ?? '', candidate.targetEntityId!);
        currentValue = await this.readAiTargetField(tx, candidate.targetEntityType ?? '', candidate.targetEntityId!, field);
      }
      const priorValue = candidate.previousValue === undefined ? null : candidate.previousValue;
      if (JSON.stringify(this.stableValue(currentValue)) !== JSON.stringify(this.stableValue(priorValue))) {
        throw new ConflictException('The target field changed after this draft was created. Reload the current record and create a new draft.');
      }

      const transition = await tx.conversationFactCandidate.updateMany({
        where: {
          id: candidate.id,
          conversationId: conversation.id,
          userId: actor.userId,
          status: ConversationFactCandidateStatus.CONFIRMED,
        },
        data: {
          status: ConversationFactCandidateStatus.APPLIED,
          appliedAt: new Date(),
          resolutionNote: ownProfileUpdate
            ? 'Applied through the authorized UsersService update workflow.'
            : 'Applied through the authorized module-owned update workflow.',
        },
      });
      if (transition.count !== 1) {
        throw new ConflictException('The draft was applied or changed concurrently; reload the current status.');
      }

      const updatedTarget = ownProfileUpdate
        ? await this.users.update(actor.userId, userUpdate!, actor.userId, tx)
        : await this.applyAiTargetUpdate(
            candidate.moduleId,
            candidate.targetEntityType ?? '',
            candidate.targetEntityId!,
            field,
            normalized.value,
            actor,
            tx,
          );
      const saved = await tx.conversationFactCandidate.findUnique({ where: { id: candidate.id } });
      if (!saved) throw new NotFoundException('Applied fact draft could not be reloaded.');
      await this.audit.createInTransaction(tx, {
        actorId: actor.userId,
        action: 'AI_FACT_DRAFT_APPLIED',
        resourceType: 'ConversationFactCandidate',
        resourceId: candidate.id,
        description: ownProfileUpdate
          ? 'Confirmed AI fact draft applied through the authorized UsersService workflow.'
          : 'Confirmed AI fact draft applied through the authorized module-owned update workflow.',
        metadata: {
          conversationId,
          moduleId: candidate.moduleId,
          targetEntityType: candidate.targetEntityType ?? '',
          targetEntityId: candidate.targetEntityId ?? '',
          targetFieldId: field,
          evidenceReference: candidate.evidenceReference ?? '',
          previewHash: suppliedPreviewHash,
          applied: true,
          applicationService: ownProfileUpdate ? 'UsersService.update' : (candidate.targetEntityType ?? '') + 'Service.update',
        },
      });
      return { candidate: saved, target: updatedTarget };
    });

    return {
      candidate: applied.candidate,
      applied: true,
      targetEntityType: candidate.targetEntityType ?? '',
      targetEntityId: candidate.targetEntityId ?? '',
      targetFieldId: field,
    };
  }

  async rejectDraft(
    conversationId: string,
    candidateId: string,
    suppliedPreviewHash: string,
    actorUserId: string,
    reason?: string,
  ) {
    const conversation = await this.conversations.getConversation(conversationId, actorUserId);
    const candidate = await this.prisma.conversationFactCandidate.findFirst({
      where: { id: candidateId, conversationId: conversation.id, userId: actorUserId },
    });
    if (!candidate) throw new NotFoundException('Fact draft was not found.');
    const rejectableStatuses: ConversationFactCandidateStatus[] = [
      ConversationFactCandidateStatus.DETECTED,
      ConversationFactCandidateStatus.NORMALIZED,
      ConversationFactCandidateStatus.VALIDATION_PENDING,
      ConversationFactCandidateStatus.CONFLICT,
      ConversationFactCandidateStatus.AWAITING_CONFIRMATION,
    ];
    if (!rejectableStatuses.includes(candidate.status)) {
      throw new ConflictException('This fact draft is no longer eligible for rejection.');
    }
    this.assertEvidenceStillPresent(conversation.messages, candidate.evidenceReference);
    this.assertPreviewHash(candidate, suppliedPreviewHash);
    const updated = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.conversationFactCandidate.updateMany({
        where: {
          id: candidate.id,
          conversationId: conversation.id,
          userId: actorUserId,
          status: { in: [ConversationFactCandidateStatus.DETECTED, ConversationFactCandidateStatus.NORMALIZED, ConversationFactCandidateStatus.VALIDATION_PENDING, ConversationFactCandidateStatus.CONFLICT, ConversationFactCandidateStatus.AWAITING_CONFIRMATION] },
        },
        data: {
          status: ConversationFactCandidateStatus.REJECTED,
          resolutionNote: reason?.trim().slice(0, 300) || 'Rejected by user.',
        },
      });
      if (transition.count !== 1) throw new ConflictException('The draft changed while it was being rejected; reload the preview.');
      const saved = await tx.conversationFactCandidate.findUnique({ where: { id: candidate.id } });
      if (!saved) throw new NotFoundException('Rejected fact draft could not be reloaded.');
      await this.audit.createInTransaction(tx, {
        actorId: actorUserId,
        action: 'AI_FACT_DRAFT_REJECTED',
        resourceType: 'ConversationFactCandidate',
        resourceId: candidate.id,
        description: 'User rejected a fact draft; no domain record was applied.',
        metadata: {
          conversationId,
          moduleId: candidate.moduleId,
          targetEntityType: candidate.targetEntityType ?? '',
          targetFieldId: candidate.targetFieldId ?? '',
          evidenceReference: candidate.evidenceReference ?? '',
          previewHash: suppliedPreviewHash,
          applied: false,
        },
      });
      return saved;
    });
    return { candidate: updated, applied: false };
  }

  private assertEvidenceStillPresent(messages: Array<{ id: string; role: ConversationMessageRole }>, evidenceReference: string | null) {
    if (!evidenceReference || !messages.some((message) => message.id === evidenceReference && message.role === ConversationMessageRole.USER)) {
      throw new ConflictException('The original user-authored evidence is no longer available; the draft cannot be confirmed.');
    }
  }

  private assertPreviewHash(candidate: {
    id: string; conversationId: string; userId: string; moduleId: string;
    targetEntityType: string | null; targetEntityId: string | null; targetFieldId: string | null;
    proposedValue: unknown; previousValue: unknown; confidence: { toString(): string } | null;
    source: string; evidenceReference: string | null; provenance: unknown; validationResult: unknown;
  }, supplied: string) {
    if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/i.test(supplied)) {
      throw new BadRequestException('A valid previewHash is required to bind confirmation to the exact displayed draft.');
    }
    const expected = this.previewHash(candidate);
    const expectedBytes = Buffer.from(expected, 'hex');
    const suppliedBytes = Buffer.from(supplied, 'hex');
    if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
      throw new ConflictException('The draft changed after preview; reload and review the current version.');
    }
  }

  private previewHash(candidate: {
    id: string; conversationId: string; userId: string; moduleId: string;
    targetEntityType: string | null; targetEntityId: string | null; targetFieldId: string | null;
    proposedValue: unknown; previousValue: unknown; confidence: { toString(): string } | null;
    source: string; evidenceReference: string | null; provenance: unknown; validationResult: unknown;
  }): string {
    const material = {
      id: candidate.id,
      conversationId: candidate.conversationId,
      userId: candidate.userId,
      moduleId: candidate.moduleId,
      targetEntityType: candidate.targetEntityType,
      targetEntityId: candidate.targetEntityId,
      targetFieldId: candidate.targetFieldId,
      proposedValue: candidate.proposedValue,
      previousValue: candidate.previousValue,
      confidence: candidate.confidence?.toString() ?? null,
      source: candidate.source,
      evidenceReference: candidate.evidenceReference,
      provenance: candidate.provenance,
      validationResult: candidate.validationResult,
    };
    return createHash('sha256').update(JSON.stringify(this.stableValue(material))).digest('hex');
  }

  private async assertAiWriteAuthorization(
    actor: { userId: string; role: UserRole },
    request: AuthorizationRequest,
    fields: readonly string[],
    deniedMessage: string,
  ): Promise<void> {
    if (actor.role === UserRole.SUPER_ADMIN) {
      const decision = await this.authorization.authorize(request);
      if (decision?.allowed !== true || decision.metadata?.scope !== 'GOD_MODE') {
        throw new ForbiddenException('Super Admin AI writes require verified SYSTEM_GOD authorization.');
      }
      return;
    }

    const decision = await this.authorization.authorizeFields(request, fields, 'WRITE');
    if (decision?.allowed !== true || decision.decision?.allowed !== true ||
        typeof decision.decision.permissionId !== 'string' || !decision.decision.permissionId ||
        decision.fieldPolicy?.allowed !== true) {
      throw new ForbiddenException(deniedMessage);
    }
  }

  private assertAiUpdateTarget(moduleId: string, entityType: string, field: string) {
    const allowedFields = this.aiRegistry.getModule(moduleId).applyFields?.[entityType];
    if (!Array.isArray(allowedFields) || !allowedFields.includes(field)) {
      throw new ForbiddenException('No governed AI update handler permits this module, entity, and field combination.');
    }
  }

  private async getAiTargetContext(
    moduleId: string,
    entityType: string,
    entityId: string,
  ): Promise<AiTargetContext> {
    const allowedFields = this.aiRegistry.getModule(moduleId).applyFields?.[entityType];
    if (!Array.isArray(allowedFields) || allowedFields.length === 0) {
      throw new ForbiddenException('No governed AI update handler is registered for this target entity.');
    }

    switch (entityType) {
      case 'Farm': {
        const record = await this.prisma.farm.findFirst({
          where: { id: entityId },
          select: { id: true, ownerId: true },
        });
        if (!record) throw new NotFoundException('Farm target was not found.');
        return { ownerId: await this.currentResourceOwner('farm', entityId, record.ownerId) };
      }
      case 'Crop': {
        const record = await this.prisma.crop.findFirst({
          where: { id: entityId, deletedAt: null },
          select: { id: true, farmId: true, farm: { select: { ownerId: true } } },
        });
        if (!record) throw new NotFoundException('Crop target was not found.');
        return {
          ownerId: await this.currentResourceOwner('crop', entityId, record.farm.ownerId),
          farmId: record.farmId,
        };
      }
      case 'Livestock': {
        const record = await this.prisma.livestock.findFirst({
          where: { id: entityId, deletedAt: null },
          select: { id: true, farmId: true, farm: { select: { ownerId: true } } },
        });
        if (!record) throw new NotFoundException('Livestock target was not found.');
        return {
          ownerId: await this.currentResourceOwner('livestock', entityId, record.farm.ownerId),
          farmId: record.farmId,
        };
      }
      case 'MarketplaceListing': {
        const record = await this.prisma.marketplaceListing.findFirst({
          where: { id: entityId, deletedAt: null },
          select: { id: true, sellerId: true },
        });
        if (!record) throw new NotFoundException('Marketplace listing target was not found.');
        return { ownerId: record.sellerId };
      }
      default:
        throw new ForbiddenException('No governed AI update handler is registered for this target entity.');
    }
  }

  private async currentResourceOwner(resourceType: string, resourceId: string, fallbackOwnerId: string) {
    const relationship = await this.prisma.resourceRelationship.findFirst({
      where: { resourceType, resourceId, relationshipType: 'OWNER', endedAt: null },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { userId: true },
    });
    return relationship?.userId ?? fallbackOwnerId;
  }

  private async readAiTargetField(client: any, entityType: string, entityId: string, field: string): Promise<unknown> {
    let record: Record<string, unknown> | null;
    switch (entityType) {
      case 'Farm':
        record = await client.farm.findFirst({ where: { id: entityId }, select: { [field]: true } });
        break;
      case 'Crop':
        record = await client.crop.findFirst({ where: { id: entityId, deletedAt: null }, select: { [field]: true } });
        break;
      case 'Livestock':
        record = await client.livestock.findFirst({ where: { id: entityId, deletedAt: null }, select: { [field]: true } });
        break;
      case 'MarketplaceListing':
        record = await client.marketplaceListing.findFirst({ where: { id: entityId, deletedAt: null }, select: { [field]: true } });
        break;
      default:
        throw new ForbiddenException('No governed AI field reader is registered for this target.');
    }
    if (!record) throw new NotFoundException('The AI draft target no longer exists.');
    return record[field] ?? null;
  }

  private async lockAiTargetRow(tx: Prisma.TransactionClient, entityType: string, entityId: string) {
    switch (entityType) {
      case 'Farm':
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Farm" WHERE "id" = ${entityId} FOR UPDATE`);
        return;
      case 'Crop':
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Crop" WHERE "id" = ${entityId} FOR UPDATE`);
        return;
      case 'Livestock':
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Livestock" WHERE "id" = ${entityId} FOR UPDATE`);
        return;
      case 'MarketplaceListing':
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "MarketplaceListing" WHERE "id" = ${entityId} FOR UPDATE`);
        return;
      default:
        throw new ForbiddenException('No governed AI row lock is registered for this target.');
    }
  }

  private async applyAiTargetUpdate(
    moduleId: string,
    entityType: string,
    entityId: string,
    field: string,
    value: unknown,
    actor: { userId: string; role: UserRole },
    tx: Prisma.TransactionClient,
  ) {
    this.assertAiUpdateTarget(moduleId, entityType, field);
    switch (entityType) {
      case 'Farm':
        if (!this.farms) break;
        return this.farms.update(entityId, actor.userId, actor.role, { [field]: value } as UpdateFarmDto, tx);
      case 'Crop':
        if (!this.crops) break;
        return this.crops.update(actor.userId, actor.role, entityId, { [field]: value } as UpdateCropDto, tx);
      case 'Livestock':
        if (!this.livestock) break;
        return this.livestock.update(actor.userId, actor.role, entityId, { [field]: value } as UpdateLivestockDto, tx);
      case 'MarketplaceListing':
        if (!this.marketplace) break;
        return this.marketplace.update(actor.userId, actor.role, entityId, { [field]: value } as UpdateListingDto, tx);
    }
    throw new ForbiddenException('The governed module update service is not available for this target.');
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === null || value === undefined) return Prisma.JsonNull;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && value !== null && typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      return this.toJsonValue((value as { toJSON: () => unknown }).toJSON());
    }
    return value as Prisma.InputJsonValue;
  }

  private stableValue(value: unknown): unknown {
    if (value === Prisma.JsonNull || value === Prisma.DbNull || value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.stableValue(item));
    if (!value || typeof value !== 'object') return value;
    if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      return this.stableValue((value as { toJSON: () => unknown }).toJSON());
    }
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [
      key,
      this.stableValue((value as Record<string, unknown>)[key]),
    ]));
  }
}

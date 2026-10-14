import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ConversationFactCandidateStatus, ConversationMessageRole, Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationAction } from '../../platform/authorization/authorization.types';
import { AuthorizationService } from '../../platform/authorization/authorization.service';
import { RegistryService } from '../../platform/registry/registry.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { ConversationService } from './conversation.service';

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
    if (input.targetEntityId && !isOwnUserProfileUpdate) {
      throw new BadRequestException('Existing-record changes require the dedicated authorized update workflow; only the authenticated user may draft their own registered profile fields here.');
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
    const decision = await this.authorization.authorizeFields({
      user: actor,
      module: resource.module,
      resource: resource.name,
      action: isOwnUserProfileUpdate ? AuthorizationAction.UPDATE : AuthorizationAction.CREATE,
      ...(isOwnUserProfileUpdate ? { resourceId: actor.userId } : {}),
      ownerId: actor.userId,
    }, [input.targetFieldId], 'WRITE');
    if (decision?.allowed !== true || decision.decision?.allowed !== true ||
        typeof decision.decision.permissionId !== 'string' || !decision.decision.permissionId ||
        decision.fieldPolicy?.allowed !== true) {
      throw new ForbiddenException('Authorization denied for the target resource or field.');
    }

    const validation = this.platformRegistry.validateResourceField(
      resource.name,
      input.targetFieldId,
      input.proposedValue,
    );
    const normalizedValue = validation.value;
    if (normalizedValue === undefined || normalizedValue === null) {
      throw new BadRequestException('The proposed value cannot be normalized to a storable value.');
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
      ...(isOwnUserProfileUpdate ? { targetEntityId: actor.userId } : {}),
      targetFieldId: input.targetFieldId,
      proposedValue: normalizedValue as Prisma.InputJsonValue,
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
    if (candidate.targetEntityId && !isOwnUserProfileUpdate) {
      throw new ForbiddenException('Existing-record draft requires its dedicated authorized update workflow.');
    }
    const decision = await this.authorization.authorizeFields({
      user: actor,
      module: resource.module,
      resource: resource.name,
      action: isOwnUserProfileUpdate ? AuthorizationAction.UPDATE : AuthorizationAction.CREATE,
      ...(isOwnUserProfileUpdate ? { resourceId: actor.userId } : {}),
      ownerId: actor.userId,
    }, [candidate.targetFieldId], 'WRITE');
    if (decision?.allowed !== true || decision.decision?.allowed !== true ||
        typeof decision.decision.permissionId !== 'string' || !decision.decision.permissionId ||
        decision.fieldPolicy?.allowed !== true) {
      throw new ForbiddenException('Current authorization no longer permits confirming this draft.');
    }

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

  private stableValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.stableValue(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [
      key,
      this.stableValue((value as Record<string, unknown>)[key]),
    ]));
  }
}

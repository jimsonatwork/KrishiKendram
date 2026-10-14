import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  ConversationFactCandidateStatus,
  ConversationMessageRole,
  ConversationMessageSource,
  ConversationSessionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { RegistryService } from '../../platform/registry/registry.service';
import { AuditService } from '../../platform/audit/audit.service';

export interface CreateConversationInput {
  userId: string;
  moduleId: string;
  title?: string;
  primaryLanguage?: string;
}
export interface CreateSessionInput {
  conversationId: string;
  interruptionState?: string;
  discoveryState?: Prisma.InputJsonValue;
}
export interface AppendMessageInput {
  conversationId: string;
  sessionId?: string;
  role: ConversationMessageRole;
  content: string;
  language?: string;
  source?: ConversationMessageSource;
  providerId?: string;
  modelId?: string;
  modelVersion?: string;
  metadata?: Prisma.InputJsonValue;
  provenance?: Prisma.InputJsonValue;
}
export interface AddContextInput {
  conversationId: string;
  sessionId?: string;
  moduleId: string;
  screenId?: string;
  entityType?: string;
  entityId?: string;
  policyId?: string;
  policyVersion?: string;
  contextSnapshot?: Prisma.InputJsonValue;
  capability?: string;
  references?: string[];
  fields?: string[];
}
export interface AddReferenceInput {
  conversationId: string;
  moduleId: string;
  referenceType: string;
  entityType?: string;
  entityId?: string;
  relationship?: string;
}
export interface CreateFactCandidateInput {
  conversationId: string;
  sessionId?: string;
  userId: string;
  moduleId: string;
  targetEntityType?: string;
  targetEntityId?: string;
  targetFieldId?: string;
  proposedValue: Prisma.InputJsonValue;
  previousValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  confidence?: Prisma.Decimal | number | string;
  source: string;
  status?: ConversationFactCandidateStatus;
  requiresConfirmation?: boolean;
  evidenceReference?: string;
  provenance?: Prisma.InputJsonValue;
  validationResult?: Prisma.InputJsonValue;
}

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AiRegistryService,
    @Optional() private readonly platformRegistry?: RegistryService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async createConversation(input: CreateConversationInput) {
    this.registry.assertModuleRegistered(input.moduleId);
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Conversation user was not found.');
    return this.prisma.conversation.create({
      data: {
        userId: input.userId,
        moduleId: input.moduleId,
        title: input.title,
        primaryLanguage: input.primaryLanguage,
      },
    });
  }

  async getConversation(conversationId: string, userId: string, options?: { responseOnly?: boolean }) {
    // Filter by owner in the query so private messages/contexts are never
    // loaded for a non-owner before the ownership decision. A response turn
    // needs only the most recent messages; loading every related table for each
    // spoken question creates avoidable database and serialization work.
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: options?.responseOnly
        ? { messages: { orderBy: { createdAt: 'desc' }, take: 4 } }
        : {
            sessions: { orderBy: { createdAt: 'asc' } },
            messages: { orderBy: { createdAt: 'asc' } },
            contexts: { orderBy: { createdAt: 'asc' } },
            references: { orderBy: { createdAt: 'asc' } },
            factCandidates: { orderBy: { createdAt: 'asc' } },
            actions: { orderBy: { proposedAt: 'asc' } },
          },
    });
    if (conversation) return conversation;

    // Keep the established not-found vs forbidden behavior using metadata only.
    const ownership = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true },
    });
    if (!ownership) throw new NotFoundException('Conversation was not found.');
    this.assertUserAccess(ownership.userId, userId);
    throw new NotFoundException('Conversation was not found.');
  }

  async createSession(input: CreateSessionInput, actorUserId: string) {
    const conversation = await this.requireConversationForUser(input.conversationId, actorUserId);
    return this.prisma.conversationSession.create({
      data: {
        conversationId: conversation.id,
        interruptionState: input.interruptionState,
        discoveryState: input.discoveryState,
      },
    });
  }


  /**
   * Fail closed when governed AI provenance is missing or malformed.
   * Required fields are owned by the central AI registry, not duplicated here.
   */
  private assertRequiredProvenance(
    provenance: Prisma.InputJsonValue | undefined,
    subject: string,
  ): Record<string, unknown> {
    const raw: unknown = provenance;

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException(`${subject} requires a provenance object.`);
    }

    const record = raw as Record<string, unknown>;
    const required = this.registry.getProvenanceRequirements();

    if (!Array.isArray(required) || required.length === 0) {
      throw new BadRequestException(
        'AI provenance requirements are unavailable; operation denied.',
      );
    }

    for (const field of required) {
      if (
        typeof field !== 'string' ||
        typeof record[field] !== 'string' ||
        !(record[field] as string).trim()
      ) {
        throw new BadRequestException(
          `${subject} provenance is missing required field: ${String(field)}.`,
        );
      }
    }

    if (
      typeof record.generatedAt !== 'string' ||
      Number.isNaN(Date.parse(record.generatedAt))
    ) {
      throw new BadRequestException(
        `${subject} provenance generatedAt must be a valid date string.`,
      );
    }

    return record;
  }

async appendMessage(input: AppendMessageInput, actorUserId: string) {
    const conversation = await this.requireConversationForUser(input.conversationId, actorUserId);
    if (input.role === ConversationMessageRole.ASSISTANT) {
      const provenance = this.assertRequiredProvenance(
        input.provenance,
        'Assistant message',
      );

      for (const field of ['providerId', 'modelId', 'modelVersion'] as const) {
        const value = input[field];
        if (typeof value !== 'string' || !value.trim()) {
          throw new BadRequestException(
            `Assistant message requires ${field}.`,
          );
        }
        if (provenance[field] !== value) {
          throw new BadRequestException(
            `Assistant message ${field} must match provenance.`,
          );
        }
      }

      if (input.language && provenance.language !== input.language) {
        throw new BadRequestException(
          'Assistant message language must match provenance.',
        );
      }
    }


    if (!input.content.trim())
      throw new BadRequestException(
        'Conversation message content cannot be empty.',
      );
    if (input.sessionId)
      await this.requireSession(input.sessionId, conversation.id);
    const message = await this.prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        language: input.language,
        source: input.source ?? ConversationMessageSource.TEXT,
        providerId: input.providerId,
        modelId: input.modelId,
        modelVersion: input.modelVersion,
        metadata: input.metadata,
        provenance: input.provenance,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: message.createdAt },
    });
    return message;
  }

  async addContext(input: AddContextInput, actorUserId: string) {
    const conversation = await this.requireConversationForUser(input.conversationId, actorUserId);
    if (conversation.moduleId !== input.moduleId)
      throw new BadRequestException(
        'Context moduleId must match the conversation moduleId.',
      );
    this.registry.assertContextAllowed({
      moduleId: input.moduleId,
      capability: input.capability,
      references: input.references,
      fields: input.fields,
    });
    if (input.sessionId)
      await this.requireSession(input.sessionId, conversation.id);
    return this.prisma.conversationContext.create({
      data: {
        conversationId: conversation.id,
        sessionId: input.sessionId,
        moduleId: input.moduleId,
        screenId: input.screenId,
        entityType: input.entityType,
        entityId: input.entityId,
        policyId: input.policyId,
        policyVersion: input.policyVersion,
        contextSnapshot: input.contextSnapshot,
      },
    });
  }

  async addReference(input: AddReferenceInput, actorUserId: string) {
    const conversation = await this.requireConversationForUser(input.conversationId, actorUserId);
    if (conversation.moduleId !== input.moduleId)
      throw new BadRequestException(
        'Reference moduleId must match the conversation moduleId.',
      );
    this.registry.assertContextAllowed({
      moduleId: input.moduleId,
      references: [input.referenceType],
    });
    return this.prisma.conversationReference.create({
      data: {
        conversationId: conversation.id,
        moduleId: input.moduleId,
        referenceType: input.referenceType,
        entityType: input.entityType,
        entityId: input.entityId,
        relationship: input.relationship,
      },
    });
  }

  async createFactCandidate(input: CreateFactCandidateInput, actorUserId: string) {
    const conversation = await this.requireConversationForUser(input.conversationId, actorUserId);
    if (input.userId !== actorUserId) {
      throw new ForbiddenException('Fact candidate userId must match the authenticated actor.');
    }
    this.assertRequiredProvenance(
      input.provenance,
      'AI fact candidate',
    );

    const allowedInitialStatuses = new Set<ConversationFactCandidateStatus>([
      ConversationFactCandidateStatus.DETECTED,
      ConversationFactCandidateStatus.NORMALIZED,
      ConversationFactCandidateStatus.VALIDATION_PENDING,
      ConversationFactCandidateStatus.CONFLICT,
      ConversationFactCandidateStatus.AWAITING_CONFIRMATION,
    ]);

    if (input.status !== undefined && !allowedInitialStatuses.has(input.status)) {
      throw new BadRequestException(
        'A fact candidate cannot be created in a confirmed, applied, or terminal state.',
      );
    }

    if (
      input.requiresConfirmation === false ||
      !this.registry.requiresUserConfirmation()
    ) {
      throw new BadRequestException(
        'AI fact candidates must require explicit user confirmation.',
      );
    }


    if (conversation.userId !== actorUserId)
      throw new ForbiddenException('Conversation does not belong to the authenticated actor.');
    // Conversations are centrally owned; fact candidates may target any
    // registered module whose own contract and resource authorization allow it.
    this.registry.assertModuleRegistered(input.moduleId);
    const module = this.registry.getModule(input.moduleId);
    if (!module.candidateFactTargets.includes(input.targetEntityType ?? '')) {
      throw new BadRequestException(
        'AI fact target entity is not allowed by the canonical module contract.',
      );
    }
    if (
      input.targetFieldId &&
      module.restrictedFields?.includes(input.targetFieldId)
    )
      throw new BadRequestException(
        'Restricted AI fields cannot become fact candidates.',
      );
    if (input.targetFieldId && !module.allowedFields.includes(input.targetFieldId)) {
      const registeredResource = this.platformRegistry?.getAll().find(
        (resource) =>
          resource.model === input.targetEntityType &&
          Object.prototype.hasOwnProperty.call(resource.fields ?? {}, input.targetFieldId),
      );
      if (!registeredResource) {
        throw new BadRequestException(
          'AI fact target field is not allowed by the central AI module or platform field registry.',
        );
      }
    }
    const requiresConfirmation =
      input.requiresConfirmation ?? this.registry.requiresUserConfirmation();
    if (!requiresConfirmation)
      throw new BadRequestException(
        'AI fact candidates must require user confirmation.',
      );
    if (input.sessionId)
      await this.requireSession(input.sessionId, conversation.id);
    const auditService = this.auditService;
    if (!auditService) {
      throw new InternalServerErrorException('Audit service is required to create a fact draft.');
    }
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.conversationFactCandidate.create({
        data: {
        conversationId: conversation.id,
        sessionId: input.sessionId,
        userId: input.userId,
        moduleId: input.moduleId,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        targetFieldId: input.targetFieldId,
        proposedValue: input.proposedValue,
        previousValue: input.previousValue,
        confidence:
          input.confidence === undefined
            ? undefined
            : new Prisma.Decimal(input.confidence),
        source: input.source,
        status: input.status ?? ConversationFactCandidateStatus.DETECTED,
        requiresConfirmation,
        evidenceReference: input.evidenceReference,
        provenance: input.provenance,
        validationResult: input.validationResult,
        },
      });
      await auditService.createInTransaction(tx, {
        actorId: input.userId,
        action: 'AI_FACT_DRAFT_CREATED',
        resourceType: 'ConversationFactCandidate',
        resourceId: candidate.id,
        description: 'Fact draft created for review; no domain record was written.',
        metadata: {
          conversationId: conversation.id,
          moduleId: input.moduleId,
          targetEntityType: input.targetEntityType ?? '',
          targetFieldId: input.targetFieldId ?? '',
          evidenceReference: input.evidenceReference ?? '',
          status: candidate.status,
          requiresConfirmation: true,
          applied: false,
        },
      });
      return candidate;
    });
  }

  async listFactCandidates(conversationId: string, userId: string) {
    const conversation = await this.requireConversationForUser(conversationId, userId);
    return this.prisma.conversationFactCandidate.findMany({
      where: { conversationId: conversation.id, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listHistory(conversationId: string, userId: string) {
    const conversation = await this.requireConversationForUser(conversationId, userId);
    return this.prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async requireConversation(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true, moduleId: true },
    });
    if (!conversation)
      throw new NotFoundException('Conversation was not found.');
    return conversation;
  }

  private async requireSession(sessionId: string, conversationId: string) {
    const session = await this.prisma.conversationSession.findUnique({
      where: { id: sessionId },
      select: { id: true, conversationId: true, status: true },
    });
    if (!session || session.conversationId !== conversationId)
      throw new NotFoundException('Conversation session was not found.');
    if (session.status === ConversationSessionStatus.EXPIRED)
      throw new BadRequestException(
        'Expired conversation sessions cannot receive new data.',
      );
    return session;
  }

  private async requireConversationForUser(conversationId: string, actorUserId: string) {
    if (typeof actorUserId !== 'string' || !actorUserId.trim()) {
      throw new ForbiddenException('A valid authenticated actor is required.');
    }
    const conversation = await this.requireConversation(conversationId);
    this.assertUserAccess(conversation.userId, actorUserId);
    return conversation;
  }

  private assertUserAccess(ownerUserId: string, requestedUserId: string) {
    if (!requestedUserId || ownerUserId !== requestedUserId)
      throw new ForbiddenException('Conversation does not belong to the authenticated actor.');
  }
}

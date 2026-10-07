import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
  previousValue?: Prisma.InputJsonValue;
  confidence?: Prisma.Decimal | number | string;
  source: string;
  status?: ConversationFactCandidateStatus;
  requiresConfirmation?: boolean;
  evidenceReference?: string;
  provenance?: Prisma.InputJsonValue;
}

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AiRegistryService,
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

  async getConversation(conversationId: string, userId?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        sessions: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        contexts: { orderBy: { createdAt: 'asc' } },
        references: { orderBy: { createdAt: 'asc' } },
        factCandidates: { orderBy: { createdAt: 'asc' } },
        actions: { orderBy: { proposedAt: 'asc' } },
      },
    });
    if (!conversation)
      throw new NotFoundException('Conversation was not found.');
    this.assertUserAccess(conversation.userId, userId);
    return conversation;
  }

  async createSession(input: CreateSessionInput) {
    const conversation = await this.requireConversation(input.conversationId);
    return this.prisma.conversationSession.create({
      data: {
        conversationId: conversation.id,
        interruptionState: input.interruptionState,
        discoveryState: input.discoveryState,
      },
    });
  }

  async appendMessage(input: AppendMessageInput) {
    if (!input.content.trim())
      throw new BadRequestException(
        'Conversation message content cannot be empty.',
      );
    const conversation = await this.requireConversation(input.conversationId);
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

  async addContext(input: AddContextInput) {
    const conversation = await this.requireConversation(input.conversationId);
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

  async addReference(input: AddReferenceInput) {
    const conversation = await this.requireConversation(input.conversationId);
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

  async createFactCandidate(input: CreateFactCandidateInput) {
    const conversation = await this.requireConversation(input.conversationId);
    if (conversation.userId !== input.userId)
      throw new BadRequestException(
        'Fact candidate userId must match the conversation owner.',
      );
    if (conversation.moduleId !== input.moduleId)
      throw new BadRequestException(
        'Fact candidate moduleId must match the conversation moduleId.',
      );
    const module = this.registry.getModule(input.moduleId);
    if (
      input.targetFieldId &&
      module.restrictedFields?.includes(input.targetFieldId)
    )
      throw new BadRequestException(
        'Restricted AI fields cannot become fact candidates.',
      );
    if (
      input.targetFieldId &&
      !module.allowedFields.includes(input.targetFieldId)
    )
      throw new BadRequestException(
        'AI fact target field is not allowed by the module registry.',
      );
    const requiresConfirmation =
      input.requiresConfirmation ?? this.registry.requiresUserConfirmation();
    if (!requiresConfirmation)
      throw new BadRequestException(
        'AI fact candidates must require user confirmation.',
      );
    if (input.sessionId)
      await this.requireSession(input.sessionId, conversation.id);
    return this.prisma.conversationFactCandidate.create({
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
      },
    });
  }

  async listHistory(conversationId: string, userId?: string) {
    const conversation = await this.requireConversation(conversationId);
    this.assertUserAccess(conversation.userId, userId);
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

  private assertUserAccess(ownerUserId: string, requestedUserId?: string) {
    if (requestedUserId !== undefined && ownerUserId !== requestedUserId)
      throw new BadRequestException(
        'Conversation does not belong to the requested user.',
      );
  }
}

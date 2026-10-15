import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ConversationFactCandidateStatus,
  ConversationMessageRole,
} from '@prisma/client';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { AuditService } from '../../platform/audit/audit.service';

describe('ConversationService AI governance', () => {
  let service: ConversationService;
  let prisma: any;
  let registry: any;
  let audit: { createInTransaction: jest.Mock };

  const provenance = {
    providerId: 'local-provider',
    modelId: 'test-model',
    modelVersion: '1.0.0',
    mode: 'LOCAL',
    language: 'en',
    source: 'AI_GENERATED',
    generatedAt: '2026-10-11T10:00:00.000Z',
  };

  beforeEach(async () => {
    audit = { createInTransaction: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    prisma = {
      conversation: {
        findMany: jest.fn().mockResolvedValue([{ id: 'conversation-1' }]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'conversation-1',
          userId: 'user-1',
          moduleId: 'KK-USER-001',
        }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'conversation-1', userId: 'user-1', moduleId: 'KK-USER-001', messages: [],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      conversationMessage: {
        create: jest.fn().mockImplementation(({ data }) => data),
      },
      conversationFactCandidate: {
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'candidate-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const transaction = { conversationFactCandidate: prisma.conversationFactCandidate };
    prisma.$transaction = jest.fn().mockImplementation((callback: any) => callback(transaction));

    registry = {
      assertModuleRegistered: jest.fn(),
      getProvenanceRequirements: jest.fn().mockReturnValue([
        'providerId',
        'modelId',
        'modelVersion',
        'mode',
        'language',
        'source',
        'generatedAt',
      ]),
      requiresUserConfirmation: jest.fn().mockReturnValue(true),
      getModule: jest.fn().mockReturnValue({
        allowedFields: [],
        restrictedFields: [],
        candidateFactTargets: ['User'],
      }),
    };

    // Use the real Nest provider tokens while keeping all data operations mocked.
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiRegistryService, useValue: registry },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(ConversationService);
  });

  it('lists only the authenticated user conversations for the requested module', async () => {
    await expect(service.listRecentConversations('user-1', 'KK-USER-001')).resolves.toEqual([
      { id: 'conversation-1' },
    ]);
    expect(prisma.conversation.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', moduleId: 'KK-USER-001' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        primaryLanguage: true,
        status: true,
        lastMessageAt: true,
        updatedAt: true,
      },
    });
  });

  it('rejects an assistant message without provenance', async () => {
    await expect(
      service.appendMessage({
        conversationId: 'conversation-1',
        role: ConversationMessageRole.ASSISTANT,
        content: 'Hello',
        providerId: provenance.providerId,
        modelId: provenance.modelId,
        modelVersion: provenance.modelVersion,
      }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.conversationMessage.create).not.toHaveBeenCalled();
  });

  it('accepts a valid assistant message with matching provenance', async () => {
    await service.appendMessage({
      conversationId: 'conversation-1',
      role: ConversationMessageRole.ASSISTANT,
      content: 'Hello',
      language: 'en',
      providerId: provenance.providerId,
      modelId: provenance.modelId,
      modelVersion: provenance.modelVersion,
      provenance,
    }, 'user-1');

    expect(prisma.conversationMessage.create).toHaveBeenCalled();
  });

  it('does not require AI provenance for an ordinary user message', async () => {
    await service.appendMessage({
      conversationId: 'conversation-1',
      role: ConversationMessageRole.USER,
      content: 'My farm is near the village.',
    }, 'user-1');

    expect(prisma.conversationMessage.create).toHaveBeenCalled();
  });

  it('rejects a fact candidate without provenance', async () => {
    await expect(
      service.createFactCandidate({
        conversationId: 'conversation-1',
        userId: 'user-1',
        moduleId: 'KK-USER-001',
        proposedValue: { value: 'example' },
        source: 'AI',
      }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.conversationFactCandidate.create).not.toHaveBeenCalled();
  });

  it('rejects malformed provenance timestamps', async () => {
    await expect(
      service.createFactCandidate({
        conversationId: 'conversation-1',
        userId: 'user-1',
        moduleId: 'KK-USER-001',
        proposedValue: { value: 'example' },
        source: 'AI',
        provenance: { ...provenance, generatedAt: 'not-a-date' },
      }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ConversationFactCandidateStatus.CONFIRMED,
    ConversationFactCandidateStatus.APPLIED,
  ])('rejects creation directly in status %s', async (status) => {
    await expect(
      service.createFactCandidate({
        conversationId: 'conversation-1',
        userId: 'user-1',
        moduleId: 'KK-USER-001',
        proposedValue: { value: 'example' },
        source: 'AI',
        provenance,
        status,
      }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.conversationFactCandidate.create).not.toHaveBeenCalled();
  });

  it('rejects attempts to disable confirmation', async () => {
    await expect(
      service.createFactCandidate({
        conversationId: 'conversation-1',
        userId: 'user-1',
        moduleId: 'KK-USER-001',
        proposedValue: { value: 'example' },
        source: 'AI',
        provenance,
        requiresConfirmation: false,
      }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a fact target that is not allowed by the module contract before opening a transaction', async () => {
    await expect(service.createFactCandidate({
      conversationId: 'conversation-1',
      userId: 'user-1',
      moduleId: 'KK-USER-001',
      targetEntityType: 'Land',
      proposedValue: { value: 'example' },
      source: 'AI',
      provenance,
    }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.conversationFactCandidate.create).not.toHaveBeenCalled();
  });

  it('creates a valid candidate with confirmation required', async () => {
    await service.createFactCandidate({
      conversationId: 'conversation-1',
      userId: 'user-1',
      moduleId: 'KK-USER-001',
      targetEntityType: 'User',
      proposedValue: { value: 'example' },
      source: 'AI',
      provenance,
    }, 'user-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.conversationFactCandidate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requiresConfirmation: true,
        }),
      }),
    );
    expect(audit.createInTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        actorId: 'user-1',
        action: 'AI_FACT_DRAFT_CREATED',
        resourceType: 'ConversationFactCandidate',
        metadata: expect.objectContaining({ applied: false, requiresConfirmation: true }),
      }),
    );
  });

  it('filters conversation content by owner before loading private child records', async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);

    await expect(service.getConversation('conversation-1', 'attacker-user'))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'conversation-1', userId: 'attacker-user' },
      include: expect.any(Object),
    }));
    expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      select: { id: true, userId: true },
    });
  });

  it('rejects appending to another user conversation before writing', async () => {
    await expect(
      service.appendMessage({
        conversationId: 'conversation-1',
        role: ConversationMessageRole.USER,
        content: 'Private message',
      }, 'attacker-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.conversationMessage.create).not.toHaveBeenCalled();
    expect(prisma.conversation.update).not.toHaveBeenCalled();
  });

  it('rejects a fact candidate when the actor is not the conversation owner', async () => {
    await expect(
      service.createFactCandidate({
        conversationId: 'conversation-1',
        userId: 'attacker-user',
        moduleId: 'KK-USER-001',
        proposedValue: { value: 'example' },
        source: 'AI',
        provenance,
      }, 'attacker-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.conversationFactCandidate.create).not.toHaveBeenCalled();
  });

  it('rejects a fact candidate whose payload user differs from the actor', async () => {
    await expect(
      service.createFactCandidate({
        conversationId: 'conversation-1',
        userId: 'different-user',
        moduleId: 'KK-USER-001',
        proposedValue: { value: 'example' },
        source: 'AI',
        provenance,
      }, 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.conversationFactCandidate.create).not.toHaveBeenCalled();
  });

});

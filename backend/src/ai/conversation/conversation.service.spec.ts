import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  ConversationFactCandidateStatus,
  ConversationMessageRole,
} from '@prisma/client';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiRegistryService } from '../registry/ai-registry.service';

describe('ConversationService AI governance', () => {
  let service: ConversationService;
  let prisma: any;
  let registry: any;

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
    prisma = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conversation-1',
          userId: 'user-1',
          moduleId: 'KK-USER-001',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      conversationMessage: {
        create: jest.fn().mockImplementation(({ data }) => data),
      },
      conversationFactCandidate: {
        create: jest.fn().mockImplementation(({ data }) => data),
      },
    };

    registry = {
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
      }),
    };

    // Use the real Nest provider tokens while keeping all data operations mocked.
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiRegistryService, useValue: registry },
      ],
    }).compile();

    service = moduleRef.get(ConversationService);
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
      }),
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
    });

    expect(prisma.conversationMessage.create).toHaveBeenCalled();
  });

  it('does not require AI provenance for an ordinary user message', async () => {
    await service.appendMessage({
      conversationId: 'conversation-1',
      role: ConversationMessageRole.USER,
      content: 'My farm is near the village.',
    });

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
      }),
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
      }),
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
      }),
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
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a valid candidate with confirmation required', async () => {
    await service.createFactCandidate({
      conversationId: 'conversation-1',
      userId: 'user-1',
      moduleId: 'KK-USER-001',
      proposedValue: { value: 'example' },
      source: 'AI',
      provenance,
    });

    expect(prisma.conversationFactCandidate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requiresConfirmation: true,
        }),
      }),
    );
  });
});

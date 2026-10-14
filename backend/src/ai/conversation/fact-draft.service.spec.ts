import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationMessageRole, UserRole } from '@prisma/client';
import { FactDraftService } from './fact-draft.service';
import { ConversationService } from './conversation.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { RegistryService } from '../../platform/registry/registry.service';
import { AuthorizationService } from '../../platform/authorization/authorization.service';

describe('FactDraftService central validation and authorization', () => {
  let service: FactDraftService;
  let conversations: any;
  let aiRegistry: any;
  let platformRegistry: any;
  let authorization: any;
  let prisma: any;
  let tx: any;
  let audit: any;
  const evidence = {
    id: 'user-message-1',
    role: ConversationMessageRole.USER,
    content: 'My farm is called Green Valley.',
    language: 'te-IN',
    createdAt: new Date('2026-10-13T09:00:00.000Z'),
  };

  beforeEach(() => {
    conversations = {
      getConversation: jest.fn().mockResolvedValue({
        id: 'conversation-1',
        userId: 'farmer-1',
        moduleId: 'KK-AI-CONVERSATION-001',
        primaryLanguage: 'te-IN',
        messages: [evidence],
      }),
      createFactCandidate: jest.fn().mockResolvedValue({ id: 'candidate-1', status: 'VALIDATION_PENDING' }),
      listFactCandidates: jest.fn().mockResolvedValue([]),
    };
    aiRegistry = {
      getModule: jest.fn().mockReturnValue({
        allowedCapabilities: ['CONVERSATION', 'EXTRACTION'],
        candidateFactTargets: ['Farm'],
      }),
    };
    platformRegistry = {
      getAll: jest.fn().mockReturnValue([{
        name: 'farm',
        model: 'Farm',
        module: 'farms',
        fields: { name: { definition: 'farmName' } },
      }]),
      validateResourceField: jest.fn().mockReturnValue({
        valid: true,
        value: 'Green Valley',
        errors: [],
      }),
    };
    authorization = {
      authorizeFields: jest.fn().mockResolvedValue({
        allowed: true,
        decision: { allowed: true, permissionId: 'permission-1' },
        fieldPolicy: { allowed: true },
      }),
    };
    tx = {
      conversationFactCandidate: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => ({
          id: where.id, status: 'CONFIRMED', moduleId: 'KK-FARM-001',
        })),
      },
    };
    prisma = {
      conversationFactCandidate: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((callback: any) => callback(tx)),
    };
    audit = { createInTransaction: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    service = new FactDraftService(
      conversations as ConversationService,
      aiRegistry as AiRegistryService,
      platformRegistry as RegistryService,
      authorization as AuthorizationService,
      prisma,
      audit,
    );
  });

  it('creates a validation-pending draft across modules using central resource fields and field authorization', async () => {
    const result = await service.createDraft({
      targetModuleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetFieldId: 'name',
      evidenceMessageId: 'user-message-1',
      proposedValue: '  Green Valley  ',
      confidence: 0.95,
    }, { userId: 'farmer-1', role: UserRole.FARMER }, 'conversation-1');

    expect(authorization.authorizeFields).toHaveBeenCalledWith(expect.objectContaining({
      user: { userId: 'farmer-1', role: UserRole.FARMER },
      module: 'farms',
      resource: 'farm',
      action: 'CREATE',
      ownerId: 'farmer-1',
    }), ['name'], 'WRITE');
    expect(platformRegistry.validateResourceField).toHaveBeenCalledWith('farm', 'name', '  Green Valley  ');
    expect(conversations.createFactCandidate).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'conversation-1',
      userId: 'farmer-1',
      moduleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetFieldId: 'name',
      proposedValue: 'Green Valley',
      source: 'CONVERSATION_DRAFT',
      status: 'VALIDATION_PENDING',
      requiresConfirmation: true,
      evidenceReference: 'user-message-1',
      provenance: expect.objectContaining({
        providerId: 'conversation-draft-service',
        modelId: 'not-applicable',
        mode: 'DISABLED',
        source: 'USER_AUTHORED_EVIDENCE',
        extractionModelUsed: false,
      }),
      validationResult: expect.objectContaining({ valid: true, policySource: 'CENTRAL_PLATFORM_REGISTRY' }),
    }), 'farmer-1');
    expect(result.validation.applied).toBe(false);
  });

  it('denies candidates when resource or field authorization fails', async () => {
    authorization.authorizeFields.mockResolvedValue({
      allowed: false,
      decision: { allowed: false },
      fieldPolicy: { allowed: false },
    });
    await expect(service.createDraft({
      targetModuleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetFieldId: 'name',
      evidenceMessageId: 'user-message-1',
      proposedValue: 'Green Valley',
    }, { userId: 'farmer-1', role: UserRole.FARMER }, 'conversation-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(conversations.createFactCandidate).not.toHaveBeenCalled();
  });

  it('requires evidence to be an existing user-authored message in the owned conversation', async () => {
    await expect(service.createDraft({
      targetModuleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetFieldId: 'name',
      evidenceMessageId: 'missing-message',
      proposedValue: 'Green Valley',
    }, { userId: 'farmer-1', role: UserRole.FARMER }, 'conversation-1'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(authorization.authorizeFields).not.toHaveBeenCalled();
  });

  it('rejects entities and fields not allowed by the central AI and platform registries', async () => {
    await expect(service.createDraft({
      targetModuleId: 'KK-FARM-001',
      targetEntityType: 'UserSecret',
      targetFieldId: 'passwordHash',
      evidenceMessageId: 'user-message-1',
      proposedValue: 'x',
    }, { userId: 'farmer-1', role: UserRole.FARMER }, 'conversation-1'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(conversations.createFactCandidate).not.toHaveBeenCalled();
  });

  it('stores validation failures as a draft requiring correction, never as an applied write', async () => {
    platformRegistry.validateResourceField.mockReturnValue({
      valid: false,
      value: -100,
      errors: ['Field must be at least zero.'],
    });
    const result = await service.createDraft({
      targetModuleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetFieldId: 'name',
      evidenceMessageId: 'user-message-1',
      proposedValue: -100,
    }, { userId: 'farmer-1', role: UserRole.FARMER }, 'conversation-1');

    expect(result.validation).toMatchObject({
      valid: false,
      errors: ['Field must be at least zero.'],
      requiresUserConfirmation: true,
      applied: false,
    });
    expect(conversations.createFactCandidate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'VALIDATION_PENDING',
      validationResult: expect.objectContaining({ valid: false }),
    }), 'farmer-1');
  });

  it('allows only the authenticated user to draft their own registered profile fields with UPDATE permission', async () => {
    aiRegistry.getModule.mockReturnValue({
      allowedCapabilities: ['EXTRACTION'],
      candidateFactTargets: ['User'],
    });
    platformRegistry.getAll.mockReturnValue([{
      name: 'user',
      model: 'User',
      module: 'users',
      fields: { name: { definition: 'userName' } },
    }]);
    await service.createDraft({
      targetModuleId: 'KK-USER-001',
      targetEntityType: 'User',
      targetEntityId: 'farmer-1',
      targetFieldId: 'name',
      evidenceMessageId: 'user-message-1',
      proposedValue: 'Jimson',
    }, { userId: 'farmer-1', role: UserRole.FARMER }, 'conversation-1');
    expect(authorization.authorizeFields).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'user',
      action: 'UPDATE',
      resourceId: 'farmer-1',
      ownerId: 'farmer-1',
    }), ['name'], 'WRITE');
    expect(conversations.createFactCandidate).toHaveBeenCalledWith(expect.objectContaining({
      targetEntityId: 'farmer-1',
      moduleId: 'KK-USER-001',
    }), 'farmer-1');
  });

  it('confirms only the exact currently validated preview and audits the transition atomically', async () => {
    const candidate = {
      id: 'candidate-1',
      conversationId: 'conversation-1',
      userId: 'farmer-1',
      moduleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetEntityId: null,
      targetFieldId: 'name',
      proposedValue: 'Green Valley',
      previousValue: null,
      confidence: null,
      source: 'CONVERSATION_DRAFT',
      status: 'VALIDATION_PENDING',
      evidenceReference: 'user-message-1',
      provenance: {
        providerId: 'conversation-draft-service',
        modelId: 'not-applicable',
        modelVersion: 'not-applicable',
        mode: 'DISABLED',
        language: 'te-IN',
        source: 'USER_AUTHORED_EVIDENCE',
        generatedAt: evidence.createdAt.toISOString(),
        evidenceMessageId: 'user-message-1',
        extractionModelUsed: false,
      },
      validationResult: { valid: true, errors: [], resource: 'farm', fieldDefinition: 'name' },
    };
    conversations.listFactCandidates.mockResolvedValue([candidate]);
    prisma.conversationFactCandidate.findFirst.mockResolvedValue(candidate);
    tx.conversationFactCandidate.findUnique.mockResolvedValue({ ...candidate, status: 'CONFIRMED' });
    const [preview] = await service.listDrafts('conversation-1', 'farmer-1');

    const result = await service.confirmDraft('conversation-1', 'candidate-1', preview.previewHash, {
      userId: 'farmer-1', role: UserRole.FARMER,
    });

    expect(tx.conversationFactCandidate.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'candidate-1',
        status: { in: ['VALIDATION_PENDING', 'AWAITING_CONFIRMATION'] },
      }),
      data: expect.objectContaining({
        status: 'CONFIRMED',
        confirmedByUserId: 'farmer-1',
      }),
    }));
    expect(audit.createInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      actorId: 'farmer-1',
      action: 'AI_FACT_DRAFT_CONFIRMED',
      resourceType: 'ConversationFactCandidate',
      resourceId: 'candidate-1',
      metadata: expect.objectContaining({ previewHash: preview.previewHash, applied: false }),
    }));
    expect(result.applied).toBe(false);
  });

  it('rejects stale preview hashes and never updates the candidate', async () => {
    const candidate = {
      id: 'candidate-1', conversationId: 'conversation-1', userId: 'farmer-1',
      moduleId: 'KK-FARM-001', targetEntityType: 'Farm', targetEntityId: null,
      targetFieldId: 'name', proposedValue: 'Green Valley', previousValue: null,
      confidence: null, source: 'CONVERSATION_DRAFT', status: 'VALIDATION_PENDING',
      evidenceReference: 'user-message-1',
      provenance: { providerId: 'conversation-draft-service' },
      validationResult: { valid: true },
    };
    prisma.conversationFactCandidate.findFirst.mockResolvedValue(candidate);
    await expect(service.confirmDraft('conversation-1', 'candidate-1', 'a'.repeat(64), {
      userId: 'farmer-1', role: UserRole.FARMER,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects drafts with invalid central validation', async () => {
    const candidate = {
      id: 'candidate-1', conversationId: 'conversation-1', userId: 'farmer-1',
      moduleId: 'KK-FARM-001', targetEntityType: 'Farm', targetEntityId: null,
      targetFieldId: 'name', proposedValue: -1, previousValue: null, confidence: null,
      source: 'CONVERSATION_DRAFT', status: 'VALIDATION_PENDING',
      evidenceReference: 'user-message-1', provenance: { providerId: 'conversation-draft-service' },
      validationResult: { valid: false, errors: ['invalid'] },
    };
    prisma.conversationFactCandidate.findFirst.mockResolvedValue(candidate);
    await expect(service.confirmDraft('conversation-1', 'candidate-1', 'a'.repeat(64), {
      userId: 'farmer-1', role: UserRole.FARMER,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a draft through a compare-and-set transition and records the audit event', async () => {
    const candidate = {
      id: 'candidate-1', conversationId: 'conversation-1', userId: 'farmer-1',
      moduleId: 'KK-FARM-001', targetEntityType: 'Farm', targetEntityId: null,
      targetFieldId: 'name', proposedValue: 'Green Valley', previousValue: null,
      confidence: null, source: 'CONVERSATION_DRAFT', status: 'VALIDATION_PENDING',
      evidenceReference: 'user-message-1',
      provenance: { providerId: 'conversation-draft-service' },
      validationResult: { valid: false, errors: ['needs correction'] },
    };
    conversations.listFactCandidates.mockResolvedValue([candidate]);
    prisma.conversationFactCandidate.findFirst.mockResolvedValue(candidate);
    tx.conversationFactCandidate.findUnique.mockResolvedValue({ ...candidate, status: 'REJECTED' });
    const [preview] = await service.listDrafts('conversation-1', 'farmer-1');

    const result = await service.rejectDraft(
      'conversation-1', 'candidate-1', preview.previewHash, 'farmer-1', 'Incorrect detail',
    );

    expect(tx.conversationFactCandidate.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'candidate-1', status: { in: expect.any(Array) } }),
      data: expect.objectContaining({ status: 'REJECTED', resolutionNote: 'Incorrect detail' }),
    }));
    expect(audit.createInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      action: 'AI_FACT_DRAFT_REJECTED',
      resourceId: 'candidate-1',
      metadata: expect.objectContaining({ previewHash: preview.previewHash, applied: false }),
    }));
    expect(result.applied).toBe(false);
  });

  it('rejects a request without valid actor identity', async () => {
    await expect(service.createDraft({
      targetModuleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetFieldId: 'name',
      evidenceMessageId: 'user-message-1',
      proposedValue: 'Green Valley',
    }, { userId: '', role: UserRole.FARMER }, 'conversation-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});

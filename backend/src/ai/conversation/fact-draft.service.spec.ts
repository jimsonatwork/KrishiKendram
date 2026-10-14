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
  let users: any;
  let farms: any;
  let crops: any;
  let livestock: any;
  let marketplace: any;
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
        applyFields: { Farm: ['name'] },
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
      authorize: jest.fn().mockResolvedValue({ allowed: true, metadata: { scope: 'GLOBAL' } }),
      authorizeFields: jest.fn().mockResolvedValue({
        allowed: true,
        decision: { allowed: true, permissionId: 'permission-1' },
        fieldPolicy: { allowed: true },
      }),
    };
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: {
        findUnique: jest.fn().mockResolvedValue({ name: null }),
      },
      farm: {
        findFirst: jest.fn().mockImplementation(({ select }: any) =>
          select?.ownerId ? { id: 'farm-1', ownerId: 'farmer-1' } : { name: 'Old Farm' }),
        update: jest.fn().mockResolvedValue({ id: 'farm-1', name: 'New Farm' }),
      },
      crop: { findFirst: jest.fn(), update: jest.fn() },
      livestock: { findFirst: jest.fn(), update: jest.fn() },
      marketplaceListing: { findFirst: jest.fn(), update: jest.fn() },
      conversationFactCandidate: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => ({
          id: where.id, status: 'CONFIRMED', moduleId: 'KK-FARM-001',
        })),
      },
    };
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ name: null }),
      },
      farm: {
        findFirst: jest.fn().mockImplementation(({ select }: any) =>
          select?.ownerId ? { id: 'farm-1', ownerId: 'farmer-1' } : { name: 'Old Farm' }),
      },
      crop: { findFirst: jest.fn() },
      livestock: { findFirst: jest.fn() },
      marketplaceListing: { findFirst: jest.fn() },
      resourceRelationship: { findFirst: jest.fn().mockResolvedValue(null) },
      conversationFactCandidate: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((callback: any) => callback(tx)),
    };
    audit = { createInTransaction: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    users = { update: jest.fn().mockResolvedValue({ id: 'farmer-1', name: 'New Name' }) };
    farms = { update: jest.fn().mockResolvedValue({ id: 'farm-1', name: 'New Farm' }) };
    crops = { update: jest.fn().mockResolvedValue({ id: 'crop-1', name: 'New Crop' }) };
    livestock = { update: jest.fn().mockResolvedValue({ id: 'livestock-1', name: 'New Animal' }) };
    marketplace = { update: jest.fn().mockResolvedValue({ id: 'listing-1', title: 'New Listing' }) };
    service = new FactDraftService(
      conversations as ConversationService,
      aiRegistry as AiRegistryService,
      platformRegistry as RegistryService,
      authorization as AuthorizationService,
      prisma,
      audit,
      users,
      farms,
      crops,
      livestock,
      marketplace,
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

  it('captures an existing Farm field only after UPDATE field authorization and uses the real owner context', async () => {
    const result = await service.createDraft({
      targetModuleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetEntityId: 'farm-1',
      targetFieldId: 'name',
      evidenceMessageId: 'user-message-1',
      proposedValue: 'New Farm',
    }, { userId: 'farmer-1', role: UserRole.FARMER }, 'conversation-1');

    expect(authorization.authorizeFields).toHaveBeenCalledWith(expect.objectContaining({
      module: 'farms',
      resource: 'farm',
      action: 'UPDATE',
      resourceId: 'farm-1',
      ownerId: 'farmer-1',
    }), ['name'], 'WRITE');
    expect(prisma.farm.findFirst.mock.invocationCallOrder[1])
      .toBeGreaterThan(authorization.authorizeFields.mock.invocationCallOrder[0]);
    expect(conversations.createFactCandidate).toHaveBeenCalledWith(expect.objectContaining({
      targetEntityId: 'farm-1',
      previousValue: 'Old Farm',
      targetFieldId: 'name',
    }), 'farmer-1');
    expect(result.validation.applied).toBe(false);
  });

  it('applies a confirmed Farm field through FarmsService inside the same transaction and audits the module handler', async () => {
    const candidate = {
      id: 'candidate-farm-1',
      conversationId: 'conversation-1',
      userId: 'farmer-1',
      moduleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetEntityId: 'farm-1',
      targetFieldId: 'name',
      proposedValue: 'New Farm',
      previousValue: 'Old Farm',
      confidence: 0.9,
      source: 'CONVERSATION_DRAFT',
      status: 'CONFIRMED',
      evidenceReference: 'user-message-1',
      provenance: { providerId: 'conversation-draft-service' },
      validationResult: { valid: true, errors: [] },
    };
    prisma.conversationFactCandidate.findFirst.mockResolvedValue(candidate);
    conversations.listFactCandidates.mockResolvedValue([candidate]);
    platformRegistry.validateResourceField.mockReturnValue({ valid: true, value: 'New Farm', errors: [] });
    tx.farm.findFirst.mockResolvedValue({ name: 'Old Farm' });
    tx.conversationFactCandidate.findUnique.mockResolvedValue({ ...candidate, status: 'APPLIED' });
    const [preview] = await service.listDrafts('conversation-1', 'farmer-1');

    const result = await service.applyConfirmedDraft('conversation-1', candidate.id, preview.previewHash, {
      userId: 'farmer-1', role: UserRole.FARMER,
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(farms.update).toHaveBeenCalledWith(
      'farm-1',
      'farmer-1',
      UserRole.FARMER,
      { name: 'New Farm' },
      tx,
    );
    expect(tx.conversationFactCandidate.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: candidate.id, status: 'CONFIRMED' }),
      data: expect.objectContaining({ status: 'APPLIED', appliedAt: expect.any(Date) }),
    }));
    expect(audit.createInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      action: 'AI_FACT_DRAFT_APPLIED',
      resourceId: candidate.id,
      metadata: expect.objectContaining({ applied: true, applicationService: 'FarmService.update' }),
    }));
    expect(result).toMatchObject({
      applied: true,
      targetEntityType: 'Farm',
      targetEntityId: 'farm-1',
      targetFieldId: 'name',
    });
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
      applyFields: { User: ['name'] },
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

  it('fails closed for SUPER_ADMIN profile drafts when explicit God Mode authorization is absent', async () => {
    aiRegistry.getModule.mockReturnValue({
      allowedCapabilities: ['EXTRACTION'],
      candidateFactTargets: ['User'],
      applyFields: { User: ['name'] },
    });
    platformRegistry.getAll.mockReturnValue([{
      name: 'user', model: 'User', module: 'users',
      fields: { name: { definition: 'userName' } },
    }]);
    await expect(service.createDraft({
      targetModuleId: 'KK-USER-001',
      targetEntityType: 'User',
      targetEntityId: 'farmer-1',
      targetFieldId: 'name',
      evidenceMessageId: 'user-message-1',
      proposedValue: 'New Name',
    }, { userId: 'farmer-1', role: UserRole.SUPER_ADMIN }, 'conversation-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(authorization.authorizeFields).not.toHaveBeenCalled();
    expect(conversations.createFactCandidate).not.toHaveBeenCalled();
  });

  it('allows a SUPER_ADMIN business AI draft only when the authorization service reports GOD_MODE', async () => {
    authorization.authorize.mockResolvedValue({ allowed: true, metadata: { scope: 'GOD_MODE' } });
    aiRegistry.getModule.mockReturnValue({
      allowedCapabilities: ['EXTRACTION'],
      candidateFactTargets: ['Farm'],
      applyFields: { Farm: ['name'] },
    });
    platformRegistry.getAll.mockReturnValue([{
      name: 'farm', model: 'Farm', module: 'farms',
      fields: { name: { definition: 'farmName' } },
    }]);

    await service.createDraft({
      targetModuleId: 'KK-FARM-001',
      targetEntityType: 'Farm',
      targetEntityId: 'farm-1',
      targetFieldId: 'name',
      evidenceMessageId: 'user-message-1',
      proposedValue: 'New Farm',
    }, { userId: 'farmer-1', role: UserRole.SUPER_ADMIN }, 'conversation-1');

    expect(authorization.authorize).toHaveBeenCalledWith(expect.objectContaining({
      action: 'UPDATE',
      resourceId: 'farm-1',
      ownerId: 'farmer-1',
    }));
    expect(authorization.authorizeFields).not.toHaveBeenCalled();
    expect(conversations.createFactCandidate).toHaveBeenCalledWith(expect.objectContaining({
      previousValue: 'Old Farm',
      targetEntityId: 'farm-1',
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

  it('applies a confirmed own-profile draft through UsersService in the same transaction and records an applied audit', async () => {
    const candidate = {
      id: 'candidate-1',
      conversationId: 'conversation-1',
      userId: 'farmer-1',
      moduleId: 'KK-USER-001',
      targetEntityType: 'User',
      targetEntityId: 'farmer-1',
      targetFieldId: 'name',
      proposedValue: 'New Name',
      previousValue: 'Old Name',
      confidence: null,
      source: 'CONVERSATION_DRAFT',
      status: 'CONFIRMED',
      evidenceReference: 'user-message-1',
      provenance: { providerId: 'conversation-draft-service' },
      validationResult: { valid: true, errors: [] },
    };
    aiRegistry.getModule.mockReturnValue({
      allowedCapabilities: ['EXTRACTION'],
      candidateFactTargets: ['User'],
      applyFields: { User: ['name'] },
    });
    platformRegistry.getAll.mockReturnValue([{
      name: 'user', model: 'User', module: 'users',
      fields: { name: { definition: 'userName' } },
    }]);
    platformRegistry.validateResourceField.mockReturnValue({ valid: true, value: 'New Name', errors: [] });
    prisma.conversationFactCandidate.findFirst.mockResolvedValue(candidate);
    conversations.listFactCandidates.mockResolvedValue([candidate]);
    tx.user.findUnique.mockResolvedValue({ name: 'Old Name' });
    tx.conversationFactCandidate.findUnique.mockResolvedValue({ ...candidate, status: 'APPLIED' });
    const [preview] = await service.listDrafts('conversation-1', 'farmer-1');

    const result = await service.applyConfirmedDraft('conversation-1', 'candidate-1', preview.previewHash, {
      userId: 'farmer-1', role: UserRole.FARMER,
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.conversationFactCandidate.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'candidate-1', status: 'CONFIRMED' }),
      data: expect.objectContaining({ status: 'APPLIED', appliedAt: expect.any(Date) }),
    }));
    expect(users.update).toHaveBeenCalledWith(
      'farmer-1',
      { name: 'New Name' },
      'farmer-1',
      tx,
    );
    expect(audit.createInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      actorId: 'farmer-1',
      action: 'AI_FACT_DRAFT_APPLIED',
      metadata: expect.objectContaining({ applied: true, applicationService: 'UsersService.update' }),
    }));
    expect(result.applied).toBe(true);
  });

  it.each([
    { entityType: 'Crop', moduleId: 'KK-CROP-001', entityId: 'crop-1', field: 'name', previous: 'Old Crop', proposed: 'New Crop', resourceName: 'crop', resourceModule: 'farms', delegate: 'crop', service: 'crops' },
    { entityType: 'Livestock', moduleId: 'KK-LIVESTOCK-001', entityId: 'livestock-1', field: 'name', previous: 'Old Animal', proposed: 'New Animal', resourceName: 'livestock', resourceModule: 'livestock', delegate: 'livestock', service: 'livestock' },
    { entityType: 'MarketplaceListing', moduleId: 'KK-MARKETPLACE-001', entityId: 'listing-1', field: 'title', previous: 'Old Listing', proposed: 'New Listing', resourceName: 'marketplaceListing', resourceModule: 'marketplace', delegate: 'marketplaceListing', service: 'marketplace' },
  ])('applies an authorized $entityType draft through its module service in the shared transaction', async (testCase) => {
    aiRegistry.getModule.mockReturnValue({
      allowedCapabilities: ['EXTRACTION'],
      candidateFactTargets: [testCase.entityType],
      applyFields: { [testCase.entityType]: [testCase.field] },
    });
    platformRegistry.getAll.mockReturnValue([{
      name: testCase.resourceName,
      model: testCase.entityType,
      module: testCase.resourceModule,
      fields: { [testCase.field]: { definition: testCase.field } },
    }]);
    platformRegistry.validateResourceField.mockReturnValue({
      valid: true, value: testCase.proposed, errors: [],
    });
    const delegate = prisma[testCase.delegate];
    delegate.findFirst.mockImplementation(({ select }: any) => {
      if (testCase.entityType === 'MarketplaceListing') {
        return select?.sellerId
          ? { id: testCase.entityId, sellerId: 'farmer-1' }
          : { [testCase.field]: testCase.previous };
      }
      return select?.farm
        ? { id: testCase.entityId, farmId: 'farm-1', farm: { ownerId: 'farmer-1' } }
        : { [testCase.field]: testCase.previous };
    });
    tx[testCase.delegate].findFirst.mockResolvedValue({ [testCase.field]: testCase.previous });

    const candidate = {
      id: 'candidate-' + testCase.entityId,
      conversationId: 'conversation-1',
      userId: 'farmer-1',
      moduleId: testCase.moduleId,
      targetEntityType: testCase.entityType,
      targetEntityId: testCase.entityId,
      targetFieldId: testCase.field,
      proposedValue: testCase.proposed,
      previousValue: testCase.previous,
      confidence: 0.9,
      source: 'CONVERSATION_DRAFT',
      status: 'CONFIRMED',
      evidenceReference: 'user-message-1',
      provenance: { providerId: 'conversation-draft-service' },
      validationResult: { valid: true, errors: [] },
    };
    prisma.conversationFactCandidate.findFirst.mockResolvedValue(candidate);
    conversations.listFactCandidates.mockResolvedValue([candidate]);
    tx.conversationFactCandidate.findUnique.mockResolvedValue({ ...candidate, status: 'APPLIED' });
    const [preview] = await service.listDrafts('conversation-1', 'farmer-1');
    const result = await service.applyConfirmedDraft('conversation-1', candidate.id, preview.previewHash, {
      userId: 'farmer-1', role: UserRole.FARMER,
    });

    const moduleService = testCase.service === 'crops' ? crops
      : testCase.service === 'livestock' ? livestock : marketplace;
    expect(moduleService.update).toHaveBeenCalledWith(
      'farmer-1',
      UserRole.FARMER,
      testCase.entityId,
      { [testCase.field]: testCase.proposed },
      tx,
    );
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(audit.createInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      action: 'AI_FACT_DRAFT_APPLIED',
      metadata: expect.objectContaining({
        applied: true,
        applicationService: testCase.entityType + 'Service.update',
      }),
    }));
    expect(result).toMatchObject({
      applied: true,
      targetEntityType: testCase.entityType,
      targetEntityId: testCase.entityId,
      targetFieldId: testCase.field,
    });
  });

  it('rejects profile drafts for privileged fields before storing a candidate', async () => {
    aiRegistry.getModule.mockReturnValue({
      allowedCapabilities: ['EXTRACTION'],
      candidateFactTargets: ['User'],
      applyFields: { User: ['name'] },
    });
    platformRegistry.getAll.mockReturnValue([{
      name: 'user', model: 'User', module: 'users',
      fields: { role: { definition: 'userRole' } },
    }]);
    await expect(service.createDraft({
      targetModuleId: 'KK-USER-001',
      targetEntityType: 'User',
      targetEntityId: 'farmer-1',
      targetFieldId: 'role',
      evidenceMessageId: 'user-message-1',
      proposedValue: UserRole.SUPER_ADMIN,
    }, { userId: 'farmer-1', role: UserRole.FARMER }, 'conversation-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(conversations.createFactCandidate).not.toHaveBeenCalled();
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

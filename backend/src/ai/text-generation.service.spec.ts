import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { TextGenerationService } from './text-generation.service';

describe('TextGenerationService', () => {
  const provider = {
    providerId: 'KK-AI-TEXT-GENERATION-LOCAL-UNAVAILABLE',
    modelId: 'NONE',
    modelVersion: 'NONE',
    mode: 'DISABLED',
    generate: jest.fn(),
  };

  const registry = {
    getConversationModuleId: jest.fn().mockReturnValue('KK-AI-CONVERSATION-001'),
    getProvenanceRequirements: jest.fn().mockReturnValue([
      'providerId', 'modelId', 'modelVersion', 'mode',
      'language', 'source', 'generatedAt',
    ]),
    assertModuleRegistered: jest.fn(),
    assertCapabilityAllowed: jest.fn(),
    getControlPlaneOverview: jest.fn(),
  };

  let service: TextGenerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    provider.mode = 'DISABLED';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: {
        providers: {
          providers: [{
            providerId: provider.providerId,
            capability: 'CONVERSATION',
            status: 'DISABLED_RUNTIME_NOT_INSTALLED',
            cloudFallbackAllowed: false,
          }],
        },
      },
      providerRules: { cloudFallback: false },
    });
    service = new TextGenerationService(provider as never, registry as never);
  });

  it('reports the provider disabled when the registry does not approve it', () => {
    expect(service.getStatus()).toMatchObject({
      enabled: false,
      ready: false,
      status: 'DISABLED_RUNTIME_NOT_INSTALLED',
      cloudFallback: false,
      databaseWriteAllowed: false,
    });
  });

  it('fails closed without invoking the provider', async () => {
    await expect(service.generate({
      content: 'How do I manage my crop?',
      conversationId: 'conversation-1',
      requestedBy: 'user-1',
    })).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(provider.generate).not.toHaveBeenCalled();
    expect(registry.assertCapabilityAllowed).not.toHaveBeenCalled();
  });

  it('allows explicitly opted-in local evaluation without claiming production readiness', () => {
    const originalOptIn = process.env.KK_AI_ALLOW_LOCAL_EVALUATION;
    const originalProviderId = provider.providerId;
    try {
      process.env.KK_AI_ALLOW_LOCAL_EVALUATION = 'true';
      provider.providerId = 'KK-AI-LLM-OLLAMA-LOCAL';
      provider.mode = 'LOCAL';
      registry.getControlPlaneOverview.mockReturnValue({
        inventories: { providers: { providers: [{
          providerId: provider.providerId,
          capability: 'CONVERSATION',
          status: 'EVALUATION_IN_PROGRESS',
          productionReady: false,
          evaluationOnly: true,
          cloudFallbackAllowed: false,
        }] } },
        providerRules: { cloudFallback: false },
      });
      expect(service.getStatus()).toMatchObject({
        enabled: true,
        ready: true,
        productionReady: false,
        evaluationOnly: true,
        cloudFallback: false,
        databaseWriteAllowed: false,
      });
    } finally {
      if (originalOptIn === undefined) delete process.env.KK_AI_ALLOW_LOCAL_EVALUATION;
      else process.env.KK_AI_ALLOW_LOCAL_EVALUATION = originalOptIn;
      provider.providerId = originalProviderId;
    }
  });

  it('does not report generation available when an authorized local provider has no reachable model', async () => {
    const originalOptIn = process.env.KK_AI_ALLOW_LOCAL_EVALUATION;
    const originalProviderId = provider.providerId;
    const originalMode = provider.mode;
    const originalHealth = (provider as any).checkHealth;
    try {
      process.env.KK_AI_ALLOW_LOCAL_EVALUATION = 'true';
      provider.providerId = 'KK-AI-LLM-OLLAMA-LOCAL';
      provider.mode = 'LOCAL';
      (provider as any).checkHealth = jest.fn().mockResolvedValue({
        reachable: false,
        modelInstalled: false,
        providerId: provider.providerId,
        modelId: provider.modelId,
        modelVersion: provider.modelVersion,
        mode: 'LOCAL',
        checkedAt: '2026-10-15T00:00:00.000Z',
        error: 'RUNTIME_UNREACHABLE',
      });
      registry.getControlPlaneOverview.mockReturnValue({
        inventories: { providers: { providers: [{
          providerId: provider.providerId,
          capability: 'CONVERSATION',
          status: 'EVALUATION_IN_PROGRESS',
          productionReady: false,
          evaluationOnly: true,
          cloudFallbackAllowed: false,
        }] } },
        providerRules: { cloudFallback: false },
      });
      service = new TextGenerationService(provider as never, registry as never);

      await expect(service.getDetailedStatus()).resolves.toMatchObject({
        ready: true,
        canGenerate: false,
        runtime: { reachable: false, modelInstalled: false },
      });
    } finally {
      if (originalOptIn === undefined) delete process.env.KK_AI_ALLOW_LOCAL_EVALUATION;
      else process.env.KK_AI_ALLOW_LOCAL_EVALUATION = originalOptIn;
      provider.providerId = originalProviderId;
      provider.mode = originalMode;
      if (originalHealth === undefined) delete (provider as any).checkHealth;
      else (provider as any).checkHealth = originalHealth;
    }
  });

  it('passes the authorized context envelope unchanged to an approved provider', async () => {
    provider.mode = 'LOCAL';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [{
        providerId: provider.providerId, capability: 'CONVERSATION',
        status: 'PRODUCTION_READY', productionReady: true, cloudFallbackAllowed: false,
      }] } },
      providerRules: { cloudFallback: false },
    });
    const context = {
      policy: { registryId: 'KK-AI-REGISTRY-001', authorizationBeforeContext: true, databaseWriteAllowed: false, userConfirmationRequired: true },
      actor: { userId: 'user-1' },
      module: { moduleId: 'KK-AI-CONVERSATION-001', capability: 'CONVERSATION' },
      references: { userId: 'user-1', moduleId: 'KK-AI-CONVERSATION-001' },
      fields: { conversation: { id: 'conversation-1' }, messages: [] },
    };
    const request = { content: 'Hello', conversationId: 'conversation-1', requestedBy: 'user-1', context };
    const generated = { content: 'Hello back', providerId: provider.providerId, modelId: 'local-model', modelVersion: '1', mode: 'LOCAL', generatedAt: '2026-10-13T00:00:00.000Z', requiresValidation: true, requiresUserConfirmation: true };
    provider.generate.mockResolvedValue(generated);

    await expect(service.generate(request)).resolves.toEqual(generated);
    expect(provider.generate).toHaveBeenCalledWith(request);
    expect(registry.assertCapabilityAllowed).toHaveBeenCalledWith('KK-AI-CONVERSATION-001', 'CONVERSATION');
  });

  it('queues concurrent local generations instead of returning avoidable 429 responses', async () => {
    provider.mode = 'LOCAL';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [{
        providerId: provider.providerId, capability: 'CONVERSATION',
        status: 'PRODUCTION_READY', productionReady: true, cloudFallbackAllowed: false,
      }] } },
      providerRules: { cloudFallback: false },
    });
    let finishFirst!: (value: { content: string; providerId: string; modelId: string; modelVersion: string; mode: 'LOCAL'; generatedAt: string; requiresValidation: boolean; requiresUserConfirmation: boolean }) => void;
    const firstResult = { content: 'First answer', providerId: provider.providerId, modelId: 'local-model', modelVersion: '1', mode: 'LOCAL' as const, generatedAt: '2026-10-15T00:00:00.000Z', requiresValidation: true, requiresUserConfirmation: true };
    const secondResult = { ...firstResult, content: 'Second answer' };
    provider.generate
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockResolvedValueOnce(secondResult);

    const first = service.generate({ content: 'First request', conversationId: 'conversation-1', requestedBy: 'user-1' });
    const second = service.generate({ content: 'Second request', conversationId: 'conversation-2', requestedBy: 'user-2' });
    await Promise.resolve();
    expect(provider.generate).toHaveBeenCalledTimes(1);

    finishFirst(firstResult);
    await expect(first).resolves.toEqual(firstResult);
    await expect(second).resolves.toEqual(secondResult);
    expect(provider.generate).toHaveBeenCalledTimes(2);
  });

  it('routes to a task-specialized provider only when the canonical inventory authorizes it', async () => {
    const originalOptIn = process.env.KK_AI_ALLOW_LOCAL_EVALUATION;
    const specialist = {
      providerId: 'KK-AI-LOCAL-REASONER',
      modelId: 'reasoner-small',
      modelVersion: '1',
      mode: 'LOCAL',
      supportsTask: (task: string) => task === 'ADVANCED_REASONING',
      taskPriority: () => 10,
      generate: jest.fn().mockResolvedValue({
        content: 'Specialized answer',
        providerId: 'KK-AI-LOCAL-REASONER',
        modelId: 'reasoner-small',
        modelVersion: '1',
        mode: 'LOCAL',
        generatedAt: '2026-10-14T00:00:00.000Z',
        requiresValidation: true,
        requiresUserConfirmation: true,
      }),
    };
    try {
      process.env.KK_AI_ALLOW_LOCAL_EVALUATION = 'false';
      provider.mode = 'LOCAL';
      registry.getControlPlaneOverview.mockReturnValue({
        inventories: { providers: { providers: [
          { providerId: provider.providerId, capability: 'CONVERSATION', status: 'PRODUCTION_READY', productionReady: true, cloudFallbackAllowed: false },
          { providerId: specialist.providerId, capability: 'CONVERSATION', status: 'PRODUCTION_READY', productionReady: true, cloudFallbackAllowed: false },
        ] } },
        providerRules: { cloudFallback: false },
      });
      service = new TextGenerationService(provider as never, registry as never, [provider as never, specialist as never]);
      await expect(service.generate({
        content: 'Compare two possible approaches',
        conversationId: 'conversation-1',
        requestedBy: 'user-1',
        task: 'ADVANCED_REASONING',
      })).resolves.toMatchObject({ content: 'Specialized answer', providerId: specialist.providerId });
      expect(specialist.generate).toHaveBeenCalledTimes(1);
      expect(provider.generate).not.toHaveBeenCalled();
    } finally {
      if (originalOptIn === undefined) delete process.env.KK_AI_ALLOW_LOCAL_EVALUATION;
      else process.env.KK_AI_ALLOW_LOCAL_EVALUATION = originalOptIn;
    }
  });

  it('does not treat provider-level approval as approval for a different model ID', async () => {
    const originalModelId = provider.modelId;
    try {
      provider.mode = 'LOCAL';
      provider.modelId = 'unapproved-model';
      registry.getControlPlaneOverview.mockReturnValue({
        inventories: { providers: { providers: [{
          providerId: provider.providerId,
          modelId: 'approved-model',
          capability: 'CONVERSATION',
          status: 'PRODUCTION_READY',
          productionReady: true,
          cloudFallbackAllowed: false,
        }] } },
        providerRules: { cloudFallback: false },
      });
      service = new TextGenerationService(provider as never, registry as never, [provider as never]);
      await expect(service.generate({
        content: 'Analyze this request',
        conversationId: 'conversation-1',
        requestedBy: 'user-1',
        task: 'ADVANCED_REASONING',
      })).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(provider.generate).not.toHaveBeenCalled();
    } finally {
      provider.modelId = originalModelId;
    }
  });

  it('fails over only to another canonically approved local provider', async () => {
    const specialist = {
      providerId: 'KK-AI-LOCAL-REASONER',
      modelId: 'reasoner-small',
      modelVersion: '1',
      mode: 'LOCAL',
      supportsTask: () => true,
      taskPriority: () => 10,
      generate: jest.fn().mockRejectedValue(new ServiceUnavailableException('local runtime unavailable')),
    };
    provider.mode = 'LOCAL';
    provider.generate.mockResolvedValue({
      content: 'Approved backup answer', providerId: provider.providerId, modelId: provider.modelId,
      modelVersion: provider.modelVersion, mode: 'LOCAL', generatedAt: '2026-10-14T00:00:00.000Z',
      requiresValidation: true, requiresUserConfirmation: true,
    });
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [
        { providerId: provider.providerId, capability: 'CONVERSATION', status: 'PRODUCTION_READY', productionReady: true, cloudFallbackAllowed: false },
        { providerId: specialist.providerId, capability: 'CONVERSATION', status: 'PRODUCTION_READY', productionReady: true, cloudFallbackAllowed: false },
      ] } },
      providerRules: { cloudFallback: false },
    });
    service = new TextGenerationService(provider as never, registry as never, [specialist as never, provider as never]);
    await expect(service.generate({
      content: 'Compare two crop plans', conversationId: 'conversation-1',
      requestedBy: 'user-1', task: 'ADVANCED_REASONING',
    })).resolves.toMatchObject({ content: 'Approved backup answer', providerId: provider.providerId });
    expect(specialist.generate).toHaveBeenCalledTimes(1);
    expect(provider.generate).toHaveBeenCalledTimes(1);
  });

  it('does not route to a higher-priority provider that is absent from the canonical inventory', async () => {
    const specialist = {
      providerId: 'KK-AI-UNREGISTERED-REASONER',
      modelId: 'unregistered',
      modelVersion: '1',
      mode: 'LOCAL',
      supportsTask: () => true,
      taskPriority: () => 999,
      generate: jest.fn(),
    };
    provider.mode = 'LOCAL';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [
        { providerId: provider.providerId, capability: 'CONVERSATION', status: 'PRODUCTION_READY', productionReady: true, cloudFallbackAllowed: false },
      ] } },
      providerRules: { cloudFallback: false },
    });
    provider.generate.mockResolvedValue({
      content: 'Approved answer', providerId: provider.providerId, modelId: provider.modelId,
      modelVersion: provider.modelVersion, mode: 'LOCAL', generatedAt: '2026-10-14T00:00:00.000Z',
      requiresValidation: true, requiresUserConfirmation: true,
    });
    service = new TextGenerationService(provider as never, registry as never, [specialist as never, provider as never]);
    await expect(service.generate({
      content: 'Explain a farm workflow', conversationId: 'conversation-1',
      requestedBy: 'user-1', task: 'ADVANCED_REASONING',
    })).resolves.toMatchObject({ content: 'Approved answer', providerId: provider.providerId });
    expect(specialist.generate).not.toHaveBeenCalled();
    expect(provider.generate).toHaveBeenCalledTimes(1);
  });

  it('fails closed if the provider is absent from the canonical inventory', async () => {
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [] } },
      providerRules: { cloudFallback: false },
    });

    await expect(service.generate({
      content: 'Hello',
      conversationId: 'conversation-1',
      requestedBy: 'user-1',
    })).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(provider.generate).not.toHaveBeenCalled();
  });
});

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

  it('rejects concurrent local generation with a typed busy response', async () => {
    provider.mode = 'LOCAL';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [{
        providerId: provider.providerId, capability: 'CONVERSATION',
        status: 'PRODUCTION_READY', productionReady: true, cloudFallbackAllowed: false,
      }] } },
      providerRules: { cloudFallback: false },
    });
    provider.generate.mockImplementation(() => new Promise(() => undefined));

    void service.generate({ content: 'First request', conversationId: 'conversation-1', requestedBy: 'user-1' });
    await expect(service.generate({
      content: 'Second request', conversationId: 'conversation-2', requestedBy: 'user-2',
    })).rejects.toMatchObject({ status: 429 });
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

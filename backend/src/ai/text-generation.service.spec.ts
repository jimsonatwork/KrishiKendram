import { ServiceUnavailableException } from '@nestjs/common';
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

  const originalNodeEnv = process.env.NODE_ENV;
  let service: TextGenerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.KK_AI_ALLOW_LOCAL_EVALUATION;
    process.env.NODE_ENV = 'test';
    provider.mode = 'DISABLED';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: {
        providers: {
          providers: [{
            providerId: provider.providerId,
            capability: 'CONVERSATION',
            status: 'DISABLED_RUNTIME_NOT_INSTALLED',
            cloudFallbackAllowed: false,
            productionReady: false,
            evaluationOnly: false,
          }],
        },
      },
      providerRules: { cloudFallback: false },
    });
    service = new TextGenerationService(provider as never, registry as never);
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    delete process.env.KK_AI_ALLOW_LOCAL_EVALUATION;
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

  it('allows explicitly opted-in local evaluation only outside production', async () => {
    provider.mode = 'LOCAL';
    process.env.KK_AI_ALLOW_LOCAL_EVALUATION = 'true';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [{
        providerId: provider.providerId,
        capability: 'CONVERSATION',
        status: 'EVALUATION_IN_PROGRESS',
        cloudFallbackAllowed: false,
        productionReady: false,
        evaluationOnly: true,
      }] } },
      providerRules: { cloudFallback: false },
    });
    const generated = {
      content: 'What is your farm name?',
      providerId: provider.providerId,
      modelId: 'qwen3:1.7b',
      modelVersion: 'sha256:model-digest',
      mode: 'LOCAL',
      generatedAt: '2026-10-13T00:00:00.000Z',
      requiresValidation: true,
      requiresUserConfirmation: true,
    };
    provider.generate.mockResolvedValue(generated);

    await expect(service.generate({
      content: 'Help me record my farm name.',
      conversationId: 'conversation-1',
      requestedBy: 'user-1',
    })).resolves.toEqual(generated);
    expect(service.getStatus()).toMatchObject({
      ready: true,
      productionReady: false,
      evaluationOnly: true,
      cloudFallback: false,
      databaseWriteAllowed: false,
    });
    expect(registry.assertCapabilityAllowed).toHaveBeenCalledWith(
      'KK-AI-CONVERSATION-001',
      'CONVERSATION',
    );
  });

  it('never enables local evaluation in production even when opted in', () => {
    provider.mode = 'LOCAL';
    process.env.NODE_ENV = 'production';
    process.env.KK_AI_ALLOW_LOCAL_EVALUATION = 'true';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [{
        providerId: provider.providerId,
        capability: 'CONVERSATION',
        status: 'EVALUATION_IN_PROGRESS',
        cloudFallbackAllowed: false,
        productionReady: false,
        evaluationOnly: true,
      }] } },
      providerRules: { cloudFallback: false },
    });

    expect(service.getStatus()).toMatchObject({
      ready: false,
      productionReady: false,
      evaluationOnly: false,
    });
  });

  it('passes the authorized context envelope unchanged to a production-approved provider', async () => {
    provider.mode = 'LOCAL';
    registry.getControlPlaneOverview.mockReturnValue({
      inventories: { providers: { providers: [{
        providerId: provider.providerId,
        capability: 'CONVERSATION',
        status: 'PRODUCTION_READY',
        productionReady: true,
        cloudFallbackAllowed: false,
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

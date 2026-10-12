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

  let service: TextGenerationService;

  beforeEach(() => {
    jest.clearAllMocks();
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

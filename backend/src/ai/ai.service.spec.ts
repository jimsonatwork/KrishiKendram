import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';
import type { AsrProvider, AsrRequest, AsrResult } from './contracts/asr-provider';
import type { AiRegistryService } from './registry/ai-registry.service';

describe('AiService', () => {
  const provider: jest.Mocked<AsrProvider> = {
    providerId: 'KK-AI-ASR-INDIC-CONFORMER',
    modelId: 'indic-conformer-test',
    modelVersion: 'test',
    mode: 'LOCAL',
    supports: jest.fn((language: string) => language === 'te'),
    transcribe: jest.fn(async (_request: AsrRequest) => ({
      text: 'test',
      language: 'te',
      providerId: 'KK-AI-ASR-INDIC-CONFORMER',
      modelId: 'indic-conformer-test',
      modelVersion: 'test',
      mode: 'LOCAL',
      durationMs: 1,
      provenance: { source: 'VOICE', audioPath: '/tmp/test.wav', generatedAt: new Date(0).toISOString() },
      requiresValidation: true,
      requiresUserConfirmation: true,
    }) as AsrResult),
  };

  const registryWithStatus = (status: string) => ({
    getControlPlaneOverview: jest.fn(() => ({
      inventories: {
        providers: {
          providers: [{
            providerId: 'KK-AI-ASR-INDIC-CONFORMER',
            capability: 'SPEECH_TO_TEXT',
            status,
            executionMode: 'LOCAL',
            cloudFallbackAllowed: false,
          }],
        },
      },
    })),
  }) as unknown as AiRegistryService;

  beforeEach(() => jest.clearAllMocks());

  it('reports placeholder providers as registered but disabled', () => {
    const service = new AiService(provider, registryWithStatus('PLACEHOLDER_NOT_PRODUCTION_READY'));
    expect(service.getStatus()).toMatchObject({
      enabled: false,
      ready: false,
      status: 'PLACEHOLDER_NOT_PRODUCTION_READY',
      cloudFallback: false,
      databaseWriteAllowed: false,
    });
  });

  it('fails closed when the canonical provider inventory is not production-ready', async () => {
    const service = new AiService(provider, registryWithStatus('PLACEHOLDER_NOT_PRODUCTION_READY'));
    await expect(service.transcribe({ audioPath: '/tmp/test.wav', language: 'te' }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(provider.transcribe).not.toHaveBeenCalled();
  });

  it('fails closed when the provider is absent from the canonical inventory', async () => {
    const service = new AiService(provider, {
      getControlPlaneOverview: jest.fn(() => ({ inventories: { providers: { providers: [] } } })),
    } as unknown as AiRegistryService);
    expect(service.getStatus().status).toBe('NOT_REGISTERED');
    await expect(service.transcribe({ audioPath: '/tmp/test.wav', language: 'te' }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects unsupported languages before provider execution', async () => {
    const service = new AiService(provider, registryWithStatus('PRODUCTION_READY'));
    await expect(service.transcribe({ audioPath: '/tmp/test.wav', language: 'xx' }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(provider.transcribe).not.toHaveBeenCalled();
  });
});

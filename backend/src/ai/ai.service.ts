import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ASR_PROVIDER } from './contracts/asr-provider';
import type { AsrProvider, AsrRequest, AsrResult } from './contracts/asr-provider';
import { AiRegistryService } from './registry/ai-registry.service';

interface RegisteredProvider {
  providerId?: string;
  capability?: string;
  status?: string;
  executionMode?: string;
  cloudFallbackAllowed?: boolean;
}

@Injectable()
export class AiService {
  constructor(
    @Inject(ASR_PROVIDER) private readonly asrProvider: AsrProvider,
    private readonly registry: AiRegistryService,
  ) {}

  private getRegisteredProvider(): RegisteredProvider | undefined {
    const overview = this.registry.getControlPlaneOverview() as {
      inventories?: { providers?: { providers?: RegisteredProvider[] } };
    };
    return overview.inventories?.providers?.providers?.find(
      (provider) => provider.providerId === this.asrProvider.providerId
        && provider.capability === 'SPEECH_TO_TEXT',
    );
  }

  getStatus() {
    const registered = this.getRegisteredProvider();
    const productionReady = registered?.status === 'PRODUCTION_READY';
    return {
      enabled: productionReady,
      ready: productionReady,
      status: registered?.status ?? 'NOT_REGISTERED',
      mode: this.asrProvider.mode,
      asrProvider: this.asrProvider.providerId,
      model: this.asrProvider.modelId,
      modelVersion: this.asrProvider.modelVersion,
      databaseWriteAllowed: false,
      registryValidationRequired: true,
      userConfirmationRequired: true,
      cloudFallback: false,
    };
  }

  async transcribe(request: AsrRequest): Promise<AsrResult> {
    const status = this.getStatus();
    if (!status.enabled) {
      throw new ServiceUnavailableException(
        'The canonical AI provider inventory does not mark this speech provider as production-ready.',
      );
    }
    if (!this.asrProvider.supports(request.language)) {
      throw new ServiceUnavailableException(`Unsupported ASR language: ${request.language}`);
    }

    return this.asrProvider.transcribe(request);
  }
}

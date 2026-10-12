import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  type TextGenerationProvider,
  type TextGenerationRequest,
  type TextGenerationResult,
} from './contracts/text-generation-provider';
import { AiRegistryService } from './registry/ai-registry.service';

@Injectable()
export class TextGenerationService {
  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly provider: TextGenerationProvider,
    private readonly registry: AiRegistryService,
  ) {}

  getStatus() {
    const overview = this.registry.getControlPlaneOverview() as {
      inventories?: { providers?: { providers?: Array<{
        providerId?: string;
        capability?: string;
        status?: string;
        cloudFallbackAllowed?: boolean;
      }> } };
      providerRules?: { cloudFallback?: boolean };
    };

    const registered = overview.inventories?.providers?.providers?.find(
      (item) =>
        item.providerId === this.provider.providerId &&
        item.capability === 'CONVERSATION',
    );

    const ready =
      registered?.status === 'PRODUCTION_READY' &&
      registered.cloudFallbackAllowed === false &&
      overview.providerRules?.cloudFallback === false &&
      this.provider.mode !== 'DISABLED';

    return {
      enabled: ready,
      ready,
      providerId: this.provider.providerId,
      status: registered?.status ?? 'NOT_REGISTERED',
      mode: this.provider.mode,
      cloudFallback: false,
      databaseWriteAllowed: false,
      provenanceRequired: this.registry.getProvenanceRequirements(),
    };
  }

  async generate(
    request: TextGenerationRequest,
  ): Promise<TextGenerationResult> {
    const status = this.getStatus();
    if (!status.ready) {
      throw new ServiceUnavailableException(
        'Text generation is unavailable because the canonical registry does not authorize a production-ready provider.',
      );
    }

    this.registry.assertModuleRegistered(
      this.registry.getConversationModuleId(),
    );
    this.registry.assertCapabilityAllowed(
      this.registry.getConversationModuleId(),
      'CONVERSATION',
    );

    return this.provider.generate(request);
  }
}

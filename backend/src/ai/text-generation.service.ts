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
        productionReady?: boolean;
        evaluationOnly?: boolean;
      }> } };
      providerRules?: { cloudFallback?: boolean };
    };

    const registered = overview.inventories?.providers?.providers?.find(
      (item) =>
        item.providerId === this.provider.providerId &&
        item.capability === 'CONVERSATION',
    );

    const productionReady =
      registered?.status === 'PRODUCTION_READY' &&
      registered.productionReady === true &&
      registered.cloudFallbackAllowed === false &&
      overview.providerRules?.cloudFallback === false &&
      this.provider.mode !== 'DISABLED';
    const localEvaluationAllowed =
      registered?.evaluationOnly === true &&
      registered.status === 'EVALUATION_IN_PROGRESS' &&
      registered.cloudFallbackAllowed === false &&
      overview.providerRules?.cloudFallback === false &&
      this.provider.mode === 'LOCAL' &&
      process.env.KK_AI_ALLOW_LOCAL_EVALUATION === 'true' &&
      process.env.NODE_ENV !== 'production';
    const ready = productionReady || localEvaluationAllowed;

    return {
      enabled: ready,
      ready,
      productionReady,
      evaluationOnly: localEvaluationAllowed,
      providerId: this.provider.providerId,
      modelId: this.provider.modelId,
      modelVersion: this.provider.modelVersion,
      status: registered?.status ?? 'NOT_REGISTERED',
      mode: this.provider.mode,
      cloudFallback: false,
      databaseWriteAllowed: false,
      provenanceRequired: this.registry.getProvenanceRequirements(),
    };
  }

  async getDetailedStatus() {
    const status = this.getStatus();
    const checkedAt = new Date().toISOString();
    let runtime;
    if (this.provider.checkHealth) {
      try {
        runtime = await this.provider.checkHealth();
      } catch {
        runtime = {
          reachable: false,
          modelInstalled: false,
          providerId: this.provider.providerId,
          modelId: this.provider.modelId,
          modelVersion: this.provider.modelVersion,
          mode: this.provider.mode,
          checkedAt,
          error: 'HEALTH_CHECK_FAILED',
        };
      }
    } else {
      runtime = {
        reachable: false,
        modelInstalled: false,
        providerId: this.provider.providerId,
        modelId: this.provider.modelId,
        modelVersion: this.provider.modelVersion,
        mode: this.provider.mode,
        checkedAt,
        error: 'HEALTH_CHECK_UNAVAILABLE',
      };
    }
    return {
      ...status,
      modelVersion: runtime.modelVersion || status.modelVersion,
      canGenerate: status.ready,
      runtime,
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

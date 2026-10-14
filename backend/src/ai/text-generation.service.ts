import {
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TEXT_GENERATION_PROVIDERS,
  type TextGenerationProvider,
  type TextGenerationRequest,
  type TextGenerationResult,
  type TextGenerationTask,
} from './contracts/text-generation-provider';
import { AiRegistryService } from './registry/ai-registry.service';

type ProviderInventoryEntry = {
  providerId?: string;
  modelId?: string;
  capability?: string;
  status?: string;
  cloudFallbackAllowed?: boolean;
  productionReady?: boolean;
  evaluationOnly?: boolean;
};
type ProviderOverview = {
  inventories?: { providers?: { providers?: ProviderInventoryEntry[] } };
  providerRules?: { cloudFallback?: boolean };
};

@Injectable()
export class TextGenerationService {
  private readonly logger = new Logger(TextGenerationService.name);
  private generationInFlight = false;

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly provider: TextGenerationProvider,
    private readonly registry: AiRegistryService,
    @Optional() @Inject(TEXT_GENERATION_PROVIDERS)
    private readonly providerPool?: TextGenerationProvider[],
  ) {}

  getStatus(task: TextGenerationTask = 'CONVERSATION') {
    const overview = this.getProviderOverview();
    const selectedProvider = this.getAuthorizedProviders(task, overview)[0] ?? this.provider;
    const registered = overview.inventories?.providers?.providers?.find(
      (item) => item.providerId === selectedProvider.providerId
        && item.capability === 'CONVERSATION'
        && (!item.modelId || item.modelId === selectedProvider.modelId),
    );
    const productionReady =
      registered?.status === 'PRODUCTION_READY'
      && registered.productionReady === true
      && registered.cloudFallbackAllowed === false
      && overview.providerRules?.cloudFallback === false
      && selectedProvider.mode !== 'DISABLED';
    const localEvaluationAllowed =
      registered?.evaluationOnly === true
      && registered.status === 'EVALUATION_IN_PROGRESS'
      && registered.cloudFallbackAllowed === false
      && overview.providerRules?.cloudFallback === false
      && selectedProvider.mode === 'LOCAL'
      && process.env.KK_AI_ALLOW_LOCAL_EVALUATION === 'true'
      && process.env.NODE_ENV !== 'production';
    const ready = productionReady || localEvaluationAllowed;

    return {
      enabled: ready,
      ready,
      productionReady,
      evaluationOnly: localEvaluationAllowed,
      providerId: selectedProvider.providerId,
      modelId: selectedProvider.modelId,
      modelVersion: selectedProvider.modelVersion,
      status: registered?.status ?? 'NOT_REGISTERED',
      mode: selectedProvider.mode,
      cloudFallback: false,
      databaseWriteAllowed: false,
      provenanceRequired: this.registry.getProvenanceRequirements(),
    };
  }

  async getDetailedStatus() {
    const status = this.getStatus();
    const activeProvider = this.getCandidateProviders().find(
      (candidate) => candidate.providerId === status.providerId && candidate.modelId === status.modelId,
    ) ?? this.provider;
    const checkedAt = new Date().toISOString();
    let runtime;
    if (activeProvider.checkHealth) {
      try {
        runtime = await activeProvider.checkHealth();
      } catch {
        runtime = {
          reachable: false,
          modelInstalled: false,
          providerId: activeProvider.providerId,
          modelId: activeProvider.modelId,
          modelVersion: activeProvider.modelVersion,
          mode: activeProvider.mode,
          checkedAt,
          error: 'HEALTH_CHECK_FAILED',
        };
      }
    } else {
      runtime = {
        reachable: false,
        modelInstalled: false,
        providerId: activeProvider.providerId,
        modelId: activeProvider.modelId,
        modelVersion: activeProvider.modelVersion,
        mode: activeProvider.mode,
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


  private getProviderOverview(): ProviderOverview {
    return this.registry.getControlPlaneOverview() as ProviderOverview;
  }

  private getCandidateProviders(): TextGenerationProvider[] {
    return [...new Set([...(this.providerPool ?? []), this.provider])];
  }

  private getAuthorizedProviders(
    task: TextGenerationTask,
    overview: ProviderOverview,
  ): TextGenerationProvider[] {
    return this.getCandidateProviders()
      .filter((candidate) => !candidate.supportsTask || candidate.supportsTask(task))
      .filter((candidate) => this.isProviderAuthorizedForTask(candidate, overview))
      .sort((left, right) =>
        (right.taskPriority?.(task) ?? 0) - (left.taskPriority?.(task) ?? 0),
      );
  }

  private isProviderAuthorizedForTask(
    provider: TextGenerationProvider,
    overview: ProviderOverview,
  ): boolean {
    // Cloud providers are intentionally excluded until the canonical policy,
    // God Mode authorization, consent and provider-specific controls explicitly
    // approve a future implementation. A model's priority is never authority.
    if (provider.mode !== 'LOCAL') return false;
    const registered = overview.inventories?.providers?.providers?.find(
      (item) => item.providerId === provider.providerId
        && item.capability === 'CONVERSATION'
        && (!item.modelId || item.modelId === provider.modelId),
    );
    const productionReady =
      registered?.status === 'PRODUCTION_READY'
      && registered.productionReady === true
      && registered.cloudFallbackAllowed === false
      && overview.providerRules?.cloudFallback === false;
    const localEvaluationAllowed =
      registered?.evaluationOnly === true
      && registered.status === 'EVALUATION_IN_PROGRESS'
      && registered.cloudFallbackAllowed === false
      && overview.providerRules?.cloudFallback === false
      && provider.mode === 'LOCAL'
      && process.env.KK_AI_ALLOW_LOCAL_EVALUATION === 'true'
      && process.env.NODE_ENV !== 'production';
    return productionReady || localEvaluationAllowed;
  }

  async generate(
    request: TextGenerationRequest,
  ): Promise<TextGenerationResult> {
    const overview = this.getProviderOverview();
    const task: TextGenerationTask = request.task ?? 'CONVERSATION';
    const candidates = this.getAuthorizedProviders(task, overview);
    if (candidates.length === 0) {
      throw new ServiceUnavailableException(
        'Text generation is unavailable because no local provider is authorized for this task by the canonical registry. No cloud fallback was attempted.',
      );
    }

    this.registry.assertModuleRegistered(
      this.registry.getConversationModuleId(),
    );
    this.registry.assertCapabilityAllowed(
      this.registry.getConversationModuleId(),
      'CONVERSATION',
    );

    // This host is intentionally CPU/memory constrained. A single local model
    // generation at a time prevents concurrent requests from saturating Ollama
    // and starving normal backend work. Deterministic intents bypass this service.
    if (this.generationInFlight) {
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'KK_AI_GENERATION_BUSY',
        message: 'The local AI worker is busy. Please retry shortly.',
        retryAfterSeconds: 3,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    this.generationInFlight = true;
    try {
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        try {
          return await candidate.generate(request);
        } catch (error) {
          // Fail over only between candidates that passed the same canonical
          // local-provider authorization gate. Never use cloud in this path.
          if (!(error instanceof ServiceUnavailableException) || index === candidates.length - 1) {
            throw error;
          }
          this.logger.warn(JSON.stringify({
            event: 'ai_local_provider_failover',
            task,
            failedProviderId: candidate.providerId,
            nextProviderId: candidates[index + 1].providerId,
            reason: 'SERVICE_UNAVAILABLE',
          }));
        }
      }
      throw new ServiceUnavailableException('No authorized local provider completed the request.');
    } finally {
      this.generationInFlight = false;
    }
  }
}

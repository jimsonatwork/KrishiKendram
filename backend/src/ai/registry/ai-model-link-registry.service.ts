import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AiRegistryService } from './ai-registry.service';

type RegisteredModel = { modelId: string; displayName: string; providerId: string; runtime: 'OLLAMA_LOCAL'; linked: boolean; role: string; source: string; productionReady: boolean };
type ModelLinkDocument = { registryId: string; inventoryId: string; version: number; status: string; activeModelId: string; evaluationModelId?: string | null; runtime: 'OLLAMA_LOCAL'; cloudFallbackAllowed: false; models: RegisteredModel[]; rules: Record<string, boolean> };
type OllamaTags = { models?: Array<{ name?: string; digest?: string; size?: number }> };

@Injectable()
export class AiModelLinkRegistryService {
  private readonly registryPath: string;
  private readonly baseUrl: string;

  constructor(private readonly registry: AiRegistryService) {
    this.registryPath = registry.getLinkedFilePath('modelLinkRegistry');
    const configured = process.env.KK_AI_OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434';
    let parsed: URL;
    try { parsed = new URL(configured); } catch { throw new Error('Invalid local Ollama URL for model registry.'); }
    if (parsed.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]', 'host.docker.internal'].includes(parsed.hostname) || parsed.username || parsed.password) {
      throw new Error('Model registry permits local Ollama endpoints only; cloud endpoints are prohibited.');
    }
    this.baseUrl = parsed.toString().replace(/\/$/, '');
    this.readDocument();
  }

  getActiveModelId(): string { return this.readDocument().activeModelId; }

  async getStatus() {
    const document = this.readDocument();
    const installed = await this.getInstalledModels();
    return {
      registryId: document.registryId,
      inventoryId: document.inventoryId,
      version: document.version,
      runtime: document.runtime,
      activeModelId: document.activeModelId,
      evaluationModelId: document.evaluationModelId ?? null,
      cloudFallbackAllowed: false,
      moduleContractsMutableByModelLink: false,
      runtimeReachable: installed.reachable,
      models: document.models.map((model) => ({
        ...model,
        installed: installed.models.some((item) => item.name === model.modelId || item.name?.startsWith(model.modelId + ':')),
        installedSizeBytes: installed.models.find((item) => item.name === model.modelId || item.name?.startsWith(model.modelId + ':'))?.size,
        active: model.modelId === document.activeModelId,
      })),
      rules: document.rules,
    };
  }

  link(modelId: string) {
    return this.mutate(modelId, (document, model) => {
      if (model.linked) throw new ConflictException('Model is already linked to KrishiKendram.');
      model.linked = true;
      model.role = 'LINKED_CANDIDATE';
      document.version += 1;
    });
  }

  unlink(modelId: string) {
    return this.mutate(modelId, (document, model) => {
      if (!model.linked) throw new ConflictException('Model is already unlinked.');
      if (document.activeModelId === modelId) throw new ConflictException('Activate another linked and installed model before unlinking the active model.');
      model.linked = false;
      model.role = 'EVALUATION_CANDIDATE';
      if (document.evaluationModelId === modelId) document.evaluationModelId = null;
      document.version += 1;
    });
  }

  async activate(modelId: string) {
    const document = this.readDocument();
    const model = document.models.find((item) => item.modelId === modelId);
    if (!model) throw new BadRequestException('Model is not in the centrally approved model catalogue.');
    if (!model.linked) throw new ConflictException('Link this model before activating it.');
    if (model.productionReady !== true) throw new ConflictException('This model is evaluation-only. Select it for benchmarking and obtain production approval before switching the live AI model.');
    const installed = await this.getInstalledModels();
    if (!installed.reachable) throw new ServiceUnavailableException('Local Ollama is unavailable. Model activation was not changed.');
    if (!installed.models.some((item) => item.name === modelId || item.name?.startsWith(modelId + ':'))) {
      throw new ConflictException('Model is not installed locally. Install and evaluate it before activation. No cloud fallback was attempted.');
    }
    if (document.activeModelId !== modelId) {
      document.activeModelId = modelId;
      if (document.evaluationModelId === modelId) document.evaluationModelId = null;
      document.models.forEach((item) => { if (item.linked) item.role = item.modelId === modelId ? 'ACTIVE_BASELINE' : 'LINKED_CANDIDATE'; });
      document.version += 1;
      this.writeDocument(document);
    }
    return { registryId: document.registryId, version: document.version, activeModelId: document.activeModelId, changed: true };
  }

  async selectForEvaluation(modelId: string) {
    const document = this.readDocument();
    const model = document.models.find((item) => item.modelId === modelId);
    if (!model) throw new BadRequestException('Model is not in the centrally approved model catalogue.');
    if (!model.linked) throw new ConflictException('Link this model before selecting it for evaluation.');
    if (modelId === document.activeModelId) throw new ConflictException('The live model cannot be selected as its own evaluation candidate.');
    if (model.productionReady === true) throw new ConflictException('This model is already production-approved and is not an evaluation-only candidate.');
    const installed = await this.getInstalledModels();
    if (!installed.reachable) throw new ServiceUnavailableException('Local Ollama is unavailable. Evaluation selection was not changed.');
    if (!installed.models.some((item) => item.name === modelId || item.name?.startsWith(modelId + ':'))) {
      throw new ConflictException('Model is not installed locally. No download or live-model change was attempted.');
    }
    if (document.evaluationModelId !== modelId) {
      document.evaluationModelId = modelId;
      document.version += 1;
      this.writeDocument(document);
    }
    return { registryId: document.registryId, version: document.version, activeModelId: document.activeModelId, evaluationModelId: document.evaluationModelId, liveModelChanged: false };
  }

  private mutate(modelId: string, action: (document: ModelLinkDocument, model: RegisteredModel) => void) {
    const document = this.readDocument();
    const model = document.models.find((item) => item.modelId === modelId);
    if (!model) throw new BadRequestException('Model is not in the centrally approved model catalogue.');
    action(document, model);
    this.writeDocument(document);
    return { registryId: document.registryId, version: document.version, activeModelId: document.activeModelId, modelId, linked: model.linked };
  }

  private readDocument(): ModelLinkDocument {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(this.registryPath, 'utf8')) as unknown; }
    catch { throw new ServiceUnavailableException('Canonical AI model-link registry is missing or invalid.'); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ServiceUnavailableException('Canonical AI model-link registry must be an object.');
    const document = raw as ModelLinkDocument;
    if (document.registryId !== this.registry.getRegistryId() || document.inventoryId !== 'KK-AI-MODEL-LINKS-001' || document.status !== 'CANONICAL' || document.runtime !== 'OLLAMA_LOCAL' || document.cloudFallbackAllowed !== false || !Array.isArray(document.models) || !document.models.length || !document.models.some((item) => item.modelId === document.activeModelId && item.linked)) {
      throw new ServiceUnavailableException('Canonical AI model-link registry identity or safety rules are invalid.');
    }
    if (document.evaluationModelId) {
      const evaluationModel = document.models.find((item) => item.modelId === document.evaluationModelId);
      if (!evaluationModel || !evaluationModel.linked || evaluationModel.modelId === document.activeModelId || evaluationModel.productionReady === true) {
        throw new ServiceUnavailableException('Canonical AI evaluation selection is invalid or conflicts with the live model.');
      }
    }
    return document;
  }

  private writeDocument(document: ModelLinkDocument): void {
    const temp = join(dirname(this.registryPath), '.model-link-registry.' + randomUUID() + '.tmp');
    try { writeFileSync(temp, JSON.stringify(document, null, 2) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' }); renameSync(temp, this.registryPath); }
    catch { throw new ServiceUnavailableException('Could not atomically save the central AI model-link registry.'); }
  }

  private async getInstalledModels(): Promise<{ reachable: boolean; models: NonNullable<OllamaTags['models']> }> {
    try {
      const response = await fetch(this.baseUrl + '/api/tags', { signal: AbortSignal.timeout(2500), headers: { accept: 'application/json' } });
      if (!response.ok) return { reachable: false, models: [] };
      const payload = await response.json() as OllamaTags;
      if (!Array.isArray(payload.models)) return { reachable: false, models: [] };
      return { reachable: true, models: payload.models };
    } catch { return { reachable: false, models: [] }; }
  }
}

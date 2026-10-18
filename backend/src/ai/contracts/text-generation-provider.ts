import type { AiRunMode } from './asr-provider';
import type { UserAiContextEnvelope } from './ai-context';

export const TEXT_GENERATION_PROVIDER = Symbol('TEXT_GENERATION_PROVIDER');
export const TEXT_GENERATION_PROVIDERS = Symbol('TEXT_GENERATION_PROVIDERS');

export type TextGenerationTask = 'CONVERSATION' | 'STRUCTURED_EXTRACTION' | 'ADVANCED_REASONING';

export interface TextGenerationRequest {
  content: string;
  language?: string;
  conversationId: string;
  requestedBy: string;
  /** Minimal context already authorized and projected by UserAiContextService. */
  context?: UserAiContextEnvelope;
  /** Task hint for policy-controlled multi-model routing; never grants tool permissions. */
  task?: TextGenerationTask;
  /** Optional per-task output cap, clamped to the selected provider's safe budget. */
  maxOutputTokens?: number;
}

export interface TextGenerationResult {
  content: string;
  providerId: string;
  modelId: string;
  modelVersion: string;
  mode: AiRunMode;
  language?: string;
  generatedAt: string;
  requiresValidation: true;
  requiresUserConfirmation: true;
}

export interface TextGenerationRuntimeHealth {
  reachable: boolean;
  modelInstalled: boolean;
  providerId: string;
  modelId: string;
  modelVersion: string;
  mode: AiRunMode;
  checkedAt: string;
  error?: string;
}

export interface TextGenerationProvider {
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly mode: AiRunMode;
  /** Optional capability declaration for task-aware routing. */
  supportsTask?(task: TextGenerationTask): boolean;
  /** Higher values win only among equally authorized providers. */
  taskPriority?(task: TextGenerationTask): number;
  checkHealth?(): Promise<{
    reachable: boolean;
    modelInstalled: boolean;
    providerId: string;
    modelId: string;
    modelVersion: string;
    mode: AiRunMode;
    checkedAt: string;
    error?: string;
  }>;
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
  checkHealth?(): Promise<TextGenerationRuntimeHealth>;
}

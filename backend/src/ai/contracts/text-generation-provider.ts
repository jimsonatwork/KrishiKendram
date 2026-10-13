import type { AiRunMode } from './asr-provider';
import type { UserAiContextEnvelope } from './ai-context';

export const TEXT_GENERATION_PROVIDER = Symbol('TEXT_GENERATION_PROVIDER');

export interface TextGenerationRequest {
  content: string;
  language?: string;
  conversationId: string;
  requestedBy: string;
  /** Minimal context already authorized and projected by UserAiContextService. */
  context?: UserAiContextEnvelope;
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

export interface TextGenerationProvider {
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly mode: AiRunMode;
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

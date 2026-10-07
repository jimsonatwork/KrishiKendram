export const ASR_PROVIDER = Symbol('ASR_PROVIDER');

export type AiRunMode = 'LOCAL' | 'CLOUD' | 'HYBRID' | 'DISABLED';

export interface AsrRequest {
  audioPath: string;
  language: string;
  sampleRateHz?: number;
  sessionId?: string;
  requestedBy?: string;
}

export interface AsrResult {
  text: string;
  language: string;
  providerId: string;
  modelId: string;
  modelVersion: string;
  mode: AiRunMode;
  confidence?: number;
  durationMs: number;
  provenance: {
    source: 'VOICE';
    audioPath: string;
    sampleRateHz?: number;
    sessionId?: string;
    requestedBy?: string;
    generatedAt: string;
  };
  requiresValidation: true;
  requiresUserConfirmation: true;
}

export interface AsrProvider {
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly mode: AiRunMode;
  supports(language: string): boolean;
  transcribe(request: AsrRequest): Promise<AsrResult>;
}

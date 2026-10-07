import { Inject, Injectable } from '@nestjs/common';
import { ASR_PROVIDER } from './contracts/asr-provider';
import type { AsrProvider, AsrRequest, AsrResult } from './contracts/asr-provider';

@Injectable()
export class AiService {
  constructor(@Inject(ASR_PROVIDER) private readonly asrProvider: AsrProvider) {}

  getStatus() {
    return {
      enabled: true,
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
    if (!this.asrProvider.supports(request.language)) {
      throw new Error(`Unsupported ASR language: ${request.language}`);
    }

    return this.asrProvider.transcribe(request);
  }
}

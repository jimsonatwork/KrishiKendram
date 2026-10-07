import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AsrProvider, AsrRequest, AsrResult } from '../contracts/asr-provider';

@Injectable()
export class IndicConformerProvider implements AsrProvider {
  readonly providerId = 'KK-AI-ASR-INDIC-CONFORMER';
  readonly modelId = 'ai4bharat/indic-conformer-600m-multilingual';
  readonly modelVersion = 'local-600m-multi';
  readonly mode = 'LOCAL' as const;

  private readonly languages = new Set([
    'as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'kok', 'ks', 'mai', 'ml',
    'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur',
  ]);

  supports(language: string): boolean {
    return this.languages.has(language.toLowerCase());
  }

  async transcribe(_request: AsrRequest): Promise<AsrResult> {
    throw new ServiceUnavailableException(
      'IndicConformer provider is registered but its local inference bridge is not enabled yet.',
    );
  }
}

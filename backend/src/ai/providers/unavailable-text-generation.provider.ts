import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  TextGenerationProvider,
  TextGenerationRequest,
  TextGenerationResult,
} from '../contracts/text-generation-provider';

@Injectable()
export class UnavailableTextGenerationProvider implements TextGenerationProvider {
  readonly providerId = 'KK-AI-TEXT-GENERATION-LOCAL-UNAVAILABLE';
  readonly modelId = 'NONE';
  readonly modelVersion = 'NONE';
  readonly mode = 'DISABLED' as const;

  async generate(
    _request: TextGenerationRequest,
  ): Promise<TextGenerationResult> {
    throw new ServiceUnavailableException(
      'Text generation is disabled: no approved, production-ready provider is installed.',
    );
  }
}

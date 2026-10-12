import { Module } from '@nestjs/common';
import { AiConversationController } from './conversation/conversation.controller';
import { ASR_PROVIDER } from './contracts/asr-provider';
import { AiService } from './ai.service';
import { IndicConformerProvider } from './providers/indic-conformer.provider';
import { AiRegistryService } from './registry/ai-registry.service';
import { ConversationService } from './conversation/conversation.service';
import { UserAiContextService } from './context/user-ai-context.service';
import { TEXT_GENERATION_PROVIDER } from './contracts/text-generation-provider';
import { UnavailableTextGenerationProvider } from './providers/unavailable-text-generation.provider';
import { TextGenerationService } from './text-generation.service';

@Module({
  controllers: [AiConversationController],
  providers: [AiRegistryService, IndicConformerProvider, UnavailableTextGenerationProvider, ConversationService, UserAiContextService, TextGenerationService, { provide: ASR_PROVIDER, useExisting: IndicConformerProvider }, { provide: TEXT_GENERATION_PROVIDER, useExisting: UnavailableTextGenerationProvider }, AiService],
  exports: [AiRegistryService, ConversationService, UserAiContextService, AiService, TextGenerationService],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { ASR_PROVIDER } from './contracts/asr-provider';
import { AiService } from './ai.service';
import { IndicConformerProvider } from './providers/indic-conformer.provider';
import { AiRegistryService } from './registry/ai-registry.service';
import { ConversationService } from './conversation/conversation.service';
import { UserAiContextService } from './context/user-ai-context.service';

@Module({
  providers: [AiRegistryService, IndicConformerProvider, ConversationService, UserAiContextService, { provide: ASR_PROVIDER, useExisting: IndicConformerProvider }, AiService],
  exports: [AiRegistryService, ConversationService, UserAiContextService, AiService],
})
export class AiModule {}

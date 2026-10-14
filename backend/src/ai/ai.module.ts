import { Module } from '@nestjs/common';
import { AuditModule } from '../platform/audit/audit.module';
import { CropsModule } from '../crops/crops.module';
import { FarmsModule } from '../farms/farms.module';
import { LivestockModule } from '../livestock/livestock.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { UsersModule } from '../users/users.module';
import { AiConversationController } from './conversation/conversation.controller';
import { FactDraftService } from './conversation/fact-draft.service';
import { ASR_PROVIDER } from './contracts/asr-provider';
import { AiService } from './ai.service';
import { IndicConformerProvider } from './providers/indic-conformer.provider';
import { AiRegistryService } from './registry/ai-registry.service';
import { AiModelLinkRegistryService } from './registry/ai-model-link-registry.service';
import { AiModelLinkController } from './registry/ai-model-link.controller';
import { ConversationService } from './conversation/conversation.service';
import { UserAiContextService } from './context/user-ai-context.service';
import { TEXT_GENERATION_PROVIDER, TEXT_GENERATION_PROVIDERS } from './contracts/text-generation-provider';
import { OllamaTextGenerationProvider } from './providers/ollama-text-generation.provider';
import { UnavailableTextGenerationProvider } from './providers/unavailable-text-generation.provider';
import { TextGenerationService } from './text-generation.service';
import { AiVoiceCapabilityService } from './voice/ai-voice-capability.service';

@Module({
  imports: [AuditModule, CropsModule, FarmsModule, LivestockModule, MarketplaceModule, UsersModule],
  controllers: [AiConversationController, AiModelLinkController],
  providers: [AiRegistryService, AiModelLinkRegistryService, IndicConformerProvider, OllamaTextGenerationProvider, UnavailableTextGenerationProvider, { provide: TEXT_GENERATION_PROVIDERS, useFactory: (ollama: OllamaTextGenerationProvider, unavailable: UnavailableTextGenerationProvider) => [ollama, unavailable], inject: [OllamaTextGenerationProvider, UnavailableTextGenerationProvider] }, ConversationService, FactDraftService, UserAiContextService, TextGenerationService, AiVoiceCapabilityService, { provide: ASR_PROVIDER, useExisting: IndicConformerProvider }, { provide: TEXT_GENERATION_PROVIDER, useExisting: OllamaTextGenerationProvider }, AiService],
  exports: [AiRegistryService, AiModelLinkRegistryService, ConversationService, UserAiContextService, AiService, TextGenerationService],
})
export class AiModule {}

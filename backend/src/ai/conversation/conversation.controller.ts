import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ConversationMessageRole,
  ConversationMessageSource,
  UserRole,
} from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { TextGenerationService } from '../text-generation.service';
import { classifyTextGenerationTask } from '../routing/ai-task-classifier';
import { UserAiContextService } from '../context/user-ai-context.service';
import { AiVoiceCapabilityService } from '../voice/ai-voice-capability.service';
import { FactDraftService } from './fact-draft.service';
import { CropsService } from '../../crops/crops.service';
import { FarmsService } from '../../farms/farms.service';
import type { UserAiContextEnvelope } from '../contracts/ai-context';

interface AuthenticatedRequest {
  user?: {
    userId?: unknown;
    role?: unknown;
  };
}

@Controller('ai/conversations')
@UseGuards(JwtAuthGuard)
export class AiConversationController {
  private readonly logger = new Logger(AiConversationController.name);

  constructor(
    private readonly conversations: ConversationService,
    private readonly registry: AiRegistryService,
    private readonly textGeneration: TextGenerationService,
    private readonly userAiContext: UserAiContextService,
    private readonly voiceCapabilities: AiVoiceCapabilityService,
    private readonly factDrafts: FactDraftService,
    private readonly crops: CropsService,
    private readonly farms: FarmsService,
  ) {}

  @Get('voice-intents')
  voiceIntents(@Req() req: AuthenticatedRequest) {
    return this.voiceCapabilities.getIntentsForUser(this.requireUserId(req));
  }

  @Get('status')
  status() {
    return this.textGeneration.getDetailedStatus();
  }

  @Post(':conversationId/respond')
  async respond(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    const requestStartedAt = Date.now();
    const stages: Record<string, number> = {};
    let stageStartedAt = requestStartedAt;
    const markStage = (name: string) => {
      const now = Date.now();
      stages[name] = now - stageStartedAt;
      stageStartedAt = now;
    };
    const userId = this.requireUserId(req);
    const data = this.asRecord(body);

    if (typeof data.content !== 'string') {
      throw new BadRequestException('content must be a string.');
    }

    const content = data.content.trim();
    if (!content || content.length > 12000) {
      throw new BadRequestException(
        'content must contain between 1 and 12000 characters.',
      );
    }

    const language = this.optionalText(data.language, 'language', 35);

    // Enforce ownership before any generation provider receives user content.
    const conversation = await this.conversations.getConversation(
      conversationId,
      userId,
      { responseOnly: true },
    );
    markStage('conversationLoadMs');

    const generationRequest = {
      content,
      conversationId: conversation.id,
      requestedBy: userId,
      task: classifyTextGenerationTask(content),
      ...(language === undefined ? {} : { language }),
    };

    // The canonical registry chooses which module-owned records are relevant.
    // Authorize the AI context envelope before loading any protected module data.
    const providerStatus = this.textGeneration.getStatus(classifyTextGenerationTask(content)) as { ready?: boolean };
    const dataContextIntent = this.registry.resolveDataContextIntent(content);
    const needsCropContext = dataContextIntent?.resolver === 'USER_OWNED_CROPS';
    const needsFarmContext = dataContextIntent?.resolver === 'USER_OWNED_FARMS';
    let aiContext: UserAiContextEnvelope | undefined;
    let ownedCrops: Awaited<ReturnType<CropsService['findMyCrops']>> | undefined;
    let ownedFarms: Awaited<ReturnType<FarmsService['findMyFarms']>> | undefined;
    // Deterministic registry-backed answers remain available when the LLM is
    // warming, unavailable, or not yet production-approved. They still require
    // the same authorization gate and the module's owner-scoped service.
    if (providerStatus.ready === true || needsCropContext || needsFarmContext) {
      aiContext = await this.userAiContext.buildContext({
        actor: { userId, role: this.requireUserRole(req) },
        moduleId: this.registry.getConversationModuleId(),
        capability: 'CONVERSATION',
        authorizationModule: 'platform',
        references: ['userId', 'moduleId'],
        fields: needsCropContext || needsFarmContext ? ['conversation', 'messages', 'context'] : ['conversation', 'messages'],
        authorization: {
          resource: 'conversation',
          resourceId: conversation.id,
          ownerId: userId,
        },
        values: {
          userId,
          moduleId: this.registry.getConversationModuleId(),
          conversation: {
            id: conversation.id,
            moduleId: conversation.moduleId,
            title: conversation.title,
            primaryLanguage: conversation.primaryLanguage,
            status: conversation.status,
          },
          messages: [...conversation.messages].reverse().map((message) => ({
            role: message.role,
            content: message.content,
            language: message.language,
            createdAt: message.createdAt,
          })),
          ...(needsCropContext || needsFarmContext ? { context: {} } : {}),
        },
      });
      markStage('authorizedContextMs');
      if (needsCropContext && dataContextIntent) {
        // CropsService performs its own READ authorization and owner scoping.
        ownedCrops = await this.crops.findMyCrops(userId, this.requireUserRole(req));
        markStage('ownedCropReadMs');
        aiContext.fields.context = {
          intentId: dataContextIntent.intentId,
          sourceModuleId: dataContextIntent.moduleId,
          sourceFields: dataContextIntent.fields,
          totalCount: ownedCrops.length,
          truncated: ownedCrops.length > 100,
          crops: ownedCrops.slice(0, 100).map((crop) => ({
            crop: crop.name,
            variety: crop.variety ?? null,
            sowing: crop.sowingDate?.toISOString() ?? null,
            harvest: crop.harvestDate?.toISOString() ?? null,
            farmId: crop.farmId,
          })),
        };
      } else if (needsFarmContext && dataContextIntent) {
        // FarmsService enforces the module's normal READ authorization and owner scope.
        ownedFarms = await this.farms.findMyFarms(userId, this.requireUserRole(req));
        markStage('ownedFarmReadMs');
        aiContext.fields.context = {
          intentId: dataContextIntent.intentId,
          sourceModuleId: dataContextIntent.moduleId,
          sourceFields: dataContextIntent.fields,
          totalCount: ownedFarms.length,
          truncated: ownedFarms.length > 100,
          farms: ownedFarms.slice(0, 100).map((farm) => ({
            id: farm.id,
            name: farm.name,
            type: farm.type ?? null,
            location: farm.location ?? null,
            area: farm.area ?? null,
            unit: farm.unit ?? null,
          })),
        };
      }
    }
    let result: Awaited<ReturnType<TextGenerationService['generate']>>;
    try {
      if (needsCropContext && dataContextIntent && ownedCrops) {
        // This answer is derived from owner-authorized module records, not a
        // probabilistic model. It is O(1) generation work and cannot invent rows.
        result = {
          content: this.formatOwnedCropsAnswer(ownedCrops, language),
          providerId: 'KK-AI-INTENT-ROUTER-LOCAL',
          modelId: 'rule:' + dataContextIntent.intentId,
          modelVersion: 'registry-v' + this.registry.getRegistry().version,
          mode: 'LOCAL',
          ...(language ? { language } : {}),
          generatedAt: new Date().toISOString(),
          requiresValidation: true,
          requiresUserConfirmation: true,
        };
      } else if (needsFarmContext && dataContextIntent && ownedFarms) {
        result = {
          content: this.formatOwnedFarmsAnswer(ownedFarms, language),
          providerId: 'KK-AI-INTENT-ROUTER-LOCAL',
          modelId: 'rule:' + dataContextIntent.intentId,
          modelVersion: 'registry-v' + this.registry.getRegistry().version,
          mode: 'LOCAL',
          ...(language ? { language } : {}),
          generatedAt: new Date().toISOString(),
          requiresValidation: true,
          requiresUserConfirmation: true,
        };
      } else if (providerStatus.ready === true) {
        result = await this.textGeneration.generate({
          ...generationRequest,
          ...(aiContext ? { context: aiContext } : {}),
        });
      } else {
        result = await this.textGeneration.generate(generationRequest);
      }
    } catch (error) {
      markStage('generationFailedMs');
      this.logger.warn(JSON.stringify({
        event: 'ai_conversation_pipeline_failure',
        totalMs: Date.now() - requestStartedAt,
        stages,
        failureType: error instanceof Error ? error.name : 'UnknownError',
        contextIncluded: Boolean(aiContext),
        cropIntent: Boolean(aiContext?.fields?.context),
      }));
      throw error;
    }

    markStage('generationMs');

    const provenance = {
      providerId: result.providerId,
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      mode: result.mode,
      language: result.language ?? language ?? 'en',
      source: result.providerId === 'KK-AI-INTENT-ROUTER-LOCAL' ? 'CENTRAL_REGISTRY_RULE' : 'TEXT',
      generatedAt: result.generatedAt,
    };

    const savedMessage = await this.conversations.appendMessage({
      conversationId: conversation.id,
      role: ConversationMessageRole.ASSISTANT,
      content: result.content,
      source: ConversationMessageSource.TEXT,
      providerId: result.providerId,
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      provenance,
      ...(result.language === undefined ? {} : { language: result.language }),
    }, userId);

    markStage('assistantPersistenceMs');
    this.logger.log(JSON.stringify({ event: 'ai_conversation_pipeline_timing', totalMs: Date.now() - requestStartedAt, stages, contextIncluded: Boolean(aiContext), cropIntent: Boolean(aiContext?.fields?.context) }));

    return {
      message: savedMessage,
      requiresValidation: result.requiresValidation,
      requiresUserConfirmation: result.requiresUserConfirmation,
    };
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const userId = this.requireUserId(req);
    const data = this.asRecord(body);
    const title = this.optionalText(data.title, 'title', 160);
    const primaryLanguage = this.optionalText(
      data.primaryLanguage,
      'primaryLanguage',
      35,
    );

    // Module ownership is centrally governed; clients cannot choose arbitrary modules.
    return this.conversations.createConversation({
      userId,
      moduleId: this.registry.getConversationModuleId(),
      ...(title === undefined ? {} : { title }),
      ...(primaryLanguage === undefined ? {} : { primaryLanguage }),
    });
  }

  @Post(':conversationId/messages')
  async appendUserMessage(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    const userId = this.requireUserId(req);
    const data = this.asRecord(body);

    if (typeof data.content !== 'string') {
      throw new BadRequestException('content must be a string.');
    }
    const content = data.content.trim();
    if (!content || content.length > 12000) {
      throw new BadRequestException(
        'content must contain between 1 and 12000 characters.',
      );
    }

    const language = this.optionalText(data.language, 'language', 35);
    const sessionId = this.optionalText(data.sessionId, 'sessionId', 200);

    const source =
      data.source === undefined
        ? ConversationMessageSource.TEXT
        : data.source;

    if (
      source !== ConversationMessageSource.TEXT &&
      source !== ConversationMessageSource.VOICE
    ) {
      throw new BadRequestException('source must be TEXT or VOICE.');
    }

    // Defense in depth: verify ownership here and again inside the service.
    await this.conversations.getConversation(conversationId, userId);

    return this.conversations.appendMessage({
      conversationId,
      role: ConversationMessageRole.USER,
      content,
      source,
      ...(language === undefined ? {} : { language }),
      ...(sessionId === undefined ? {} : { sessionId }),
    }, userId);
  }

  @Post(':conversationId/fact-candidates')
  createFactCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    const data = this.asRecord(body);
    const userId = this.requireUserId(req);
    const targetModuleId = this.requiredText(data.targetModuleId, 'targetModuleId', 100);
    const targetEntityType = this.requiredText(data.targetEntityType, 'targetEntityType', 100);
    const targetEntityId = this.optionalText(data.targetEntityId, 'targetEntityId', 200);
    // Existing-record drafts are allowed only through FactDraftService's registered
    // field allowlist, resource/field authorization, stale-value check, and normal
    // module service application path. The client cannot bypass those controls.
    if (!Object.prototype.hasOwnProperty.call(data, 'proposedValue') || data.proposedValue === null) {
      throw new BadRequestException('proposedValue must be a non-null JSON value.');
    }
    const confidence = data.confidence;
    if (confidence !== undefined && (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
      throw new BadRequestException('confidence must be a number between 0 and 1.');
    }
    const sessionId = this.optionalText(data.sessionId, 'sessionId', 200);
    return this.factDrafts.createDraft({
      targetModuleId,
      targetEntityType,
      targetFieldId: this.requiredText(data.targetFieldId, 'targetFieldId', 100),
      evidenceMessageId: this.requiredText(data.evidenceMessageId, 'evidenceMessageId', 200),
      ...(targetEntityId === undefined ? {} : { targetEntityId }),
      proposedValue: data.proposedValue,
      ...(confidence === undefined ? {} : { confidence: confidence as number }),
      ...(sessionId === undefined ? {} : { sessionId }),
    }, {
      userId,
      role: this.requireUserRole(req),
    }, conversationId);
  }

  @Get(':conversationId/fact-candidates')
  listFactCandidates(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.factDrafts.listDrafts(conversationId, this.requireUserId(req));
  }

  @Post(':conversationId/fact-candidates/:candidateId/confirm')
  confirmFactCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Param('candidateId') candidateId: string,
    @Body() body: unknown,
  ) {
    const userId = this.requireUserId(req);
    const role = this.requireUserRole(req);
    const data = this.asRecord(body);
    return this.factDrafts.confirmDraft(
      conversationId,
      this.requiredText(candidateId, 'candidateId', 200),
      this.requiredText(data.previewHash, 'previewHash', 64),
      { userId, role },
    );
  }

  @Post(':conversationId/fact-candidates/:candidateId/apply')
  applyFactCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Param('candidateId') candidateId: string,
    @Body() body: unknown,
  ) {
    const userId = this.requireUserId(req);
    const role = this.requireUserRole(req);
    const data = this.asRecord(body);
    return this.factDrafts.applyConfirmedDraft(
      conversationId,
      this.requiredText(candidateId, 'candidateId', 200),
      this.requiredText(data.previewHash, 'previewHash', 64),
      { userId, role },
    );
  }

  @Post(':conversationId/fact-candidates/:candidateId/reject')
  rejectFactCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Param('candidateId') candidateId: string,
    @Body() body: unknown,
  ) {
    const userId = this.requireUserId(req);
    const data = this.asRecord(body);
    return this.factDrafts.rejectDraft(
      conversationId,
      this.requiredText(candidateId, 'candidateId', 200),
      this.requiredText(data.previewHash, 'previewHash', 64),
      userId,
      this.optionalText(data.reason, 'reason', 300),
    );
  }

  @Get(':conversationId/history')
  history(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversations.listHistory(
      conversationId,
      this.requireUserId(req),
    );
  }

  private requireUserRole(req: AuthenticatedRequest): UserRole {
    const role = req.user?.role;
    if (typeof role !== 'string' || !Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException('A valid authenticated user role is required for AI context.');
    }
    return role as UserRole;
  }

  private formatOwnedCropsAnswer(crops: Awaited<ReturnType<CropsService['findMyCrops']>>, language?: string): string {
    const locale = language?.startsWith('hi') ? 'hi-IN' : language?.startsWith('te') ? 'te-IN' : 'en-IN';
    const hindi = locale === 'hi-IN';
    const telugu = locale === 'te-IN';
    if (crops.length === 0) {
      if (hindi) return 'KrishiKendram में अभी आपकी कोई फसल दर्ज नहीं है। आप फसल मॉड्यूल से फसल जोड़ सकते हैं।';
      if (telugu) return 'KrishiKendramలో ప్రస్తుతం మీ పంటలు నమోదు కాలేదు. Crops మాడ్యూల్‌లో పంటను జోడించవచ్చు.';
      return 'You have no crops registered in KrishiKendram yet. You can add one from the Crops module.';
    }
    const rows = crops.slice(0, 8).map((crop) => {
      const details = [
        crop.variety ? (hindi ? 'किस्म ' : telugu ? 'రకం ' : 'variety ') + crop.variety : undefined,
        crop.sowingDate ? (hindi ? 'बुवाई ' : telugu ? 'విత్తిన తేదీ ' : 'sown ') + new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(crop.sowingDate) : undefined,
        crop.harvestDate ? (hindi ? 'कटाई ' : telugu ? 'కోత ' : 'harvest ') + new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(crop.harvestDate) : undefined,
      ].filter((item): item is string => Boolean(item));
      return '- ' + crop.name + (details.length ? ' (' + details.join('; ') + ')' : '');
    });
    const remaining = crops.length - rows.length;
    const header = hindi ? 'आपकी ' + crops.length + ' दर्ज फसलें हैं:\n' : telugu ? 'మీకు ' + crops.length + ' నమోదైన పంటలు ఉన్నాయి:\n' : 'You have ' + crops.length + ' registered crop' + (crops.length === 1 ? '' : 's') + ':\n';
    const more = remaining > 0 ? '\n- ' + (hindi ? 'और ' : telugu ? 'మరియు ' : 'Plus ') + remaining + (hindi ? ' और।' : telugu ? ' మరిన్ని.' : ' more.') : '';
    return header + rows.join('\n') + more;
  }

  private formatOwnedFarmsAnswer(farms: Awaited<ReturnType<FarmsService['findMyFarms']>>, language?: string): string {
    const hindi = language?.startsWith('hi');
    const telugu = language?.startsWith('te');
    if (farms.length === 0) {
      if (hindi) return 'KrishiKendram में अभी आपका कोई खेत दर्ज नहीं है। आप खेत मॉड्यूल में नया खेत जोड़ सकते हैं।';
      if (telugu) return 'KrishiKendramలో ప్రస్తుతం మీ పొలాలు నమోదు కాలేదు. Farms మాడ్యూల్‌లో కొత్త పొలాన్ని జోడించవచ్చు.';
      return 'You have no farms registered in KrishiKendram yet. Say “create a farm” and I will guide you through the details.';
    }
    const rows = farms.slice(0, 8).map((farm) => {
      const details = [farm.location ? String(farm.location) : undefined, farm.area != null ? String(farm.area) + (farm.unit ? ' ' + farm.unit : '') : undefined].filter((item): item is string => Boolean(item));
      return '- ' + farm.name + (details.length ? ' (' + details.join('; ') + ')' : '');
    });
    const remaining = farms.length - rows.length;
    const header = hindi ? 'आपके ' + farms.length + ' दर्ज खेत हैं:\n' : telugu ? 'మీకు ' + farms.length + ' నమోదైన పొలాలు ఉన్నాయి:\n' : 'You have ' + farms.length + ' registered farm' + (farms.length === 1 ? '' : 's') + ':\n';
    const more = remaining > 0 ? '\n- ' + (hindi ? 'और ' : telugu ? 'మరియు ' : 'Plus ') + remaining + (hindi ? ' और।' : telugu ? ' మరిన్ని.' : ' more.') : '';
    return header + rows.join('\n') + more;
  }

  private requireUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.userId;
    if (typeof userId !== 'string' || !userId.trim()) {
      throw new BadRequestException(
        'Authenticated request is missing a valid user identity.',
      );
    }
    return userId;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Request body must be a JSON object.');
    }
    return value as Record<string, unknown>;
  }

  private requiredText(value: unknown, field: string, maxLength: number): string {
    const parsed = this.optionalText(value, field, maxLength);
    if (parsed === undefined) {
      throw new BadRequestException(`${field} is required.`);
    }
    return parsed;
  }

  private optionalText(
    value: unknown,
    field: string,
    maxLength: number,
  ): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > maxLength
    ) {
      throw new BadRequestException(
        `${field} must be a non-empty string of at most ${maxLength} characters.`,
      );
    }
    return value.trim();
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import { UserAiContextService } from '../context/user-ai-context.service';
import { AiVoiceCapabilityService } from '../voice/ai-voice-capability.service';

interface AuthenticatedRequest {
  user?: {
    userId?: unknown;
    role?: unknown;
  };
}

@Controller('ai/conversations')
@UseGuards(JwtAuthGuard)
export class AiConversationController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly registry: AiRegistryService,
    private readonly textGeneration: TextGenerationService,
    private readonly userAiContext: UserAiContextService,
    private readonly voiceCapabilities: AiVoiceCapabilityService,
  ) {}

  @Get('voice-intents')
  voiceIntents(@Req() req: AuthenticatedRequest) {
    return this.voiceCapabilities.getIntentsForUser(this.requireUserId(req));
  }

  @Get('status')
  status() {
    return this.textGeneration.getStatus();
  }

  @Post(':conversationId/respond')
  async respond(
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

    // Enforce ownership before any generation provider receives user content.
    const conversation = await this.conversations.getConversation(
      conversationId,
      userId,
    );

    const generationRequest = {
      content,
      conversationId: conversation.id,
      requestedBy: userId,
      ...(language === undefined ? {} : { language }),
    };

    // Keep the unavailable-provider path deterministic and avoid assembling
    // private context when no registry-approved provider can consume it.
    const providerStatus = this.textGeneration.getStatus() as { ready?: boolean };
    const result = providerStatus.ready === true
      ? await this.textGeneration.generate({
          ...generationRequest,
          context: await this.userAiContext.buildContext({
            actor: { userId, role: this.requireUserRole(req) },
            moduleId: this.registry.getConversationModuleId(),
            capability: 'CONVERSATION',
            authorizationModule: 'platform',
            references: ['userId', 'moduleId'],
            fields: ['conversation', 'messages'],
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
              messages: conversation.messages.slice(-20).map((message) => ({
                role: message.role,
                content: message.content,
                language: message.language,
                createdAt: message.createdAt,
              })),
            },
          }),
        })
      : await this.textGeneration.generate(generationRequest);

    const provenance = {
      providerId: result.providerId,
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      mode: result.mode,
      language: result.language ?? language ?? 'en',
      source: 'TEXT',
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

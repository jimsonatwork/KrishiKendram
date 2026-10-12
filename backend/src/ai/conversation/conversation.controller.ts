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
} from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { AiRegistryService } from '../registry/ai-registry.service';

interface AuthenticatedRequest {
  user?: {
    userId?: unknown;
  };
}

@Controller('ai/conversations')
@UseGuards(JwtAuthGuard)
export class AiConversationController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly registry: AiRegistryService,
  ) {}

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

    // appendMessage itself does not enforce conversation ownership.
    // Always verify ownership before appending, using the JWT identity.
    await this.conversations.getConversation(conversationId, userId);

    return this.conversations.appendMessage({
      conversationId,
      role: ConversationMessageRole.USER,
      content,
      source,
      ...(language === undefined ? {} : { language }),
      ...(sessionId === undefined ? {} : { sessionId }),
    });
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

import { BadRequestException } from '@nestjs/common';
import {
  ConversationMessageRole,
  ConversationMessageSource,
} from '@prisma/client';
import { AiConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { AiRegistryService } from '../registry/ai-registry.service';

describe('AiConversationController', () => {
  let controller: AiConversationController;
  let conversations: {
    createConversation: jest.Mock;
    getConversation: jest.Mock;
    appendMessage: jest.Mock;
    listHistory: jest.Mock;
  };
  let registry: { getConversationModuleId: jest.Mock };

  const req = { user: { userId: 'jwt-user-1' } };

  beforeEach(() => {
    conversations = {
      createConversation: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
      getConversation: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
      appendMessage: jest.fn().mockResolvedValue({ id: 'message-1' }),
      listHistory: jest.fn().mockResolvedValue([]),
    };
    registry = {
      getConversationModuleId: jest.fn().mockReturnValue('KK-AI-CONVERSATION-001'),
    };

    controller = new AiConversationController(
      conversations as unknown as ConversationService,
      registry as unknown as AiRegistryService,
    );
  });

  it('creates a conversation using the JWT owner and central module ID', async () => {
    await controller.create(req, {
      userId: 'attacker-supplied-user',
      moduleId: 'unregistered-client-module',
      title: 'Farm help',
      primaryLanguage: 'en',
    });

    expect(registry.getConversationModuleId).toHaveBeenCalledTimes(1);
    expect(conversations.createConversation).toHaveBeenCalledWith({
      userId: 'jwt-user-1',
      moduleId: 'KK-AI-CONVERSATION-001',
      title: 'Farm help',
      primaryLanguage: 'en',
    });
  });

  it('checks ownership before appending a USER message', async () => {
    await controller.appendUserMessage(req, 'conversation-1', {
      userId: 'attacker-supplied-user',
      role: 'ASSISTANT',
      content: '  How can I help?  ',
      source: 'VOICE',
      providerId: 'untrusted-provider',
      provenance: { fake: true },
    });

    expect(conversations.getConversation).toHaveBeenCalledWith(
      'conversation-1',
      'jwt-user-1',
    );
    expect(conversations.appendMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      role: ConversationMessageRole.USER,
      content: 'How can I help?',
      source: ConversationMessageSource.VOICE,
    });
  });

  it('rejects an empty message', async () => {
    await expect(
      controller.appendUserMessage(req, 'conversation-1', { content: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(conversations.appendMessage).not.toHaveBeenCalled();
  });

  it('rejects unsupported message sources', async () => {
    await expect(
      controller.appendUserMessage(req, 'conversation-1', {
        content: 'Hello',
        source: 'SYSTEM',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(conversations.appendMessage).not.toHaveBeenCalled();
  });

  it('retrieves history using the authenticated user identity', async () => {
    await controller.history(req, 'conversation-1');

    expect(conversations.listHistory).toHaveBeenCalledWith(
      'conversation-1',
      'jwt-user-1',
    );
  });

  it('rejects a request without a JWT user identity', async () => {
    expect(() => controller.create({ user: {} }, {})).toThrow(
      BadRequestException,
    );
    expect(conversations.createConversation).not.toHaveBeenCalled();
  });
});

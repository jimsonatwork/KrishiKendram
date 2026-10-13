import { BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import {
  ConversationMessageRole,
  ConversationMessageSource,
} from '@prisma/client';
import { AiConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { TextGenerationService } from '../text-generation.service';
import { UserAiContextService } from '../context/user-ai-context.service';

describe('AiConversationController', () => {
  let controller: AiConversationController;
  let conversations: {
    createConversation: jest.Mock;
    getConversation: jest.Mock;
    appendMessage: jest.Mock;
    listHistory: jest.Mock;
  };
  let registry: { getConversationModuleId: jest.Mock };
  let textGeneration: { getStatus: jest.Mock; generate: jest.Mock };
  let userAiContext: { buildContext: jest.Mock };
  let voiceCapabilities: { getIntentsForUser: jest.Mock };

  const req = { user: { userId: 'jwt-user-1', role: 'FARMER' } };
  const contextEnvelope = {
    policy: { registryId: 'KK-AI-REGISTRY-001', authorizationBeforeContext: true, databaseWriteAllowed: false, userConfirmationRequired: true },
    actor: { userId: 'jwt-user-1' },
    module: { moduleId: 'KK-AI-CONVERSATION-001', capability: 'CONVERSATION' },
    references: { userId: 'jwt-user-1', moduleId: 'KK-AI-CONVERSATION-001' },
    fields: { conversation: { id: 'conversation-1' }, messages: [] },
  };

  beforeEach(() => {
    conversations = {
      createConversation: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
      getConversation: jest.fn().mockResolvedValue({
        id: 'conversation-1', userId: 'jwt-user-1', moduleId: 'KK-AI-CONVERSATION-001',
        title: 'Farm help', primaryLanguage: 'en', status: 'ACTIVE', messages: [],
      }),
      appendMessage: jest.fn().mockResolvedValue({ id: 'message-1' }),
      listHistory: jest.fn().mockResolvedValue([]),
    };
    registry = {
      getConversationModuleId: jest.fn().mockReturnValue('KK-AI-CONVERSATION-001'),
    };
    textGeneration = {
      getStatus: jest.fn().mockReturnValue({
        enabled: false,
        ready: true,
        cloudFallback: false,
      }),
      generate: jest.fn(),
    };
    userAiContext = { buildContext: jest.fn().mockResolvedValue(contextEnvelope) };
    voiceCapabilities = { getIntentsForUser: jest.fn().mockResolvedValue({ intents: [] }) };

    controller = new AiConversationController(
      conversations as unknown as ConversationService,
      registry as unknown as AiRegistryService,
      textGeneration as unknown as TextGenerationService,
      userAiContext as unknown as UserAiContextService,
      voiceCapabilities as never,
    );
  });

  it('returns the voice intent manifest for the authenticated actor identity', async () => {
    voiceCapabilities.getIntentsForUser.mockResolvedValue({ intents: [{ intentId: 'NAV-FARMS' }] });
    await expect(controller.voiceIntents(req)).resolves.toMatchObject({
      intents: [{ intentId: 'NAV-FARMS' }],
    });
    expect(voiceCapabilities.getIntentsForUser).toHaveBeenCalledWith('jwt-user-1');
  });

  it('reports the centrally governed text-generation status', () => {
    textGeneration.getStatus.mockReturnValue({ enabled: false, ready: false, cloudFallback: false });
    expect(controller.status()).toMatchObject({
      enabled: false,
      ready: false,
      cloudFallback: false,
    });
    expect(textGeneration.getStatus).toHaveBeenCalledTimes(1);
  });

  it('checks conversation ownership before requesting generation', async () => {
    textGeneration.generate.mockResolvedValue({
      content: 'Generated answer',
      providerId: 'approved-local-provider',
      modelId: 'local-model',
      modelVersion: '1',
      mode: 'LOCAL',
      language: 'en',
      generatedAt: '2026-10-12T00:00:00.000Z',
      requiresValidation: true,
      requiresUserConfirmation: true,
    });
    conversations.appendMessage.mockResolvedValue({ id: 'assistant-message-1' });

    await controller.respond(req, 'conversation-1', {
      content: 'How should I plan irrigation?',
      language: 'en-IN',
    });

    expect(conversations.getConversation).toHaveBeenCalledWith(
      'conversation-1',
      'jwt-user-1',
    );
    expect(userAiContext.buildContext).toHaveBeenCalledWith(expect.objectContaining({
      actor: { userId: 'jwt-user-1', role: 'FARMER' },
      moduleId: 'KK-AI-CONVERSATION-001',
      capability: 'CONVERSATION',
      authorizationModule: 'platform',
      references: ['userId', 'moduleId'],
      fields: ['conversation', 'messages'],
      authorization: { resource: 'conversation', resourceId: 'conversation-1', ownerId: 'jwt-user-1' },
      values: expect.objectContaining({ userId: 'jwt-user-1', messages: [] }),
    }));
    expect(textGeneration.generate).toHaveBeenCalledWith({
      content: 'How should I plan irrigation?',
      conversationId: 'conversation-1',
      requestedBy: 'jwt-user-1',
      language: 'en-IN',
      context: contextEnvelope,
    });
    expect(conversations.appendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        role: ConversationMessageRole.ASSISTANT,
        content: 'Generated answer',
        providerId: 'approved-local-provider',
        provenance: expect.objectContaining({
          providerId: 'approved-local-provider',
          source: 'TEXT',
        }),
      }),
      'jwt-user-1',
    );
  });

  it('does not assemble context when the provider is unavailable', async () => {
    textGeneration.getStatus.mockReturnValue({ ready: false, enabled: false, cloudFallback: false });
    textGeneration.generate.mockRejectedValue(new ServiceUnavailableException('provider unavailable'));

    await expect(controller.respond(req, 'conversation-1', { content: 'Hello' }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(userAiContext.buildContext).not.toHaveBeenCalled();
    expect(textGeneration.generate).toHaveBeenCalledWith({
      content: 'Hello', conversationId: 'conversation-1', requestedBy: 'jwt-user-1',
    });
  });

  it('does not call generation when context authorization fails', async () => {
    userAiContext.buildContext.mockRejectedValue(new ForbiddenException('context denied'));

    await expect(controller.respond(req, 'conversation-1', { content: 'Private question' }))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(textGeneration.generate).not.toHaveBeenCalled();
    expect(conversations.appendMessage).not.toHaveBeenCalled();
  });

  it('does not call generation when ownership verification fails', async () => {
    conversations.getConversation.mockRejectedValue(
      new BadRequestException('Conversation does not belong to the requested user.'),
    );

    await expect(
      controller.respond(req, 'another-users-conversation', {
        content: 'Private question',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(textGeneration.generate).not.toHaveBeenCalled();
    expect(conversations.appendMessage).not.toHaveBeenCalled();
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
    }, 'jwt-user-1');
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

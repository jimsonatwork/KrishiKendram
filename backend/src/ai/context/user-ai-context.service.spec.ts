import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserAiContextService } from './user-ai-context.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { AuthorizationAction } from '../../platform/authorization/authorization.types';

function makeAuth() {
  return {
    authorizeFields: jest.fn().mockResolvedValue({
      allowed: true,
      decision: {
        allowed: true,
        permissionId: 'permission-user-read',
      },
      fieldPolicy: { allowed: true },
    }),
  } as any;
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    actor: { userId: 'user-1', role: 'FARMER' },
    moduleId: 'KK-USER-001',
    capability: 'CONVERSATION',
    references: ['userId', 'screenId'],
    fields: ['identity', 'profile'],
    authorization: {
      resource: 'user',
      action: AuthorizationAction.READ,
      resourceId: 'user-1',
    },
    values: {
      userId: 'user-1',
      screenId: 'profile',
      identity: { displayName: 'Ramesh' },
      profile: { language: 'te-IN' },
      passwordHash: 'MUST_NOT_LEAK',
      secrets: 'MUST_NOT_LEAK',
    },
    ...overrides,
  } as any;
}

describe('UserAiContextService', () => {
  let auth: ReturnType<typeof makeAuth>;
  let registry: AiRegistryService;
  let service: UserAiContextService;

  beforeEach(() => {
    auth = makeAuth();
    registry = new AiRegistryService();
    service = new UserAiContextService(auth, registry);
  });

  it('requires explicit authenticated actor and fields', async () => {
    await expect(service.buildContext({ ...request(), actor: undefined } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.buildContext({ ...request(), fields: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown modules and disallowed capabilities through the central registry', async () => {
    await expect(service.buildContext({ ...request(), moduleId: 'KK-UNKNOWN-999' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.buildContext({ ...request(), capability: 'VISION' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('authorizes before exposing context', async () => {
    auth.authorizeFields.mockResolvedValue({
      allowed: false,
      decision: { allowed: false },
    });
    await expect(service.buildContext(request())).rejects.toBeInstanceOf(BadRequestException);
    expect(auth.authorizeFields).toHaveBeenCalledTimes(1);
  });

  it('fails closed when authorization returns an incomplete success result', async () => {
    auth.authorizeFields.mockResolvedValue({ allowed: true });

    await expect(service.buildContext(request())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the configured platform permission namespace while retaining the AI context contract', async () => {
    const input = request({
      moduleId: 'KK-AI-CONVERSATION-001',
      authorizationModule: 'platform',
      references: ['userId', 'moduleId'],
      fields: ['conversation', 'messages'],
      authorization: { resource: 'conversation', resourceId: 'conversation-1', ownerId: 'user-1' },
      values: { userId: 'user-1', moduleId: 'KK-AI-CONVERSATION-001', conversation: { id: 'conversation-1' }, messages: [] },
    });

    const result = await service.buildContext(input);

    expect(auth.authorizeFields).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'platform', resource: 'conversation', resourceId: 'conversation-1', ownerId: 'user-1' }),
      ['conversation', 'messages'],
      'READ',
    );
    expect(result.module.moduleId).toBe('KK-AI-CONVERSATION-001');
  });

  it('rejects an authorization namespace not linked to the canonical conversation module', async () => {
    await expect(service.buildContext(request({ authorizationModule: 'platform' } as any)))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(auth.authorizeFields).not.toHaveBeenCalled();
  });

  it('projects only registry-approved fields and references', async () => {
    const result = await service.buildContext(request());
    expect(result.fields).toEqual({
      identity: { displayName: 'Ramesh' },
      profile: { language: 'te-IN' },
    });
    expect(result.references).toEqual({ userId: 'user-1', screenId: 'profile' });
    expect(JSON.stringify(result)).not.toContain('MUST_NOT_LEAK');
  });

  it('rejects cross-module references before authorization or context projection', async () => {
    await expect(service.buildContext({ ...request(), references: ['farmId'] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(auth.authorizeFields).not.toHaveBeenCalled();
  });

  it('rejects restricted fields before authorization can expand access', async () => {
    await expect(service.buildContext({ ...request(), fields: ['passwordHash'] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(auth.authorizeFields).not.toHaveBeenCalled();
  });

  it('marks the envelope as non-writing and confirmation-bound', async () => {
    const result = await service.buildContext(request());
    expect(result.policy).toEqual({
      registryId: 'KK-AI-REGISTRY-001',
      authorizationBeforeContext: true,
      databaseWriteAllowed: false,
      userConfirmationRequired: true,
    });
  });
});

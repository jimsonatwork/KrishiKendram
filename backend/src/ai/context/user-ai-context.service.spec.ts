import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserAiContextService } from './user-ai-context.service';
import { AiRegistryService } from '../registry/ai-registry.service';
import { AuthorizationAction } from '../../platform/authorization/authorization.types';

function makeAuth() {
  return {
    authorizeFields: jest.fn().mockResolvedValue({ allowed: true }),
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
    auth.authorizeFields.mockResolvedValue({ allowed: false });
    await expect(service.buildContext(request())).rejects.toBeInstanceOf(BadRequestException);
    expect(auth.authorizeFields).toHaveBeenCalledTimes(1);
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

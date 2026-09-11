import { ForbiddenException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { AuthorizationAction, AuthorizationScope } from './authorization.types';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    farm: {
      findUnique: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
    });

    service = new AuthorizationService(prisma);
  });

  const request = {
    user: {
      userId: 'user-1',
      role: UserRole.FARMER,
    },
    module: 'farms',
    resource: 'crop',
    action: AuthorizationAction.READ,
  };

  function permission(scope: AuthorizationScope) {
    return {
      module: 'farms',
      section: null,
      resource: 'crop',
      action: AuthorizationAction.READ,
      scope,
      rolePermissions: [{ role: UserRole.FARMER }],
      accessGrants: [],
    };
  }

  it('allows GLOBAL permission for a matching role', async () => {
    prisma.permission.findMany.mockResolvedValue([
      permission(AuthorizationScope.GLOBAL),
    ]);

    await expect(service.can(request)).resolves.toBe(true);
  });

  it('allows OWN permission only when ownerId matches the user', async () => {
    prisma.permission.findMany.mockResolvedValue([
      permission(AuthorizationScope.OWN),
    ]);

    await expect(
      service.can({
        ...request,
        ownerId: 'user-1',
      }),
    ).resolves.toBe(true);

    await expect(
      service.can({
        ...request,
        ownerId: 'user-2',
      }),
    ).resolves.toBe(false);
  });

  it('denies FARM permission when farmId is missing', async () => {
    prisma.permission.findMany.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    await expect(service.can(request)).resolves.toBe(false);

    expect(prisma.farm.findUnique).not.toHaveBeenCalled();
  });

  it('denies FARM permission when the referenced farm does not exist', async () => {
    prisma.permission.findMany.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    prisma.farm.findUnique.mockResolvedValue(null);

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(false);
  });

  it('denies FARM permission when the user does not own the referenced farm', async () => {
    prisma.permission.findMany.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-2',
    });

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(false);
  });

  it('allows FARM permission when the user owns the referenced farm', async () => {
    prisma.permission.findMany.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(true);

    expect(prisma.farm.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'farm-1',
      },
      select: {
        ownerId: true,
      },
    });
  });

  it('allows an explicit FARM grant only for its assigned user', async () => {
    prisma.permission.findMany.mockResolvedValue([
      {
        ...permission(AuthorizationScope.FARM),
        accessGrants: [
          {
            subjectType: 'FARM',
            subjectId: 'farm-1',
            userId: 'user-1',
            effect: 'ALLOW',
          },
        ],
      },
    ]);

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(true);

    prisma.permission.findMany.mockResolvedValue([
      {
        ...permission(AuthorizationScope.FARM),
        accessGrants: [
          {
            subjectType: 'FARM',
            subjectId: 'farm-1',
            userId: null,
            effect: 'ALLOW',
          },
        ],
      },
    ]);

    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-2',
    });

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(false);
  });

  it('applies an explicit FARM deny before the scope allows access', async () => {
    prisma.permission.findMany.mockResolvedValue([
      {
        ...permission(AuthorizationScope.FARM),
        accessGrants: [
          {
            subjectType: 'FARM',
            subjectId: 'farm-1',
            userId: 'user-1',
            effect: 'DENY',
          },
        ],
      },
    ]);

    prisma.farm.findUnique.mockResolvedValue({
      ownerId: 'user-1',
    });

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(false);
  });

  it('assertCan throws when authorization is denied', async () => {
    prisma.permission.findMany.mockResolvedValue([]);

    await expect(service.assertCan(request)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

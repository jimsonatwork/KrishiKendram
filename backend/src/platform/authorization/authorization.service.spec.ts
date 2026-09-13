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

  const fieldPolicyEvaluationService = {
    evaluate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
    });

    service = new AuthorizationService(
      prisma,
      fieldPolicyEvaluationService as any,
    );
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

  it('allows OWN user READ permission for the current user', async () => {
    prisma.permission.findMany.mockResolvedValue([
      {
        module: 'platform',
        section: null,
        resource: 'user',
        action: AuthorizationAction.READ,
        scope: AuthorizationScope.OWN,
        rolePermissions: [{ role: UserRole.FARMER }],
        accessGrants: [],
      },
    ]);

    await expect(
      service.can({
        user: {
          userId: 'user-1',
          role: UserRole.FARMER,
        },
        module: 'platform',
        resource: 'user',
        action: AuthorizationAction.READ,
        ownerId: 'user-1',
      }),
    ).resolves.toBe(true);
  });

  it('denies OWN user READ permission for another user', async () => {
    prisma.permission.findMany.mockResolvedValue([
      {
        module: 'platform',
        section: null,
        resource: 'user',
        action: AuthorizationAction.READ,
        scope: AuthorizationScope.OWN,
        rolePermissions: [{ role: UserRole.FARMER }],
        accessGrants: [],
      },
    ]);

    await expect(
      service.can({
        user: {
          userId: 'user-1',
          role: UserRole.FARMER,
        },
        module: 'platform',
        resource: 'user',
        action: AuthorizationAction.READ,
        ownerId: 'user-2',
      }),
    ).resolves.toBe(false);
  });

  it('allows GLOBAL user READ permission for ADMIN and SUPER_ADMIN only', async () => {
    const globalUserReadPermission = {
      module: 'platform',
      section: null,
      resource: 'user',
      action: AuthorizationAction.READ,
      scope: AuthorizationScope.GLOBAL,
      accessGrants: [],
    };

    prisma.permission.findMany.mockResolvedValueOnce([
      {
        ...globalUserReadPermission,
        rolePermissions: [{ role: UserRole.ADMIN }],
      },
    ]);

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    await expect(
      service.can({
        user: {
          userId: 'user-1',
          role: UserRole.ADMIN,
        },
        module: 'platform',
        resource: 'user',
        action: AuthorizationAction.READ,
      }),
    ).resolves.toBe(true);

    prisma.permission.findMany.mockResolvedValueOnce([
      {
        ...globalUserReadPermission,
        rolePermissions: [{ role: UserRole.SUPER_ADMIN }],
      },
    ]);

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });

    await expect(
      service.can({
        user: {
          userId: 'user-1',
          role: UserRole.SUPER_ADMIN,
        },
        module: 'platform',
        resource: 'user',
        action: AuthorizationAction.READ,
      }),
    ).resolves.toBe(true);

    prisma.permission.findMany.mockResolvedValueOnce([]);

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
    });

    await expect(
      service.can({
        user: {
          userId: 'user-1',
          role: UserRole.FARMER,
        },
        module: 'platform',
        resource: 'user',
        action: AuthorizationAction.READ,
      }),
    ).resolves.toBe(false);
  });

  describe('authorization decisions', () => {
    it('returns the exact permissionId that grants access', async () => {
      const permission = {
        id: 'permission-resource',
        module: 'farm',
        section: 'production',
        resource: 'crop',
        action: AuthorizationAction.READ,
        scope: AuthorizationScope.OWN,
        rolePermissions: [{ role: UserRole.FARMER }],
        accessGrants: [],
      };

      prisma.permission.findMany.mockResolvedValue([permission] as never);

      await expect(
        service.authorize({
          ...request,
          section: 'production',
          ownerId: 'user-1',
        }),
      ).resolves.toMatchObject({
        allowed: true,
        permissionId: 'permission-resource',
        metadata: {
          module: 'farm',
          section: 'production',
          resource: 'crop',
          action: AuthorizationAction.READ,
          scope: AuthorizationScope.OWN,
        },
      });
    });

    it('does not expose a permissionId when authorization is denied', async () => {
      const permission = {
        id: 'permission-resource',
        module: 'farm',
        section: 'production',
        resource: 'crop',
        action: AuthorizationAction.READ,
        scope: AuthorizationScope.OWN,
        rolePermissions: [{ role: UserRole.FARMER }],
        accessGrants: [],
      };

      prisma.permission.findMany.mockResolvedValue([permission] as never);

      await expect(
        service.authorize({
          ...request,
          section: 'production',
          ownerId: 'another-user',
        }),
      ).resolves.toEqual({
        allowed: false,
      });
    });

    it('returns no permissionId when no permission matches', async () => {
      prisma.permission.findMany.mockResolvedValue([]);

      await expect(
        service.authorize(request),
      ).resolves.toEqual({
        allowed: false,
      });
    });

    it('uses the same authorization decision path for can()', async () => {
      const permission = {
        id: 'permission-global',
        module: 'farm',
        section: null,
        resource: null,
        action: AuthorizationAction.READ,
        scope: AuthorizationScope.GLOBAL,
        rolePermissions: [{ role: UserRole.FARMER }],
        accessGrants: [],
      };

      prisma.permission.findMany.mockResolvedValue([permission] as never);

      await expect(service.can(request)).resolves.toBe(true);
    });
  });


  describe('authorizeFields()', () => {
    it('passes the exact successful permissionId to field-policy evaluation', async () => {
      const authorizedPermission = {
        ...permission(AuthorizationScope.GLOBAL),
        id: 'permission-exact',
      };

      prisma.permission.findMany.mockResolvedValue([
        authorizedPermission,
      ]);

      fieldPolicyEvaluationService.evaluate.mockResolvedValue({
        allowed: true,
        decisions: [
          {
            field: 'name',
            allowed: true,
            effect: 'ALLOW',
          },
        ],
      });

      const result = await service.authorizeFields(
        request,
        ['name'],
        'READ',
      );

      expect(result.allowed).toBe(true);
      expect(result.decision.allowed).toBe(true);
      expect(result.decision.permissionId).toBe('permission-exact');

      expect(
        fieldPolicyEvaluationService.evaluate,
      ).toHaveBeenCalledTimes(1);

      expect(
        fieldPolicyEvaluationService.evaluate,
      ).toHaveBeenCalledWith(
        'permission-exact',
        ['name'],
        'READ',
      );
    });

    it('does not evaluate fields when resource authorization is denied', async () => {
      prisma.permission.findMany.mockResolvedValue([]);

      const result = await service.authorizeFields(
        request,
        ['name'],
        'READ',
      );

      expect(result.allowed).toBe(false);
      expect(result.decision.allowed).toBe(false);
      expect(result.decision.permissionId).toBeUndefined();

      expect(
        fieldPolicyEvaluationService.evaluate,
      ).not.toHaveBeenCalled();
    });

    it('does not evaluate fields when resource scope does not match', async () => {
      const ownPermission = {
        ...permission(AuthorizationScope.OWN),
        id: 'permission-own',
      };

      prisma.permission.findMany.mockResolvedValue([
        ownPermission,
      ]);

      const result = await service.authorizeFields(
        {
          ...request,
          ownerId: 'different-user',
        },
        ['name'],
        'READ',
      );

      expect(result.allowed).toBe(false);
      expect(result.decision.allowed).toBe(false);
      expect(result.decision.permissionId).toBeUndefined();

      expect(
        fieldPolicyEvaluationService.evaluate,
      ).not.toHaveBeenCalled();
    });

    it('propagates field-policy denial after resource authorization succeeds', async () => {
      const authorizedPermission = {
        ...permission(AuthorizationScope.GLOBAL),
        id: 'permission-field-deny',
      };

      prisma.permission.findMany.mockResolvedValue([
        authorizedPermission,
      ]);

      fieldPolicyEvaluationService.evaluate.mockResolvedValue({
        allowed: false,
        decisions: [
          {
            field: 'secretValue',
            allowed: false,
            effect: 'DENY',
          },
        ],
      });

      const result = await service.authorizeFields(
        request,
        ['secretValue'],
        'READ',
      );

      expect(result.allowed).toBe(false);
      expect(result.decision.allowed).toBe(true);
      expect(result.decision.permissionId).toBe(
        'permission-field-deny',
      );
      expect(result.fieldPolicy?.allowed).toBe(false);

      expect(
        fieldPolicyEvaluationService.evaluate,
      ).toHaveBeenCalledWith(
        'permission-field-deny',
        ['secretValue'],
        'READ',
      );
    });

    it('preserves WRITE operation for field-policy evaluation', async () => {
      const authorizedPermission = {
        ...permission(AuthorizationScope.GLOBAL),
        id: 'permission-write',
        action: AuthorizationAction.UPDATE,
      };

      prisma.permission.findMany.mockResolvedValue([
        authorizedPermission,
      ]);

      fieldPolicyEvaluationService.evaluate.mockResolvedValue({
        allowed: true,
        decisions: [
          {
            field: 'name',
            allowed: true,
            effect: 'ALLOW',
          },
        ],
      });

      const result = await service.authorizeFields(
        {
          ...request,
          action: AuthorizationAction.UPDATE,
        },
        ['name'],
        'WRITE',
      );

      expect(result.allowed).toBe(true);

      expect(
        fieldPolicyEvaluationService.evaluate,
      ).toHaveBeenCalledWith(
        'permission-write',
        ['name'],
        'WRITE',
      );
    });
  });

});

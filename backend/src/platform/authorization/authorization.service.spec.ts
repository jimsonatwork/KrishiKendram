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

  const farmAccessService = {
    resolveAccess: jest.fn(),
    canAccess: jest.fn(),
  };

  const fieldPolicyEvaluationService = {
    evaluate: jest.fn(),
  };
  const permissionService = {
    findForAuthorization: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    farmAccessService.resolveAccess.mockResolvedValue({
      allowed: false,
      source: 'NONE',
    });
    farmAccessService.canAccess.mockResolvedValue(false);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
    });

    service = new AuthorizationService(
      prisma,
      fieldPolicyEvaluationService as any,
      permissionService as any,
      farmAccessService as any,
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

  it('loads authorization permissions through PermissionService', async () => {
    const authorizedPermission = {
      id: 'permission-boundary',
      module: 'farms',
      section: null,
      resource: 'crop',
      action: AuthorizationAction.READ,
      scope: AuthorizationScope.GLOBAL,
      rolePermissions: [{ role: UserRole.FARMER }],
      accessGrants: [],
    };

    permissionService.findForAuthorization.mockResolvedValue([
      authorizedPermission,
    ]);

    await expect(service.can(request)).resolves.toBe(true);

    expect(permissionService.findForAuthorization).toHaveBeenCalledWith({
      module: 'farms',
      section: undefined,
      resource: 'crop',
      action: AuthorizationAction.READ,
      role: UserRole.FARMER,
      userId: 'user-1',
    });
  });

  it('allows GLOBAL permission for a matching role', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.GLOBAL),
    ]);

    await expect(service.can(request)).resolves.toBe(true);
  });

  it('allows OWN permission only when ownerId matches the user', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
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
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    await expect(service.can(request)).resolves.toBe(false);

    expect(farmAccessService.resolveAccess).not.toHaveBeenCalled();
  });

  it('does not allow farmId to satisfy OWN authorization', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.OWN),
    ]);

    farmAccessService.canAccess.mockResolvedValue(true);

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(false);

    expect(farmAccessService.resolveAccess).not.toHaveBeenCalled();
  });

  it('does not allow ownerId to satisfy FARM authorization', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    await expect(
      service.can({
        ...request,
        ownerId: 'user-1',
      }),
    ).resolves.toBe(false);

    expect(farmAccessService.resolveAccess).not.toHaveBeenCalled();
  });

  it('keeps OWN and FARM contexts independent when both are present', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.OWN),
    ]);

    await expect(
      service.can({
        ...request,
        ownerId: 'user-1',
        farmId: 'farm-1',
      }),
    ).resolves.toBe(true);

    expect(farmAccessService.resolveAccess).not.toHaveBeenCalled();

    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    farmAccessService.resolveAccess.mockResolvedValue({
      allowed: true,
      source: 'OWNER',
    });

    await expect(
      service.can({
        ...request,
        ownerId: 'different-user',
        farmId: 'farm-1',
      }),
    ).resolves.toBe(true);

    expect(farmAccessService.resolveAccess).toHaveBeenCalledWith(
      'user-1',
      'farm-1',
    );
  });

  it('denies FARM permission when the farm access boundary denies access', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    farmAccessService.resolveAccess.mockResolvedValue({
      allowed: false,
      source: 'NONE',
    });

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(false);

    expect(farmAccessService.resolveAccess).toHaveBeenCalledWith(
      'user-1',
      'farm-1',
    );
  });

  it('denies FARM permission when the farm access boundary denies the user', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    farmAccessService.resolveAccess.mockResolvedValue({
      allowed: false,
      source: 'NONE',
    });

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(false);
  });

  it('allows FARM permission when the farm access boundary allows the user', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    farmAccessService.resolveAccess.mockResolvedValue({
      allowed: true,
      source: 'RELATIONSHIP',
      relationships: [],
    });

    await expect(
      service.can({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toBe(true);

    expect(farmAccessService.resolveAccess).toHaveBeenCalledWith(
      'user-1',
      'farm-1',
    );
  });

  it('consumes farm access context without interpreting relationship facts as permissions', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    farmAccessService.resolveAccess.mockResolvedValue({
      allowed: true,
      source: 'RELATIONSHIP',
      relationships: [
        {
          resourceType: 'farm',
          resourceId: 'farm-1',
          userId: 'user-1',
          relationshipType: 'MANAGER',
          status: 'ACTIVE',
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
        },
      ],
    });

    await expect(
      service.authorize({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toMatchObject({
      allowed: true,
    });

    expect(farmAccessService.resolveAccess).toHaveBeenCalledWith(
      'user-1',
      'farm-1',
    );
  });

  it('preserves relationship-backed farm access context in the authorization decision', async () => {
    const relationship = {
      resourceType: 'farm',
      resourceId: 'farm-1',
      userId: 'user-1',
      relationshipType: 'MANAGER',
      status: 'ACTIVE',
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
    };

    const farmAccessContext = {
      allowed: true,
      source: 'RELATIONSHIP' as const,
      relationships: [relationship],
    };

    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    farmAccessService.resolveAccess.mockResolvedValue(
      farmAccessContext,
    );

    await expect(
      service.authorize({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toMatchObject({
      allowed: true,
      farmAccess: farmAccessContext,
    });
  });

  it('preserves owner-backed farm access context in the authorization decision', async () => {
    const farmAccessContext = {
      allowed: true,
      source: 'OWNER' as const,
    };

    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    farmAccessService.resolveAccess.mockResolvedValue(
      farmAccessContext,
    );

    await expect(
      service.authorize({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toMatchObject({
      allowed: true,
      farmAccess: farmAccessContext,
    });
  });

  it('preserves global farm access context in the authorization decision', async () => {
    const farmAccessContext = {
      allowed: true,
      source: 'GLOBAL' as const,
    };

    permissionService.findForAuthorization.mockResolvedValue([
      permission(AuthorizationScope.FARM),
    ]);

    farmAccessService.resolveAccess.mockResolvedValue(
      farmAccessContext,
    );

    await expect(
      service.authorize({
        ...request,
        farmId: 'farm-1',
      }),
    ).resolves.toMatchObject({
      allowed: true,
      farmAccess: farmAccessContext,
    });
  });

  it('does not attach farm access context to GLOBAL-scoped authorization', async () => {
    const globalPermission = {
      ...permission(AuthorizationScope.GLOBAL),
      id: 'permission-global',
    };

    permissionService.findForAuthorization.mockResolvedValue([
      globalPermission,
    ]);

    await expect(
      service.authorize(request),
    ).resolves.toEqual({
      allowed: true,
      permissionId: 'permission-global',
      metadata: {
        module: globalPermission.module,
        section: globalPermission.section,
        resource: globalPermission.resource,
        action: globalPermission.action,
        scope: globalPermission.scope,
      },
    });

    expect(farmAccessService.resolveAccess).not.toHaveBeenCalled();
  });

  it('allows an explicit FARM grant only for its assigned user', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
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

    permissionService.findForAuthorization.mockResolvedValue([
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
    permissionService.findForAuthorization.mockResolvedValue([
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
    permissionService.findForAuthorization.mockResolvedValue([]);

    await expect(service.assertCan(request)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows OWN user READ permission for the current user', async () => {
    permissionService.findForAuthorization.mockResolvedValue([
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
    permissionService.findForAuthorization.mockResolvedValue([
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

    permissionService.findForAuthorization.mockResolvedValueOnce([
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

    permissionService.findForAuthorization.mockResolvedValueOnce([
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

    permissionService.findForAuthorization.mockResolvedValueOnce([]);

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

      permissionService.findForAuthorization.mockResolvedValue([permission] as never);

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

      permissionService.findForAuthorization.mockResolvedValue([permission] as never);

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
      permissionService.findForAuthorization.mockResolvedValue([]);

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

      permissionService.findForAuthorization.mockResolvedValue([permission] as never);

      await expect(service.can(request)).resolves.toBe(true);
    });
  });


  describe('authorizeFields()', () => {
    it('passes the exact successful permissionId to field-policy evaluation', async () => {
      const authorizedPermission = {
        ...permission(AuthorizationScope.GLOBAL),
        id: 'permission-exact',
      };

      permissionService.findForAuthorization.mockResolvedValue([
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
      permissionService.findForAuthorization.mockResolvedValue([]);

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

      permissionService.findForAuthorization.mockResolvedValue([
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

      permissionService.findForAuthorization.mockResolvedValue([
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

      permissionService.findForAuthorization.mockResolvedValue([
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

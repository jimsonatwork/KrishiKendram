import { UserRole } from '@prisma/client';

import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  const prisma = {
    permission: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    rolePermission: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  let service: PermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionService(prisma as never);
  });

  describe('findForAuthorization', () => {
    const authorizationInput = {
      module: 'farms',
      section: 'production',
      resource: 'crop',
      action: 'READ',
      role: UserRole.FARMER,
      userId: 'user-1',
    };

    it('loads resource-specific permissions with role and grant context', async () => {
      const permissions = [
        {
          id: 'permission-resource',
          module: 'farms',
          section: 'production',
          resource: 'crop',
          action: 'READ',
          scope: 'FARM',
          rolePermissions: [{ role: UserRole.FARMER }],
          accessGrants: [],
        },
      ];

      prisma.permission.findMany.mockResolvedValue(permissions);

      await expect(
        service.findForAuthorization(authorizationInput),
      ).resolves.toEqual(permissions);

      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: {
          action: 'READ',
          OR: [
            {
              module: 'farms',
              section: 'production',
              resource: 'crop',
            },
            {
              module: 'farms',
              section: 'production',
              resource: null,
            },
            {
              module: 'farms',
              section: null,
              resource: null,
            },
          ],
        },
        include: {
          rolePermissions: {
            where: {
              role: UserRole.FARMER,
            },
          },
          accessGrants: {
            where: {
              OR: [
                { userId: 'user-1' },
                { userId: null },
              ],
            },
          },
        },
      });
    });

    it('preserves the authorization specificity fallback candidates', async () => {
      prisma.permission.findMany.mockResolvedValue([]);

      await service.findForAuthorization({
        ...authorizationInput,
        section: 'operations',
        resource: 'asset',
      });

      expect(prisma.permission.findMany.mock.calls[0][0].where.OR).toEqual([
        {
          module: 'farms',
          section: 'operations',
          resource: 'asset',
        },
        {
          module: 'farms',
          section: 'operations',
          resource: null,
        },
        {
          module: 'farms',
          section: null,
          resource: null,
        },
      ]);
    });

    it('filters role permissions to the requesting role', async () => {
      prisma.permission.findMany.mockResolvedValue([]);

      await service.findForAuthorization({
        ...authorizationInput,
        role: UserRole.ADMIN,
      });

      expect(
        prisma.permission.findMany.mock.calls[0][0].include.rolePermissions,
      ).toEqual({
        where: {
          role: UserRole.ADMIN,
        },
      });
    });

    it('loads only user-specific and global access grants', async () => {
      prisma.permission.findMany.mockResolvedValue([]);

      await service.findForAuthorization(authorizationInput);

      expect(
        prisma.permission.findMany.mock.calls[0][0].include.accessGrants,
      ).toEqual({
        where: {
          OR: [
            { userId: 'user-1' },
            { userId: null },
          ],
        },
      });
    });

    it('returns persisted permission records without evaluating authorization', async () => {
      const permissions = [
        {
          id: 'permission-record',
          module: 'farms',
          section: null,
          resource: 'crop',
          action: 'READ',
          scope: 'GLOBAL',
          rolePermissions: [],
          accessGrants: [],
        },
      ];

      prisma.permission.findMany.mockResolvedValue(permissions);

      await expect(
        service.findForAuthorization(authorizationInput),
      ).resolves.toEqual(permissions);

      expect(prisma.permission.findMany).toHaveBeenCalledTimes(1);
    });

    it('returns an empty collection when no permission matches', async () => {
      prisma.permission.findMany.mockResolvedValue([]);

      await expect(
        service.findForAuthorization(authorizationInput),
      ).resolves.toEqual([]);
    });
  });

  describe('ensurePermission', () => {
    it('returns an existing permission without creating another row', async () => {
      prisma.permission.findFirst.mockResolvedValue({ id: 'permission-1' });

      await expect(
        service.ensurePermission({
          module: 'farms',
          resource: 'crop',
          action: 'READ',
          scope: 'GLOBAL',
        }),
      ).resolves.toEqual({ id: 'permission-1' });

      expect(prisma.permission.findFirst).toHaveBeenCalledWith({
        where: {
          module: 'farms',
          section: null,
          resource: 'crop',
          action: 'READ',
          scope: 'GLOBAL',
        },
        select: {
          id: true,
        },
      });

      expect(prisma.permission.create).not.toHaveBeenCalled();
    });

    it('creates the permission when it does not already exist', async () => {
      prisma.permission.findFirst.mockResolvedValue(null);
      prisma.permission.create.mockResolvedValue({ id: 'permission-2' });

      await expect(
        service.ensurePermission({
          module: 'farms',
          resource: 'crop',
          action: 'CREATE',
          scope: 'FARM',
        }),
      ).resolves.toEqual({ id: 'permission-2' });

      expect(prisma.permission.create).toHaveBeenCalledWith({
        data: {
          module: 'farms',
          section: null,
          resource: 'crop',
          action: 'CREATE',
          scope: 'FARM',
          inherited: true,
        },
        select: {
          id: true,
        },
      });
    });
  });

  describe('reconcileRolePermissions', () => {
    it('does not create a duplicate role permission', async () => {
      prisma.rolePermission.findFirst.mockResolvedValue({
        id: 'role-permission-1',
      });

      await service.reconcileRolePermissions('permission-1', [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
      ]);

      expect(prisma.rolePermission.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.rolePermission.create).not.toHaveBeenCalled();
    });

    it('creates missing role permissions only', async () => {
      prisma.rolePermission.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-role-permission' });

      prisma.rolePermission.create.mockResolvedValue({
        id: 'created-role-permission',
      });

      await service.reconcileRolePermissions('permission-1', [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
      ]);

      expect(prisma.rolePermission.create).toHaveBeenCalledTimes(1);
      expect(prisma.rolePermission.create).toHaveBeenCalledWith({
        data: {
          role: UserRole.SUPER_ADMIN,
          permissionId: 'permission-1',
        },
      });
    });
  });
});

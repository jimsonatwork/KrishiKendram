import { UserRole } from '@prisma/client';

import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  const prisma = {
    permission: {
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

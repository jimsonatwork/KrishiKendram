import {
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const farmResources = [
  'farm',
  'farmAsset',
  'farmRecord',
  'crop',
];

const farmActions = [
  'READ',
  'CREATE',
  'UPDATE',
  'DELETE',
];

const allUserRoles = Object.values(UserRole);

const administrativeUserRoles = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

const userPermissions = [
  {
    module: 'platform',
    resource: 'user',
    action: 'READ',
    scope: 'OWN',
    roles: allUserRoles,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'READ',
    scope: 'GLOBAL',
    roles: administrativeUserRoles,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'CREATE',
    scope: 'GLOBAL',
    roles: administrativeUserRoles,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'UPDATE',
    scope: 'GLOBAL',
    roles: administrativeUserRoles,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'DELETE',
    scope: 'GLOBAL',
    roles: administrativeUserRoles,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'READ_ACTIVITY',
    scope: 'GLOBAL',
    roles: administrativeUserRoles,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'READ_HISTORY',
    scope: 'GLOBAL',
    roles: administrativeUserRoles,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'RESTORE',
    scope: 'GLOBAL',
    roles: administrativeUserRoles,
  },
];

async function main() {
  const obsoleteFarmOwnedResources = [
    'farmAsset',
    'farmRecord',
    'crop',
  ];

  for (const resource of obsoleteFarmOwnedResources) {
    const permissions =
      await prisma.permission.findMany({
        where: {
          module: 'farms',
          section: null,
          resource,
          scope: 'OWN',
        },
        select: {
          id: true,
        },
      });

    for (const permission of permissions) {
      await prisma.permission.delete({
        where: {
          id: permission.id,
        },
      });
    }
  }

  for (const resource of farmResources) {
    for (const action of farmActions) {
      const scope =
        resource === 'farm'
          ? 'OWN'
          : 'FARM';

      let permission =
        await prisma.permission.findFirst({
          where: {
            module: 'farms',
            section: null,
            resource,
            action,
            scope,
          },
        });

      if (!permission) {
        permission =
          await prisma.permission.create({
            data: {
              module: 'farms',
              resource,
              action,
              scope,
            },
          });
      }

      const desiredRoles: UserRole[] = [UserRole.FARMER];

      const existingRolePermissions =
        await prisma.rolePermission.findMany({
          where: {
            permissionId: permission.id,
          },
          select: {
            id: true,
            role: true,
          },
        });

      for (const existing of existingRolePermissions) {
        if (!desiredRoles.includes(existing.role)) {
          await prisma.rolePermission.delete({
            where: {
              id: existing.id,
            },
          });
        }
      }

      for (const role of desiredRoles) {
        const existing =
          await prisma.rolePermission.findFirst({
            where: {
              role,
              permissionId: permission.id,
            },
          });

        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              role,
              permissionId: permission.id,
            },
          });
        }
      }
    }
  }

  for (const definition of userPermissions) {
    let permission =
      await prisma.permission.findFirst({
        where: {
          module: definition.module,
          section: null,
          resource: definition.resource,
          action: definition.action,
          scope: definition.scope,
        },
      });

    if (!permission) {
      permission =
        await prisma.permission.create({
          data: {
            module: definition.module,
            resource: definition.resource,
            action: definition.action,
            scope: definition.scope,
          },
        });
    }

    for (const role of definition.roles) {
      const existing =
        await prisma.rolePermission.findFirst({
          where: {
            role,
            permissionId: permission.id,
          },
        });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            role,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  console.log(
    '✅ Farm and user authorization permissions seeded.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
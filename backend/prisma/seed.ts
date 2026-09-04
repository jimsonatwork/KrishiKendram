import {
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const resources = [
  'farm',
  'farmAsset',
  'farmRecord',
  'crop',
];

const actions = [
  'READ',
  'CREATE',
  'UPDATE',
  'DELETE',
];

const scopes = [
  'OWN',
  'GLOBAL',
];

async function main() {
  for (const resource of resources) {
    for (const action of actions) {
      for (const scope of scopes) {
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

        const roles =
          scope === 'OWN'
            ? [UserRole.FARMER]
            : [
                UserRole.ADMIN,
                UserRole.SUPER_ADMIN,
              ];

        for (const role of roles) {
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
  }

  console.log(
    '✅ Farm authorization permissions seeded.',
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
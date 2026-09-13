import {
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

import { RESOURCE_DEFINITIONS } from '../src/platform/registry/definitions/resources';
import { ResourceDefinition } from '../src/platform/registry/resource-definition.interface';

const CRUD_ACTIONS = [
  'READ',
  'CREATE',
  'UPDATE',
  'DELETE',
] as const;

const ADMINISTRATIVE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

const ALL_USER_ROLES: UserRole[] = Object.values(UserRole);

const userPermissions = [
  {
    module: 'platform',
    resource: 'user',
    action: 'READ',
    scope: 'OWN',
    roles: ALL_USER_ROLES,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'READ',
    scope: 'GLOBAL',
    roles: ADMINISTRATIVE_ROLES,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'CREATE',
    scope: 'GLOBAL',
    roles: ADMINISTRATIVE_ROLES,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'UPDATE',
    scope: 'GLOBAL',
    roles: ADMINISTRATIVE_ROLES,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'DELETE',
    scope: 'GLOBAL',
    roles: ADMINISTRATIVE_ROLES,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'READ_ACTIVITY',
    scope: 'GLOBAL',
    roles: ADMINISTRATIVE_ROLES,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'READ_HISTORY',
    scope: 'GLOBAL',
    roles: ADMINISTRATIVE_ROLES,
  },
  {
    module: 'platform',
    resource: 'user',
    action: 'RESTORE',
    scope: 'GLOBAL',
    roles: ADMINISTRATIVE_ROLES,
  },
];

function getResourceModule(resource: ResourceDefinition): string {
  return resource.module;
}

// FARMER authorization remains explicit.
// Registry scopes describe what a resource supports; they do NOT grant
// FARMER capabilities automatically. This prevents a future resource from
// gaining FARMER CRUD merely by declaring OWN/FARM in its registry metadata.
const FARMER_RESOURCE_SCOPES: Record<string, string> = {
  farm: 'OWN',
  farmAsset: 'FARM',
  farmRecord: 'FARM',
  crop: 'OWN',
};

function getFarmerScope(resource: ResourceDefinition): string | null {
  return FARMER_RESOURCE_SCOPES[resource.name] ?? null;
}

async function ensurePermission(
  module: string,
  resource: string,
  action: string,
  scope: string,
) {
  let permission = await prisma.permission.findFirst({
    where: {
      module,
      section: null,
      resource,
      action,
      scope,
    },
  });

  if (!permission) {
    permission = await prisma.permission.create({
      data: {
        module,
        resource,
        action,
        scope,
      },
    });
  }

  return permission;
}

// Seed reconciliation is intentionally additive.
// It ensures required inherited capabilities exist without deleting
// existing role assignments that may have been granted separately.
// Destructive capability cleanup requires an explicit source-of-truth
// mechanism and must not happen implicitly during a seed.
async function reconcileRolePermissions(
  permissionId: string,
  desiredRoles: UserRole[],
) {
  for (const role of desiredRoles) {
    const existingRolePermission =
      await prisma.rolePermission.findFirst({
        where: {
          role,
          permissionId,
        },
      });

    if (!existingRolePermission) {
      await prisma.rolePermission.create({
        data: {
          role,
          permissionId,
        },
      });
    }
  }
}

async function seedResourceCrudCapabilities() {
  for (const resource of RESOURCE_DEFINITIONS) {
    const module = getResourceModule(resource);

    for (const action of CRUD_ACTIONS) {
      if (!resource.permissions?.includes(action)) {
        continue;
      }

      // ADMIN and SUPER_ADMIN receive automatic GLOBAL CRUD
      // for every registered resource that declares the action.
      const globalPermission = await ensurePermission(
        module,
        resource.name,
        action,
        'GLOBAL',
      );

      await reconcileRolePermissions(
        globalPermission.id,
        ADMINISTRATIVE_ROLES,
      );

      // FARMER receives the resource's declared ownership scope.
      const farmerScope = getFarmerScope(resource);

      if (farmerScope) {
        const farmerPermission = await ensurePermission(
          module,
          resource.name,
          action,
          farmerScope,
        );

        await reconcileRolePermissions(
          farmerPermission.id,
          [UserRole.FARMER],
        );
      }
    }
  }
}

async function seedUserPlatformCapabilities() {
  for (const definition of userPermissions) {
    const permission = await ensurePermission(
      definition.module,
      definition.resource,
      definition.action,
      definition.scope,
    );

    await reconcileRolePermissions(
      permission.id,
      definition.roles,
    );
  }
}

async function main() {
  await seedResourceCrudCapabilities();
  await seedUserPlatformCapabilities();

  console.log(
    '✅ Resource and user authorization capabilities seeded.',
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

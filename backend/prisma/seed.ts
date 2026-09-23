import {
  PrismaClient,
  UserRole,
} from '@prisma/client';

import {
  AuthorizationAction,
  AuthorizationScope,
} from '../src/platform/authorization/authorization.types';

const prisma = new PrismaClient();

import { RESOURCE_DEFINITIONS } from '../src/platform/registry/definitions/resources';
import { ResourceDefinition } from '../src/platform/registry/resource-definition.interface';

const FARMER_CRUD_ACTIONS = new Set<AuthorizationAction>([
  AuthorizationAction.READ,
  AuthorizationAction.CREATE,
  AuthorizationAction.UPDATE,
  AuthorizationAction.DELETE,
]);

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

async function seedResourceCapabilities() {
  for (const resource of RESOURCE_DEFINITIONS) {
    const module = getResourceModule(resource);

    // Registry capabilities are the canonical declaration of what a
    // resource supports. They do not grant roles by themselves.
    for (const capability of resource.capabilities ?? []) {
      // GLOBAL capabilities are automatically available to the
      // administrative roles. This is the platform-level administrative
      // policy and avoids maintaining a hardcoded resource list.
      if (capability.scopes.includes(AuthorizationScope.GLOBAL)) {
        const globalPermission = await ensurePermission(
          module,
          resource.name,
          capability.action,
          AuthorizationScope.GLOBAL,
        );

        await reconcileRolePermissions(
          globalPermission.id,
          ADMINISTRATIVE_ROLES,
        );
      }

      // FARMER authorization remains explicitly policy-driven.
      // Only the currently approved CRUD capabilities receive the
      // resource-specific FARMER scope. Future non-CRUD capabilities
      // must not become FARMER permissions automatically.
      if (FARMER_CRUD_ACTIONS.has(capability.action)) {
        const farmerScope = getFarmerScope(resource);

        if (
          farmerScope &&
          capability.scopes.includes(farmerScope as AuthorizationScope)
        ) {
          const farmerPermission = await ensurePermission(
            module,
            resource.name,
            capability.action,
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
  await seedResourceCapabilities();
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

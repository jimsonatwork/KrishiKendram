import { UserRole } from '@prisma/client';

import { PrismaService } from '../src/prisma/prisma.service';
import { PermissionService } from '../src/platform/authorization/permission.service';
import { AuthorizationAction } from '../src/platform/authorization/authorization.types';

const prisma = new PrismaService();
const permissionService = new PermissionService(prisma);

import { RESOURCE_DEFINITIONS } from '../src/platform/registry/definitions/resources';
import { ResourceDefinition } from '../src/platform/registry/resource-definition.interface';

const CRUD_ACTIONS: AuthorizationAction[] = [
  AuthorizationAction.READ,
  AuthorizationAction.CREATE,
  AuthorizationAction.UPDATE,
  AuthorizationAction.DELETE,
];

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
  return permissionService.ensurePermission({
    module,
    resource,
    action,
    scope,
  });
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
  await permissionService.reconcileRolePermissions(
    permissionId,
    desiredRoles,
  );
}

async function seedResourceCrudCapabilities() {
  for (const resource of RESOURCE_DEFINITIONS) {
    const module = getResourceModule(resource);

    // First-class Registry capabilities are the source of truth for
    // capability persistence. Legacy metadata remains available during
    // the incremental migration but no longer drives CRUD persistence.
    for (const capability of resource.capabilities ?? []) {
      if (CRUD_ACTIONS.indexOf(capability.action) === -1) {
        continue;
      }

      for (const scope of capability.scopes) {
        const permission = await ensurePermission(
          module,
          resource.name,
          capability.action,
          scope,
        );

        // Administrative roles receive declared GLOBAL capabilities.
        if (scope === 'GLOBAL') {
          await reconcileRolePermissions(
            permission.id,
            ADMINISTRATIVE_ROLES,
          );
        }

        // FARMER role assignment remains an explicit seed policy.
        // Registry scopes describe what the resource supports; they do NOT
        // automatically grant every supported scope to FARMER.
        const farmerScope = getFarmerScope(resource);

        if (farmerScope === scope) {
          await reconcileRolePermissions(
            permission.id,
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

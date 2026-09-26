import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { RegistryService } from '../registry/registry.service';

export interface EnsurePermissionInput {
  module: string;
  resource: string;
  action: string;
  scope: string;
}

export interface FindAuthorizationPermissionsInput {
  module: string;
  section?: string;
  resource: string;
  action: string;
  role: UserRole;
  userId: string;
}

export type AuthorizationPermission = Prisma.PermissionGetPayload<{
  include: {
    rolePermissions: true;
    accessGrants: true;
  };
}>;

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: RegistryService,
  ) {}

  async findForAuthorization(
    input: FindAuthorizationPermissionsInput,
  ): Promise<AuthorizationPermission[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        action: input.action,
        OR: [
          {
            module: input.module,
            section: input.section ?? null,
            resource: input.resource,
          },
          {
            module: input.module,
            section: input.section ?? null,
            resource: null,
          },
          {
            module: input.module,
            section: null,
            resource: null,
          },
        ],
      },
      include: {
        rolePermissions: {
          where: {
            role: input.role,
          },
        },
        accessGrants: {
          where: {
            OR: [
              {
                userId: input.userId,
              },
              {
                userId: null,
              },
            ],
          },
        },
      },
    });

    return permissions.filter((permission) =>
      this.isDeclaredCapability(permission),
    );
  }

  private isDeclaredCapability(
    permission: AuthorizationPermission,
  ): boolean {
    // Registry-declared capabilities are authoritative for
    // resource-specific permissions.
    //
    // Wildcard/module-level permissions are intentionally preserved
    // because they are not resource capabilities and are used by
    // existing platform authorization paths.
    if (!permission.resource) {
      return true;
    }

    return this.isDeclaredCapabilityInput(
      permission.module,
      permission.resource,
      permission.action,
      permission.scope,
    );
  }

  private isDeclaredCapabilityInput(
    module: string,
    resourceName: string,
    action: string,
    scope: string,
  ): boolean {
    const resource = this.registry.get(resourceName);

    if (!resource) {
      return false;
    }

    if (resource.module !== module) {
      return false;
    }

    return (resource.capabilities ?? []).some(
      (capability) =>
        capability.action === action &&
        capability.scopes.includes(
          scope as (typeof capability.scopes)[number],
        ),
    );
  }

  async ensurePermission(
    input: EnsurePermissionInput,
  ): Promise<{ id: string }> {
    if (
      !this.isDeclaredCapabilityInput(
        input.module,
        input.resource,
        input.action,
        input.scope,
      )
    ) {
      throw new Error(
        `Undeclared Registry capability: ${input.module}/${input.resource}/${input.action}/${input.scope}`,
      );
    }

    const permission = await this.prisma.permission.findFirst({
      where: {
        module: input.module,
        section: null,
        resource: input.resource,
        action: input.action,
        scope: input.scope,
      },
      select: {
        id: true,
      },
    });

    if (permission) {
      return permission;
    }

    return this.prisma.permission.create({
      data: {
        module: input.module,
        section: null,
        resource: input.resource,
        action: input.action,
        scope: input.scope,
        inherited: true,
      },
      select: {
        id: true,
      },
    });
  }

  async reconcileRolePermissions(
    permissionId: string,
    roles: UserRole[],
  ): Promise<void> {
    for (const role of roles) {
      const existingRolePermission =
        await this.prisma.rolePermission.findFirst({
          where: {
            role,
            permissionId,
          },
          select: {
            id: true,
          },
        });

      if (!existingRolePermission) {
        await this.prisma.rolePermission.create({
          data: {
            role,
            permissionId,
          },
        });
      }
    }
  }
}

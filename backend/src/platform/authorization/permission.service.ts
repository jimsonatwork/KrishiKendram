import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface EnsurePermissionInput {
  module: string;
  resource: string;
  action: string;
  scope: string;
}

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async ensurePermission(
    input: EnsurePermissionInput,
  ): Promise<{ id: string }> {
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

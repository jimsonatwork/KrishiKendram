import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import {
  AuthorizationAction,
  AuthorizationScope,
} from './authorization.types';

export interface AuthorizationContext {
  userId: string;
  role: UserRole;
}

export interface AuthorizationRequest {
  user: AuthorizationContext;

  module: string;
  section?: string;
  resource: string;

  action: AuthorizationAction;

  resourceId?: string;

  ownerId?: string;
  farmId?: string;
}

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async can(
    request: AuthorizationRequest,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: request.user.userId,
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'User not found.',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'User is not active.',
      );
    }

    const permissions =
      await this.prisma.permission.findMany({
        where: {
          action: request.action,
          OR: [
            {
              module: request.module,
              section: request.section ?? null,
              resource: request.resource,
            },
            {
              module: request.module,
              section: request.section ?? null,
              resource: null,
            },
            {
              module: request.module,
              section: null,
              resource: null,
            },
          ],
        },
        include: {
          rolePermissions: {
            where: {
              role: user.role,
            },
          },
          accessGrants: {
            where: {
              OR: [
                {
                  userId: user.id,
                },
                {
                  userId: null,
                },
              ],
            },
          },
        },
      });

    if (permissions.length === 0) {
      return false;
    }

    const matchingPermissions =
      permissions
        .filter(
          (permission) =>
            permission.rolePermissions.length > 0,
        )
        .sort(
          (a, b) =>
            this.permissionSpecificity(b) -
            this.permissionSpecificity(a),
        );

    for (const permission of matchingPermissions) {
      const denyGrant =
        permission.accessGrants.find(
          (grant) =>
            grant.effect === 'DENY' &&
            this.grantMatches(
              grant.subjectType,
              grant.subjectId,
              request,
            ),
        );

      if (denyGrant) {
        return false;
      }

      const allowGrant =
        permission.accessGrants.find(
          (grant) =>
            grant.effect === 'ALLOW' &&
            this.grantMatches(
              grant.subjectType,
              grant.subjectId,
              request,
            ),
        );

      if (allowGrant) {
        return true;
      }

      if (
        this.scopeMatches(
          permission.scope,
          request,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  async assertCan(
    request: AuthorizationRequest,
  ): Promise<void> {
    const allowed = await this.can(request);

    if (!allowed) {
      throw new ForbiddenException(
        `Access denied for ${request.action} on ${request.module}/${request.resource}.`,
      );
    }
  }

  private permissionSpecificity(permission: {
    module: string;
    section: string | null;
    resource: string | null;
  }): number {
    let score = 1;

    if (permission.section) {
      score += 1;
    }

    if (permission.resource) {
      score += 1;
    }

    return score;
  }

  private scopeMatches(
    scope: string,
    request: AuthorizationRequest,
  ): boolean {
    switch (scope) {
      case AuthorizationScope.GLOBAL:
        return true;

      case AuthorizationScope.OWN:
        return (
          !!request.ownerId &&
          request.ownerId === request.user.userId
        );

      case AuthorizationScope.FARM:
        return !!request.farmId;

      case AuthorizationScope.ASSIGNED:
      case AuthorizationScope.ORGANIZATION:
      case AuthorizationScope.SHARED:
      case AuthorizationScope.PUBLIC:
        return false;

      default:
        return false;
    }
  }

  private grantMatches(
    subjectType: string,
    subjectId: string,
    request: AuthorizationRequest,
  ): boolean {
    switch (subjectType) {
      case 'USER':
        return (
          subjectId === request.user.userId
        );

      case 'ROLE':
        return (
          subjectId === request.user.role
        );

      case 'RESOURCE':
        return (
          subjectId === request.resourceId
        );

      case 'FARM':
        return (
          subjectId === request.farmId
        );

      default:
        return false;
    }
  }
}

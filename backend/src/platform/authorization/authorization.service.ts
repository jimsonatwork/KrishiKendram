import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { AuthorizationAction, AuthorizationScope } from './authorization.types';
import { FieldPolicyEvaluationService } from './field-policy-evaluation.service';
import { FarmAccessService } from './farm-access.service';
import type { FarmAccessContext } from './farm-access.service';
import { PermissionService } from './permission.service';
import type {
  FieldPolicyEvaluation,
  FieldPolicyOperation,
} from './field-policy.service';

export interface AuthorizationContext {
  userId: string;
  role: UserRole;
}

/**
 * Explicit ownership authorization context.
 *
 * OWN scope evaluates this context only. It must never be inferred from
 * farmId or another resource boundary.
 */
export interface AuthorizationOwnershipContext {
  ownerId?: string;
}

/**
 * Explicit farm-boundary authorization context.
 *
 * FARM scope evaluates this context only. It must never be inferred from
 * ownerId or another ownership boundary.
 */
export interface AuthorizationFarmContext {
  farmId?: string;
}

export interface AuthorizationRequest
  extends AuthorizationOwnershipContext,
    AuthorizationFarmContext {
  user: AuthorizationContext;

  module: string;
  section?: string;
  resource: string;

  action: AuthorizationAction;

  resourceId?: string;

  ownerId?: string;
  farmId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;

  /**
   * Farm-boundary context used when a FARM-scoped permission authorizes
   * the request.
   *
   * The context preserves the farm-access source and relationship facts
   * without translating relationship facts into roles or permissions.
   */
  farmAccess?: FarmAccessContext;

  /**
   * Exact permission that produced the successful authorization decision.
   *
   * This is intentionally omitted for denied decisions so callers cannot
   * learn which permission records exist for an unauthorized request.
   */
  permissionId?: string;

  metadata?: {
    module: string;
    section: string | null;
    resource: string | null;
    action: AuthorizationAction;
    scope: string;
  };
}

export interface AuthorizationFieldDecision {
  allowed: boolean;
  decision: AuthorizationDecision;
  fieldPolicy?: FieldPolicyEvaluation;
}

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldPolicyEvaluationService: FieldPolicyEvaluationService,
    private readonly permissionService: PermissionService,
    private readonly farmAccessService: FarmAccessService,
  ) {}

  /**
   * Canonical resource authorization entry point.
   *
   * authorize() is the single decision path used by can() and assertCan().
   * The successful permission ID is retained so the next authorization
   * stage can evaluate field-level policy against the exact permission.
   */
  async authorize(
    request: AuthorizationRequest,
  ): Promise<AuthorizationDecision> {
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
      throw new UnauthorizedException('User not found.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active.');
    }

    const permissions =
      await this.permissionService.findForAuthorization({
        module: request.module,
        section: request.section,
        resource: request.resource,
        action: request.action,
        role: user.role,
        userId: user.id,
      });

    if (permissions.length === 0) {
      return {
        allowed: false,
      };
    }

    const matchingPermissions = permissions
      .filter((permission) => permission.rolePermissions.length > 0)
      .sort(
        (a, b) => this.permissionSpecificity(b) - this.permissionSpecificity(a),
      );

    for (const permission of matchingPermissions) {
      const denyGrant = permission.accessGrants.find(
        (grant) =>
          grant.effect === 'DENY' &&
          this.grantMatches(
            grant.subjectType,
            grant.subjectId,
            grant.userId,
            request,
          ),
      );

      if (denyGrant) {
        return {
          allowed: false,
        };
      }

      const allowGrant = permission.accessGrants.find(
        (grant) =>
          grant.effect === 'ALLOW' &&
          this.grantMatches(
            grant.subjectType,
            grant.subjectId,
            grant.userId,
            request,
          ),
      );

      if (allowGrant) {
        return this.allowedDecision(permission);
      }

      const scopeMatch = await this.scopeMatches(
        permission.scope,
        request,
      );

      if (scopeMatch.matched) {
        return this.allowedDecision(
          permission,
          scopeMatch.farmAccess,
        );
      }
    }

    return {
      allowed: false,
    };
  }

  /**
   * Canonical two-stage authorization entry point.
   *
   * Stage 1:
   *   authorize() determines whether the caller may access the resource.
   *
   * Stage 2:
   *   FieldPolicyEvaluationService evaluates requested fields against the
   *   exact Permission record that produced the successful decision.
   *
   * A denied resource decision never reaches field-policy evaluation.
   */
  async authorizeFields(
    request: AuthorizationRequest,
    fields: readonly string[],
    operation: FieldPolicyOperation,
  ): Promise<AuthorizationFieldDecision> {
    const decision = await this.authorize(request);

    if (!decision.allowed || !decision.permissionId) {
      return {
        allowed: false,
        decision,
      };
    }

    const fieldPolicy =
      await this.fieldPolicyEvaluationService.evaluate(
        decision.permissionId,
        fields,
        operation,
      );

    return {
      allowed: fieldPolicy.allowed,
      decision,
      fieldPolicy,
    };
  }

  async can(request: AuthorizationRequest): Promise<boolean> {
    const decision = await this.authorize(request);

    return decision.allowed;
  }

  async assertCan(request: AuthorizationRequest): Promise<void> {
    const decision = await this.authorize(request);

    if (!decision.allowed) {
      throw new ForbiddenException(
        `Access denied for ${request.action} on ${request.module}/${request.resource}.`,
      );
    }
  }

  private allowedDecision(
    permission: {
      id: string;
      module: string;
      section: string | null;
      resource: string | null;
      action: string;
      scope: string;
    },
    farmAccess?: FarmAccessContext,
  ): AuthorizationDecision {
    return {
      allowed: true,
      permissionId: permission.id,
      ...(farmAccess ? { farmAccess } : {}),
      metadata: {
        module: permission.module,
        section: permission.section,
        resource: permission.resource,
        action: permission.action as AuthorizationAction,
        scope: permission.scope,
      },
    };
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

  private async scopeMatches(
    scope: string,
    request: AuthorizationRequest,
  ): Promise<{
    matched: boolean;
    farmAccess?: FarmAccessContext;
  }> {
    switch (scope) {
      case AuthorizationScope.GLOBAL:
        return { matched: true };

      case AuthorizationScope.OWN:
        return {
          matched: this.matchesOwnershipContext(request),
        };

      case AuthorizationScope.FARM:
        return this.matchesFarmContext(request);

      case AuthorizationScope.ASSIGNED:
      case AuthorizationScope.ORGANIZATION:
      case AuthorizationScope.SHARED:
      case AuthorizationScope.PUBLIC:
        return { matched: false };

      default:
        return { matched: false };
    }
  }

  /**
   * Evaluates the ownership authorization boundary.
   *
   * OWN authorization is intentionally independent from farm access.
   */
  private matchesOwnershipContext(
    request: AuthorizationRequest,
  ): boolean {
    return (
      !!request.ownerId &&
      request.ownerId === request.user.userId
    );
  }

  /**
   * Evaluates the farm authorization boundary.
   *
   * FARM authorization is intentionally delegated to FarmAccessService so
   * AuthorizationService does not interpret farm ownership/relationships.
   */
  private async matchesFarmContext(
    request: AuthorizationRequest,
  ): Promise<{
    matched: boolean;
    farmAccess?: FarmAccessContext;
  }> {
    if (!request.farmId) {
      return { matched: false };
    }

    const farmAccessContext =
      await this.farmAccessService.resolveAccess(
        request.user.userId,
        request.farmId,
      );

    if (!farmAccessContext.allowed) {
      return { matched: false };
    }

    return {
      matched: true,
      farmAccess: farmAccessContext,
    };
  }

  private grantMatches(
    subjectType: string,
    subjectId: string,
    grantUserId: string | null,
    request: AuthorizationRequest,
  ): boolean {
    switch (subjectType) {
      case 'USER':
        return subjectId === request.user.userId;

      case 'ROLE':
        return subjectId === request.user.role;

      case 'RESOURCE':
        return subjectId === request.resourceId;

      case 'FARM':
        return (
          grantUserId === request.user.userId && subjectId === request.farmId
        );

      default:
        return false;
    }
  }
}

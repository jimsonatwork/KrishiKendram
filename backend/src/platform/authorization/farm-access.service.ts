import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { RESOURCE_RELATIONSHIP_RESOLVER } from '../relationships/relationship-resolution.types';
import type { ResourceRelationshipResolver } from '../relationships/relationship-resolution.types';
import { RelationshipAccessPolicy } from '../relationships/relationship-access.policy';

import { GlobalFarmAccessPolicy } from './global-farm-access.policy';

import type { ResourceRelationship } from '../relationships/relationship.types';

export type FarmAccessSource =
  | 'GLOBAL'
  | 'OWNER'
  | 'RELATIONSHIP'
  | 'NONE';

/**
 * Canonical context produced by the farm-access boundary.
 *
 * The source describes how the farm boundary was reached. Relationship
 * entries remain domain facts and are never converted into roles,
 * permissions, or resource actions by this contract.
 */
export interface FarmAccessContext {
  allowed: boolean;
  source: FarmAccessSource;
  relationships?: readonly ResourceRelationship[];
}

export type FarmAccessDecision = FarmAccessContext;

@Injectable()
export class FarmAccessService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESOURCE_RELATIONSHIP_RESOLVER)
    private readonly relationshipResolver: ResourceRelationshipResolver,
    private readonly relationshipAccessPolicy: RelationshipAccessPolicy,
    private readonly globalFarmAccessPolicy: GlobalFarmAccessPolicy,
  ) {}

  async resolveAccess(
    userId: string,
    farmId: string,
  ): Promise<FarmAccessDecision> {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { ownerId: true },
    });

    if (!farm) {
      return { allowed: false, source: 'NONE' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (
      user?.role &&
      this.globalFarmAccessPolicy.allowsGlobalFarmAccess(user.role)
    ) {
      return { allowed: true, source: 'GLOBAL' };
    }

    if (farm.ownerId === userId) {
      return { allowed: true, source: 'OWNER' };
    }

    const resolution = await this.relationshipResolver.resolve({
      resourceType: 'farm',
      resourceId: farmId,
      userId,
    });

    const hasRelationshipAccess = resolution.relationships.some(
      (relationship) =>
        this.relationshipAccessPolicy.allowsFarmAccess(relationship),
    );

    if (hasRelationshipAccess) {
      return {
        allowed: true,
        source: 'RELATIONSHIP',
        relationships: resolution.relationships,
      };
    }

    return { allowed: false, source: 'NONE' };
  }

  async canAccess(userId: string, farmId: string): Promise<boolean> {
    const decision = await this.resolveAccess(userId, farmId);
    return decision.allowed;
  }
}

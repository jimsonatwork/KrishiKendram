import { Inject, Injectable } from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { RESOURCE_RELATIONSHIP_RESOLVER } from '../relationships/relationship-resolution.types';
import type { ResourceRelationshipResolver } from '../relationships/relationship-resolution.types';
import { RelationshipAccessPolicy } from '../relationships/relationship-access.policy';

export interface FarmAccessDecision {
  allowed: boolean;
  source: 'GLOBAL' | 'OWNER' | 'RELATIONSHIP' | 'NONE';
}

@Injectable()
export class FarmAccessService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESOURCE_RELATIONSHIP_RESOLVER)
    private readonly relationshipResolver: ResourceRelationshipResolver,
    private readonly relationshipAccessPolicy: RelationshipAccessPolicy,
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

    if (user?.role === UserRole.SUPER_ADMIN) {
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
      return { allowed: true, source: 'RELATIONSHIP' };
    }

    return { allowed: false, source: 'NONE' };
  }

  async canAccess(userId: string, farmId: string): Promise<boolean> {
    const decision = await this.resolveAccess(userId, farmId);
    return decision.allowed;
  }
}

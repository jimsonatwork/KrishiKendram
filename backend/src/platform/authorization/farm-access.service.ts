import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface FarmAccessDecision {
  /**
   * Whether the requested user currently has access to the farm boundary.
   */
  allowed: boolean;

  /**
   * Identifies the implementation source of the current access decision.
   *
   * This is intentionally not a universal relationship taxonomy.
   * Future Resource Relationship resolution can introduce additional
   * decision sources without changing AuthorizationService.
   */
  source: 'OWNER' | 'NONE';
}

@Injectable()
export class FarmAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Canonical farm-boundary access check.
   *
   * R1.1 deliberately preserves the current authorization behavior:
   * farm access is currently established by Farm.ownerId.
   *
   * This service is the architectural boundary for farm access rather than
   * making AuthorizationService responsible for interpreting ownership.
   *
   * Future Resource Relationship support can extend this method to consider
   * active OWNER, CO_OWNER, LESSEE, MANAGER, WORKER, CUSTODIAN, or other
   * authorized farm relationships without changing AuthorizationService.
   */
  async resolveAccess(
    userId: string,
    farmId: string,
  ): Promise<FarmAccessDecision> {
    const farm = await this.prisma.farm.findUnique({
      where: {
        id: farmId,
      },
      select: {
        ownerId: true,
      },
    });

    if (!farm) {
      return {
        allowed: false,
        source: 'NONE',
      };
    }

    if (farm.ownerId === userId) {
      return {
        allowed: true,
        source: 'OWNER',
      };
    }

    return {
      allowed: false,
      source: 'NONE',
    };
  }

  /**
   * Compatibility boolean API for existing authorization callers.
   *
   * AuthorizationService intentionally remains independent from the
   * underlying farm-access decision details.
   */
  async canAccess(userId: string, farmId: string): Promise<boolean> {
    const decision = await this.resolveAccess(userId, farmId);

    return decision.allowed;
  }
}

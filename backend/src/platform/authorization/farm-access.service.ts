import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

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
  async canAccess(userId: string, farmId: string): Promise<boolean> {
    const farm = await this.prisma.farm.findUnique({
      where: {
        id: farmId,
      },
      select: {
        ownerId: true,
      },
    });

    return farm?.ownerId === userId;
  }
}

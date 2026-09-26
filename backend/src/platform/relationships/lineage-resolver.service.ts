import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ResourceLineage } from './lineage.types';
import {
  ResourceLineageQuery,
  ResourceLineageResolution,
  ResourceLineageResolver,
} from './lineage-resolution.types';

@Injectable()
export class ResourceLineageResolverService
  implements ResourceLineageResolver
{
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    query: ResourceLineageQuery,
  ): Promise<ResourceLineageResolution> {
    const resolvedAt = new Date();
    const direction = query.direction ?? 'BOTH';

    const directionFilters = {
      INBOUND: {
        targetResourceType: query.resourceType,
        targetResourceId: query.resourceId,
      },
      OUTBOUND: {
        sourceResourceType: query.resourceType,
        sourceResourceId: query.resourceId,
      },
    };

    const resourceFilter =
      direction === 'BOTH'
        ? { OR: [directionFilters.INBOUND, directionFilters.OUTBOUND] }
        : directionFilters[direction];

    const where = {
      ...resourceFilter,
      ...(query.from || query.to
        ? {
            effectiveAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const lineages = await this.prisma.resourceLineage.findMany({
      where,
      orderBy: [
        { effectiveAt: 'asc' },
        { id: 'asc' },
      ],
    });

    return {
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      lineages: lineages.map((lineage) =>
        this.toDomainLineage(lineage),
      ),
      resolvedAt,
    };
  }

  private toDomainLineage(lineage: any): ResourceLineage {
    return {
      sourceResourceType: lineage.sourceResourceType,
      sourceResourceId: lineage.sourceResourceId,
      targetResourceType: lineage.targetResourceType,
      targetResourceId: lineage.targetResourceId,
      lineageType: lineage.lineageType,
      movementId: lineage.movementId ?? undefined,
      quantity: lineage.quantity ?? undefined,
      unit: lineage.unit ?? undefined,
      effectiveAt: lineage.effectiveAt,
      reason: lineage.reason ?? undefined,
      metadata: lineage.metadata,
      createdBy: lineage.createdBy,
      updatedBy: lineage.updatedBy,
    };
  }
}

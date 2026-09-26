import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ResourceMovement } from './movement.types';
import {
  ResourceMovementQuery,
  ResourceMovementResolution,
  ResourceMovementResolver,
} from './movement-resolution.types';

@Injectable()
export class ResourceMovementResolverService
  implements ResourceMovementResolver
{
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    query: ResourceMovementQuery,
  ): Promise<ResourceMovementResolution> {
    const resolvedAt = new Date();

    const movements = await this.prisma.resourceMovement.findMany({
      where: {
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        ...(query.from || query.to
          ? {
              effectiveAt: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [
        { effectiveAt: 'asc' },
        { recordedAt: 'asc' },
        { id: 'asc' },
      ],
    });

    return {
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      movements: movements.map((movement) =>
        this.toDomainMovement(movement),
      ),
      resolvedAt,
    };
  }

  private toDomainMovement(movement: any): ResourceMovement {
    return {
      resourceType: movement.resourceType,
      resourceId: movement.resourceId,
      movementType: movement.movementType,
      sourceUserId: movement.sourceUserId ?? undefined,
      destinationUserId: movement.destinationUserId ?? undefined,
      sourceResourceType: movement.sourceResourceType ?? undefined,
      sourceResourceId: movement.sourceResourceId ?? undefined,
      destinationResourceType:
        movement.destinationResourceType ?? undefined,
      destinationResourceId:
        movement.destinationResourceId ?? undefined,
      sourceRelationshipId: movement.sourceRelationshipId ?? undefined,
      destinationRelationshipId:
        movement.destinationRelationshipId ?? undefined,
      previousMovementId: movement.previousMovementId ?? undefined,
      quantity: movement.quantity ?? undefined,
      unit: movement.unit ?? undefined,
      effectiveAt: movement.effectiveAt,
      recordedAt: movement.recordedAt,
      reason: movement.reason ?? undefined,
      transactionId: movement.transactionId ?? undefined,
      evidenceId: movement.evidenceId ?? undefined,
      metadata: movement.metadata ?? undefined,
      createdBy: movement.createdBy,
      updatedBy: movement.updatedBy,
    };
  }
}

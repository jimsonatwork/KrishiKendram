import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from './relationship.types';

const RELATIONSHIP_HORIZON_YEARS = 1000;

@Injectable()
export class ResourceRelationshipService {
  createOwnerRelationship(
    tx: Prisma.TransactionClient,
    resourceType: string,
    resourceId: string,
    userId: string,
    effectiveAt: Date,
  ) {
    return tx.resourceRelationship.create({
      data: {
        resourceType,
        resourceId,
        userId,
        relationshipType: ResourceRelationshipType.OWNER,
        status: ResourceRelationshipStatus.ACTIVE,
        validFrom: effectiveAt,
        validUntil: this.defaultValidUntil(effectiveAt),
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  terminateResourceRelationships(
    tx: Prisma.TransactionClient,
    resourceType: string,
    resourceId: string,
    endedAt: Date,
    endedReason: string,
  ) {
    return tx.resourceRelationship.updateMany({
      where: {
        resourceType,
        resourceId,
        endedAt: null,
      },
      data: {
        status: ResourceRelationshipStatus.TERMINATED,
        endedAt,
        validUntil: endedAt,
        endedReason,
      },
    });
  }

  private defaultValidUntil(from: Date): Date {
    const until = new Date(from);
    until.setFullYear(until.getFullYear() + RELATIONSHIP_HORIZON_YEARS);
    return until;
  }
}

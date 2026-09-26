import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ResourceRelationship,
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from './relationship.types';

const RELATIONSHIP_HORIZON_YEARS = 1000;

@Injectable()
export class ResourceRelationshipService {
  constructor(private readonly prisma: PrismaService) {}

  async listResourceRelationshipHistory(
    resourceType: string,
    resourceId: string,
  ): Promise<ResourceRelationship[]> {
    const relationships = await this.prisma.resourceRelationship.findMany({
      where: { resourceType, resourceId },
      orderBy: [{ validFrom: 'asc' }, { id: 'asc' }],
    });

    return relationships.map((relationship) => ({
      resourceType: relationship.resourceType,
      resourceId: relationship.resourceId,
      userId: relationship.userId,
      relationshipType: this.toDomainRelationshipType(relationship.relationshipType),
      status: this.toDomainRelationshipStatus(relationship.status),
      validFrom: relationship.validFrom,
      validUntil: relationship.validUntil ?? undefined,
      endedAt: relationship.endedAt ?? undefined,
      endedReason: relationship.endedReason ?? undefined,
      createdBy: relationship.createdBy,
      updatedBy: relationship.updatedBy,
    }));
  }

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

  private toDomainRelationshipType(value: string): ResourceRelationshipType {
    const relationshipType = Object.values(ResourceRelationshipType).find(
      (candidate) => candidate === value,
    );

    if (!relationshipType) {
      throw new Error(`Unknown resource relationship type: ${value}`);
    }

    return relationshipType;
  }

  private toDomainRelationshipStatus(value: string): ResourceRelationshipStatus {
    const status = Object.values(ResourceRelationshipStatus).find(
      (candidate) => candidate === value,
    );

    if (!status) {
      throw new Error(`Unknown resource relationship status: ${value}`);
    }

    return status;
  }

  private defaultValidUntil(from: Date): Date {
    const until = new Date(from);
    until.setFullYear(until.getFullYear() + RELATIONSHIP_HORIZON_YEARS);
    return until;
  }
}

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ResourceRelationship,
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from './relationship.types';
import {
  ResourceRelationshipQuery,
  ResourceRelationshipResolution,
  ResourceRelationshipResolver,
} from './relationship-resolution.types';

@Injectable()
export class ResourceRelationshipResolverService implements ResourceRelationshipResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    query: ResourceRelationshipQuery,
  ): Promise<ResourceRelationshipResolution> {
    const at = query.at ?? new Date();

    const relationships = await this.prisma.resourceRelationship.findMany({
      where: {
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        userId: query.userId,
        validFrom: {
          lte: at,
        },
        AND: [
          {
            OR: [
              {
                validUntil: null,
              },
              {
                validUntil: {
                  gte: at,
                },
              },
            ],
          },
          {
            OR: [
              {
                endedAt: null,
              },
              {
                endedAt: {
                  gte: at,
                },
              },
            ],
          },
        ],
      },
      orderBy: [
        {
          validFrom: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    return {
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      userId: query.userId,
      relationships: relationships.map((relationship) =>
        this.toDomainRelationship(relationship),
      ),
      resolvedAt: at,
    };
  }

  private toDomainRelationship(relationship: {
    resourceType: string;
    resourceId: string;
    userId: string;
    relationshipType: string;
    status: string;
    validFrom: Date;
    validUntil: Date | null;
    endedAt: Date | null;
    endedReason: string | null;
    createdBy: string;
    updatedBy: string;
  }): ResourceRelationship {
    return {
      resourceType: relationship.resourceType,
      resourceId: relationship.resourceId,
      userId: relationship.userId,
      relationshipType: this.toDomainRelationshipType(
        relationship.relationshipType,
      ),
      status: this.toDomainRelationshipStatus(relationship.status),
      validFrom: relationship.validFrom,
      validUntil: relationship.validUntil ?? undefined,
      endedAt: relationship.endedAt ?? undefined,
      endedReason: relationship.endedReason ?? undefined,
      createdBy: relationship.createdBy,
      updatedBy: relationship.updatedBy,
    };
  }

  private toDomainRelationshipType(value: string): ResourceRelationshipType {
    const relationshipType = Object.values(ResourceRelationshipType).find(
      (candidate) => candidate === value,
    );

    if (!relationshipType) {
      throw new Error(
        `Unknown resource relationship type returned by persistence: ${value}`,
      );
    }

    return relationshipType;
  }

  private toDomainRelationshipStatus(
    value: string,
  ): ResourceRelationshipStatus {
    const status = Object.values(ResourceRelationshipStatus).find(
      (candidate) => candidate === value,
    );

    if (!status) {
      throw new Error(
        `Unknown resource relationship status returned by persistence: ${value}`,
      );
    }

    return status;
  }
}

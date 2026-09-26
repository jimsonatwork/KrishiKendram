import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ResourceMovementType } from './movement.types';
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

  async transferOwnerRelationship(
    tx: Prisma.TransactionClient,
    resourceType: string,
    resourceId: string,
    sourceUserId: string,
    destinationUserId: string,
    effectiveAt: Date,
    reason: string | undefined,
    transactionId: string | undefined,
    evidenceInput?: {
      referenceType: string;
      referenceValue: string;
      documentNumber?: string;
      issuer?: string;
    },
  ) {
    const current = await tx.resourceRelationship.findFirst({
      where: {
        resourceType,
        resourceId,
        userId: sourceUserId,
        relationshipType: ResourceRelationshipType.OWNER,
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });

    if (!current) {
      throw new Error(
        'Active owner relationship not found for transfer.',
      );
    }

    if (evidenceInput) {
      const evidence = await tx.resourceEvidence.create({
        data: {
          evidenceType: transactionId
            ? 'TRANSACTION'
            : 'DOCUMENT',
          referenceType: evidenceInput.referenceType,
          referenceValue: evidenceInput.referenceValue,
          documentNumber: evidenceInput.documentNumber,
          issuer: evidenceInput.issuer,
          createdBy: sourceUserId,
          updatedBy: sourceUserId,
        },
      });

      await tx.resourceRelationship.update({
        where: { id: current.id },
        data: {
          status: ResourceRelationshipStatus.TRANSFERRED,
          endedAt: effectiveAt,
          validUntil: effectiveAt,
          endedReason: reason ?? 'Ownership transferred',
          evidenceId: evidence.id,
        },
      });

      const destinationRelationship =
        await tx.resourceRelationship.create({
          data: {
            resourceType,
            resourceId,
            userId: destinationUserId,
            relationshipType: ResourceRelationshipType.OWNER,
            status: ResourceRelationshipStatus.ACTIVE,
            validFrom: effectiveAt,
            validUntil: this.defaultValidUntil(effectiveAt),
            createdBy: sourceUserId,
            updatedBy: sourceUserId,
            evidenceId: evidence.id,
          },
        });

      const previousMovement = await tx.resourceMovement.findFirst({
        where: { resourceType, resourceId },
        orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
      });

      const movement = await tx.resourceMovement.create({
        data: {
          resourceType,
          resourceId,
          movementType: ResourceMovementType.TRANSFER,
          sourceUserId,
          destinationUserId,
          sourceRelationshipId: current.id,
          destinationRelationshipId: destinationRelationship.id,
          previousMovementId: previousMovement?.id,
          effectiveAt,
          reason: reason ?? 'Ownership transferred',
          transactionId,
          evidenceId: evidence.id,
          createdBy: sourceUserId,
          updatedBy: sourceUserId,
        },
      });

      return { previousRelationship: current, destinationRelationship, movement, evidence };
    }

    await tx.resourceRelationship.update({
      where: { id: current.id },
      data: {
        status: ResourceRelationshipStatus.TRANSFERRED,
        endedAt: effectiveAt,
        validUntil: effectiveAt,
        endedReason: reason ?? 'Ownership transferred',
      },
    });

    const destinationRelationship =
      await tx.resourceRelationship.create({
        data: {
          resourceType,
          resourceId,
          userId: destinationUserId,
          relationshipType: ResourceRelationshipType.OWNER,
          status: ResourceRelationshipStatus.ACTIVE,
          validFrom: effectiveAt,
          validUntil: this.defaultValidUntil(effectiveAt),
          createdBy: sourceUserId,
          updatedBy: sourceUserId,
        },
      });

    const previousMovement = await tx.resourceMovement.findFirst({
      where: { resourceType, resourceId },
      orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
    });

    const movement = await tx.resourceMovement.create({
      data: {
        resourceType,
        resourceId,
        movementType: ResourceMovementType.TRANSFER,
        sourceUserId,
        destinationUserId,
        sourceRelationshipId: current.id,
        destinationRelationshipId: destinationRelationship.id,
        previousMovementId: previousMovement?.id,
        effectiveAt,
        reason: reason ?? 'Ownership transferred',
        transactionId,
        createdBy: sourceUserId,
        updatedBy: sourceUserId,
      },
    });

    return { previousRelationship: current, destinationRelationship, movement };
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

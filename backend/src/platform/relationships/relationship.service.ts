import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
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
    existingEvidenceId?: string,
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

    if (effectiveAt < current.validFrom) {
      throw new ConflictException('Transfer effective date cannot precede the active ownership start date.');
    }

    const destinationCurrent = await tx.resourceRelationship.findFirst({
      where: {
        resourceType,
        resourceId,
        userId: destinationUserId,
        relationshipType: ResourceRelationshipType.OWNER,
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });

    if (destinationCurrent) {
      throw new ConflictException('Destination user is already the active owner.');
    }

    const previousMovement = await tx.resourceMovement.findFirst({
      where: { resourceType, resourceId },
      orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
    });
    if (previousMovement && effectiveAt < previousMovement.effectiveAt) {
      throw new ConflictException('Transfer effective date cannot precede the latest movement.');
    }

    if (evidenceInput || existingEvidenceId) {
      const evidence = existingEvidenceId
        ? await tx.resourceEvidence.findUnique({ where: { id: existingEvidenceId } })
        : await tx.resourceEvidence.create({
        data: {
          evidenceType: transactionId
            ? 'TRANSACTION'
            : 'DOCUMENT',
          referenceType: evidenceInput!.referenceType,
          referenceValue: evidenceInput!.referenceValue,
          documentNumber: evidenceInput!.documentNumber,
          issuer: evidenceInput!.issuer,
          createdBy: sourceUserId,
          updatedBy: sourceUserId,
        },
      });

      if (!evidence) throw new ConflictException('Transfer evidence not found.');

      const ended = await tx.resourceRelationship.updateMany({
        where: { id: current.id, endedAt: null },
        data: {
          status: ResourceRelationshipStatus.TRANSFERRED,
          endedAt: effectiveAt,
          validUntil: effectiveAt,
          endedReason: reason ?? 'Ownership transferred',
          evidenceId: evidence.id,
        },
      });
      if (ended.count !== 1) throw new ConflictException('Active owner relationship is no longer available for transfer.');

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

    const ended = await tx.resourceRelationship.updateMany({
      where: { id: current.id, endedAt: null },
      data: {
        status: ResourceRelationshipStatus.TRANSFERRED,
        endedAt: effectiveAt,
        validUntil: effectiveAt,
        endedReason: reason ?? 'Ownership transferred',
      },
    });
    if (ended.count !== 1) throw new ConflictException('Active owner relationship is no longer available for transfer.');

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

  async assignCustodian(
    tx: Prisma.TransactionClient,
    resourceType: string,
    resourceId: string,
    destinationUserId: string,
    effectiveAt: Date,
    actorUserId: string,
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
        relationshipType: ResourceRelationshipType.CUSTODIAN,
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });

    if (current?.userId === destinationUserId) {
      throw new ConflictException('Destination user is already the active custodian.');
    }

    if (current && effectiveAt < current.validFrom) {
      throw new ConflictException('Custody change cannot precede custody start.');
    }

    const evidence = evidenceInput
      ? await tx.resourceEvidence.create({
          data: {
            evidenceType: transactionId ? 'TRANSACTION' : 'DOCUMENT',
            referenceType: evidenceInput.referenceType,
            referenceValue: evidenceInput.referenceValue,
            documentNumber: evidenceInput.documentNumber,
            issuer: evidenceInput.issuer,
            createdBy: actorUserId,
            updatedBy: actorUserId,
          },
        })
      : undefined;

    if (current) {
      await tx.resourceRelationship.update({
        where: { id: current.id },
        data: {
          status: ResourceRelationshipStatus.TERMINATED,
          endedAt: effectiveAt,
          validUntil: effectiveAt,
          endedReason: reason ?? 'Custodian changed',
          evidenceId: evidence?.id,
        },
      });
    }

    const destinationRelationship = await tx.resourceRelationship.create({
      data: {
        resourceType,
        resourceId,
        userId: destinationUserId,
        relationshipType: ResourceRelationshipType.CUSTODIAN,
        status: ResourceRelationshipStatus.ACTIVE,
        validFrom: effectiveAt,
        validUntil: this.defaultValidUntil(effectiveAt),
        createdBy: actorUserId,
        updatedBy: actorUserId,
        evidenceId: evidence?.id,
      },
    });

    const previousMovement = await tx.resourceMovement.findFirst({
      where: { resourceType, resourceId },
      orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
    });
    if (previousMovement && effectiveAt < previousMovement.effectiveAt) {
      throw new ConflictException('Relationship movement effective date cannot precede the latest movement.');
    }

    const movement = await tx.resourceMovement.create({
      data: {
        resourceType,
        resourceId,
        movementType: ResourceMovementType.CUSTODY_CHANGE,
        sourceUserId: current?.userId,
        destinationUserId,
        sourceRelationshipId: current?.id,
        destinationRelationshipId: destinationRelationship.id,
        previousMovementId: previousMovement?.id,
        effectiveAt,
        reason: reason ?? 'Custodian assigned',
        transactionId,
        evidenceId: evidence?.id,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    return { previousRelationship: current, destinationRelationship, movement, evidence };
  }

  async returnCustodian(
    tx: Prisma.TransactionClient,
    resourceType: string,
    resourceId: string,
    ownerUserId: string,
    effectiveAt: Date,
    actorUserId: string,
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
        relationshipType: ResourceRelationshipType.CUSTODIAN,
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });

    if (!current) {
      throw new ConflictException('Active custodian not found.');
    }

    if (effectiveAt < current.validFrom) {
      throw new ConflictException('Custody return cannot precede custody start.');
    }

    const owner = await tx.resourceRelationship.findFirst({
      where: {
        resourceType,
        resourceId,
        relationshipType: ResourceRelationshipType.OWNER,
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });

    const evidence = evidenceInput
      ? await tx.resourceEvidence.create({
          data: {
            evidenceType: transactionId ? 'TRANSACTION' : 'DOCUMENT',
            referenceType: evidenceInput.referenceType,
            referenceValue: evidenceInput.referenceValue,
            documentNumber: evidenceInput.documentNumber,
            issuer: evidenceInput.issuer,
            createdBy: actorUserId,
            updatedBy: actorUserId,
          },
        })
      : undefined;

    const ended = await tx.resourceRelationship.update({
      where: { id: current.id },
      data: {
        status: ResourceRelationshipStatus.TERMINATED,
        endedAt: effectiveAt,
        validUntil: effectiveAt,
        endedReason: reason ?? 'Custody returned to owner',
        evidenceId: evidence?.id,
        updatedBy: actorUserId,
      },
    });

    const previousMovement = await tx.resourceMovement.findFirst({
      where: { resourceType, resourceId },
      orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
    });
    if (previousMovement && effectiveAt < previousMovement.effectiveAt) {
      throw new ConflictException('Relationship movement effective date cannot precede the latest movement.');
    }

    const movement = await tx.resourceMovement.create({
      data: {
        resourceType,
        resourceId,
        movementType: ResourceMovementType.RETURN,
        sourceUserId: current.userId,
        destinationUserId: owner?.userId ?? ownerUserId,
        sourceRelationshipId: current.id,
        destinationRelationshipId: owner?.id,
        previousMovementId: previousMovement?.id,
        effectiveAt,
        reason: reason ?? 'Custody returned to owner',
        transactionId,
        evidenceId: evidence?.id,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    return { relationship: ended, owner, movement, evidence };
  }

  async assignLessee(
    tx: Prisma.TransactionClient,
    resourceType: string,
    resourceId: string,
    destinationUserId: string,
    effectiveAt: Date,
    validUntil: Date,
    actorUserId: string,
    reason: string | undefined,
    transactionId: string | undefined,
    evidenceInput?: {
      referenceType: string;
      referenceValue: string;
      documentNumber?: string;
      issuer?: string;
    },
  ) {
    if (validUntil <= effectiveAt) {
      throw new ConflictException('Lease validUntil must be after effectiveAt.');
    }

    const current = await tx.resourceRelationship.findFirst({
      where: {
        resourceType,
        resourceId,
        relationshipType: ResourceRelationshipType.LESSEE,
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });

    if (current && effectiveAt < current.validFrom) {
      throw new ConflictException('Lease replacement cannot precede lease start.');
    }

    const evidence = evidenceInput
      ? await tx.resourceEvidence.create({
          data: {
            evidenceType: transactionId ? 'TRANSACTION' : 'DOCUMENT',
            referenceType: evidenceInput.referenceType,
            referenceValue: evidenceInput.referenceValue,
            documentNumber: evidenceInput.documentNumber,
            issuer: evidenceInput.issuer,
            createdBy: actorUserId,
            updatedBy: actorUserId,
          },
        })
      : undefined;

    if (current) {
      await tx.resourceRelationship.update({
        where: { id: current.id },
        data: {
          status: ResourceRelationshipStatus.TERMINATED,
          endedAt: effectiveAt,
          validUntil: effectiveAt,
          endedReason: reason ?? 'Lease replaced',
          evidenceId: evidence?.id,
        },
      });
    }

    const destinationRelationship = await tx.resourceRelationship.create({
      data: {
        resourceType,
        resourceId,
        userId: destinationUserId,
        relationshipType: ResourceRelationshipType.LESSEE,
        status: ResourceRelationshipStatus.ACTIVE,
        validFrom: effectiveAt,
        validUntil,
        createdBy: actorUserId,
        updatedBy: actorUserId,
        evidenceId: evidence?.id,
      },
    });

    const previousMovement = await tx.resourceMovement.findFirst({
      where: { resourceType, resourceId },
      orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
    });
    if (previousMovement && effectiveAt < previousMovement.effectiveAt) {
      throw new ConflictException('Relationship movement effective date cannot precede the latest movement.');
    }

    const movement = await tx.resourceMovement.create({
      data: {
        resourceType,
        resourceId,
        movementType: ResourceMovementType.LEASE,
        sourceUserId: current?.userId,
        destinationUserId,
        sourceRelationshipId: current?.id,
        destinationRelationshipId: destinationRelationship.id,
        previousMovementId: previousMovement?.id,
        effectiveAt,
        reason: reason ?? 'Asset leased',
        transactionId,
        evidenceId: evidence?.id,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    return { previousRelationship: current, destinationRelationship, movement, evidence };
  }

  async endLease(
    tx: Prisma.TransactionClient,
    resourceType: string,
    resourceId: string,
    actorUserId: string,
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
        relationshipType: ResourceRelationshipType.LESSEE,
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });

    if (!current) {
      throw new ConflictException('Active lease not found.');
    }

    if (effectiveAt < current.validFrom) {
      throw new ConflictException('Lease end cannot precede lease start.');
    }

    const evidence = evidenceInput
      ? await tx.resourceEvidence.create({
          data: {
            evidenceType: transactionId ? 'TRANSACTION' : 'DOCUMENT',
            referenceType: evidenceInput.referenceType,
            referenceValue: evidenceInput.referenceValue,
            documentNumber: evidenceInput.documentNumber,
            issuer: evidenceInput.issuer,
            createdBy: actorUserId,
            updatedBy: actorUserId,
          },
        })
      : undefined;

    const ended = await tx.resourceRelationship.update({
      where: { id: current.id },
      data: {
        status: ResourceRelationshipStatus.TERMINATED,
        endedAt: effectiveAt,
        validUntil: effectiveAt,
        endedReason: reason ?? 'Lease ended',
        evidenceId: evidence?.id,
        updatedBy: actorUserId,
      },
    });

    const previousMovement = await tx.resourceMovement.findFirst({
      where: { resourceType, resourceId },
      orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
    });
    if (previousMovement && effectiveAt < previousMovement.effectiveAt) {
      throw new ConflictException('Relationship movement effective date cannot precede the latest movement.');
    }

    const movement = await tx.resourceMovement.create({
      data: {
        resourceType,
        resourceId,
        movementType: ResourceMovementType.LEASE_END,
        sourceUserId: current.userId,
        sourceRelationshipId: current.id,
        previousMovementId: previousMovement?.id,
        effectiveAt,
        reason: reason ?? 'Lease ended',
        transactionId,
        evidenceId: evidence?.id,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    return { relationship: ended, movement, evidence };
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

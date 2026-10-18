import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { ResourceRelationshipService } from '../platform/relationships/relationship.service';
import { ResourceMovementType } from '../platform/relationships/movement.types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../platform/audit/audit.service';
import { assertFarmActive } from './farm-asset-active.guard';

import { TransferResourceDto } from './dto/transfer-resource.dto';

@Injectable()
export class FarmAssetCustodyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly relationships: ResourceRelationshipService,
    private readonly audit: AuditService,
  ) {}

  async returnCustody(
    farmId: string,
    assetId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        farmId: true,
        createdAt: true,
        farm: { select: { ownerId: true, deletedAt: true } },
      },
    });

    if (!asset || asset.farmId !== farmId || asset.farm.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    const owner = await this.prisma.resourceRelationship.findFirst({
      where: {
        resourceType: 'farmAsset',
        resourceId: assetId,
        relationshipType: 'OWNER',
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { userId: true },
    });

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.ASSIGN,
      resourceId: assetId,
      farmId,
      ownerId: owner?.userId ?? asset.farm.ownerId,
    });

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : new Date();
    if (Number.isNaN(effectiveAt.getTime()) || effectiveAt < asset.createdAt) {
      throw new BadRequestException('Custody return effectiveAt is invalid.');
    }

    const hasEvidenceType = Boolean(dto.evidenceReferenceType);
    const hasEvidenceValue = Boolean(dto.evidenceReferenceValue);
    if (hasEvidenceType !== hasEvidenceValue) {
      throw new BadRequestException(
        'Evidence reference type and value must be supplied together.',
      );
    }

    const evidenceInput = hasEvidenceType
      ? {
          referenceType: dto.evidenceReferenceType as string,
          referenceValue: dto.evidenceReferenceValue as string,
          documentNumber: dto.evidenceDocumentNumber,
          issuer: dto.evidenceIssuer,
        }
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      await assertFarmActive(tx, farmId);
      const result = await this.relationships.returnCustodian(
        tx,
        'farmAsset',
        assetId,
        owner?.userId ?? asset.farm.ownerId,
        effectiveAt,
        userId,
        dto.reason,
        dto.transactionId,
        evidenceInput,
      );

      await this.audit.createInTransaction(tx, {
        actorId: userId,
        action: 'FARM_ASSET_CUSTODY_RETURNED',
        resourceType: 'farmAsset',
        resourceId: assetId,
        description: 'Farm asset custody returned',
        metadata: { farmId, ownerId: result.owner?.userId, movementId: result.movement.id },
      });

      return {
        resourceType: 'farmAsset',
        resourceId: assetId,
        movementType: ResourceMovementType.RETURN,
        previousCustodian: result.relationship.userId,
        owner: result.owner?.userId,
        movement: result.movement,
        evidence: result.evidence,
      };
    });
  }

  async assignCustodian(
    farmId: string,
    assetId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        farmId: true,
        createdAt: true,
        farm: { select: { ownerId: true, deletedAt: true } },
      },
    });

    if (!asset || asset.farmId !== farmId || asset.farm.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    const owner = await this.prisma.resourceRelationship.findFirst({
      where: {
        resourceType: 'farmAsset',
        resourceId: assetId,
        relationshipType: 'OWNER',
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { userId: true, validFrom: true },
    });

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.ASSIGN,
      resourceId: assetId,
      farmId,
      ownerId: owner?.userId ?? asset.farm.ownerId,
    });

    if (dto.destinationUserId === userId) {
      throw new BadRequestException('Custodian cannot be the acting owner by default.');
    }

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : new Date();
    if (Number.isNaN(effectiveAt.getTime()) || effectiveAt < asset.createdAt) {
      throw new BadRequestException('Custody effectiveAt is invalid.');
    }

    const hasEvidenceType = Boolean(dto.evidenceReferenceType);
    const hasEvidenceValue = Boolean(dto.evidenceReferenceValue);
    if (hasEvidenceType !== hasEvidenceValue) {
      throw new BadRequestException(
        'Evidence reference type and value must be supplied together.',
      );
    }

    const evidenceInput = hasEvidenceType
      ? {
          referenceType: dto.evidenceReferenceType as string,
          referenceValue: dto.evidenceReferenceValue as string,
          documentNumber: dto.evidenceDocumentNumber,
          issuer: dto.evidenceIssuer,
        }
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      await assertFarmActive(tx, farmId);
      const destination = await tx.user.findUnique({
        where: { id: dto.destinationUserId },
        select: { id: true, status: true },
      });

      if (!destination || destination.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Destination custodian is not active.');
      }

      const result = await this.relationships.assignCustodian(
        tx,
        'farmAsset',
        assetId,
        dto.destinationUserId,
        effectiveAt,
        userId,
        dto.reason,
        dto.transactionId,
        evidenceInput,
      );

      await this.audit.createInTransaction(tx, {
        actorId: userId,
        action: 'FARM_ASSET_CUSTODY_ASSIGNED',
        resourceType: 'farmAsset',
        resourceId: assetId,
        description: 'Farm asset custody assigned',
        metadata: {
          farmId,
          previousCustodianId: result.previousRelationship?.userId,
          custodianId: result.destinationRelationship.userId,
          movementId: result.movement.id,
        },
      });

      return {
        resourceType: 'farmAsset',
        resourceId: assetId,
        movementType: ResourceMovementType.CUSTODY_CHANGE,
        previousCustodian: result.previousRelationship?.userId,
        custodian: result.destinationRelationship.userId,
        movement: result.movement,
        evidence: result.evidence,
      };
    });
  }
}

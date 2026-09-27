import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { ResourceMovementType } from '../platform/relationships/movement.types';
import { ResourceRelationshipService } from '../platform/relationships/relationship.service';
import { PrismaService } from '../prisma/prisma.service';

import { TransferResourceDto } from './dto/transfer-resource.dto';

@Injectable()
export class FarmAssetLeaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly relationships: ResourceRelationshipService,
  ) {}

  async leaseAsset(
    farmId: string,
    assetId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: { id: true, farmId: true, createdAt: true, farm: { select: { ownerId: true } } },
    });
    if (!asset || asset.farmId !== farmId) throw new NotFoundException('Asset not found');

    const owner = await this.prisma.resourceRelationship.findFirst({
      where: { resourceType: 'farmAsset', resourceId: assetId, relationshipType: 'OWNER', endedAt: null },
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
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : undefined;
    if (!validUntil || Number.isNaN(validUntil.getTime()) || validUntil <= effectiveAt) {
      throw new BadRequestException('Lease validUntil must be after effectiveAt.');
    }
    if (effectiveAt < asset.createdAt) throw new BadRequestException('Lease effectiveAt is invalid.');

    const evidenceType = Boolean(dto.evidenceReferenceType);
    const evidenceValue = Boolean(dto.evidenceReferenceValue);
    if (evidenceType !== evidenceValue) {
      throw new BadRequestException('Evidence reference type and value must be supplied together.');
    }

    const evidenceInput = evidenceType
      ? { referenceType: dto.evidenceReferenceType!, referenceValue: dto.evidenceReferenceValue!, documentNumber: dto.evidenceDocumentNumber, issuer: dto.evidenceIssuer }
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      const destination = await tx.user.findUnique({ where: { id: dto.destinationUserId }, select: { id: true, status: true } });
      if (!destination || destination.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Destination lessee is not active.');
      }
      const result = await this.relationships.assignLessee(
        tx, 'farmAsset', assetId, dto.destinationUserId, effectiveAt, validUntil,
        userId, dto.reason, dto.transactionId, evidenceInput,
      );
      return {
        resourceType: 'farmAsset',
        resourceId: assetId,
        movementType: ResourceMovementType.LEASE,
        lessee: result.destinationRelationship.userId,
        validFrom: result.destinationRelationship.validFrom,
        validUntil: result.destinationRelationship.validUntil,
        previousLessee: result.previousRelationship?.userId,
        movement: result.movement,
        evidence: result.evidence,
      };
    });
  }

  async endLease(
    farmId: string,
    assetId: string,
    dto: import('./dto/end-resource-lease.dto').EndResourceLeaseDto,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: { id: true, farmId: true, createdAt: true, farm: { select: { ownerId: true } } },
    });
    if (!asset || asset.farmId !== farmId) throw new NotFoundException('Asset not found');

    const owner = await this.prisma.resourceRelationship.findFirst({
      where: { resourceType: 'farmAsset', resourceId: assetId, relationshipType: 'OWNER', endedAt: null },
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
      throw new BadRequestException('Lease end effectiveAt is invalid.');
    }

    const evidenceType = Boolean(dto.evidenceReferenceType);
    const evidenceValue = Boolean(dto.evidenceReferenceValue);
    if (evidenceType !== evidenceValue) {
      throw new BadRequestException('Evidence reference type and value must be supplied together.');
    }

    const evidenceInput = evidenceType
      ? { referenceType: dto.evidenceReferenceType!, referenceValue: dto.evidenceReferenceValue!, documentNumber: dto.evidenceDocumentNumber, issuer: dto.evidenceIssuer }
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      const result = await this.relationships.endLease(
        tx, 'farmAsset', assetId, userId, effectiveAt,
        dto.reason, dto.transactionId, evidenceInput,
      );
      return {
        resourceType: 'farmAsset',
        resourceId: assetId,
        movementType: ResourceMovementType.LEASE_END,
        lessee: result.relationship.userId,
        endedAt: result.relationship.endedAt,
        movement: result.movement,
        evidence: result.evidence,
      };
    });
  }
}

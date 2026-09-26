import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { ResourceRelationshipService } from '../platform/relationships/relationship.service';
import { RESOURCE_MOVEMENT_RESOLVER } from '../platform/relationships/movement-resolution.types';
import type { ResourceMovementResolver } from '../platform/relationships/movement-resolution.types';
import { RESOURCE_EVIDENCE_RESOLVER } from '../platform/relationships/evidence-resolution.types';
import type { ResourceEvidenceResolver } from '../platform/relationships/evidence-resolution.types';
import { PrismaService } from '../prisma/prisma.service';

import { TransferResourceDto } from './dto/transfer-resource.dto';

@Injectable()
export class FarmResourceLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly relationships: ResourceRelationshipService,
    @Inject(RESOURCE_MOVEMENT_RESOLVER)
    private readonly movementResolver: ResourceMovementResolver,
    @Inject(RESOURCE_EVIDENCE_RESOLVER)
    private readonly evidenceResolver: ResourceEvidenceResolver,
  ) {}

  async getFarmMovementHistory(
    farmId: string,
    userId: string,
    role: UserRole,
  ) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { ownerId: true },
    });
    if (!farm) throw new NotFoundException('Farm not found');

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.READ,
      resourceId: farmId,
      ownerId: farm.ownerId,
    });
    return this.movementResolver.resolve({
      resourceType: 'farm',
      resourceId: farmId,
    });
  }

  async getFarmEvidenceHistory(
    farmId: string,
    userId: string,
    role: UserRole,
  ) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { ownerId: true },
    });
    if (!farm) throw new NotFoundException('Farm not found');

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.READ,
      resourceId: farmId,
      ownerId: farm.ownerId,
    });
    return this.evidenceResolver.resolve({
      resourceType: 'farm',
      resourceId: farmId,
    });
  }

  async getFarmAssetMovementHistory(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: { farmId: true, farm: { select: { ownerId: true } } },
    });
    if (!asset || asset.farmId !== farmId) {
      throw new NotFoundException('Asset not found');
    }

    const relationship = await this.prisma.resourceRelationship.findFirst({
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
      action: AuthorizationAction.READ,
      resourceId: assetId,
      farmId,
      ownerId: relationship?.userId ?? asset.farm.ownerId,
    });
    return this.movementResolver.resolve({
      resourceType: 'farmAsset',
      resourceId: assetId,
    });
  }

  async getFarmAssetEvidenceHistory(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: { farmId: true, farm: { select: { ownerId: true } } },
    });
    if (!asset || asset.farmId !== farmId) {
      throw new NotFoundException('Asset not found');
    }

    const relationship = await this.prisma.resourceRelationship.findFirst({
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
      action: AuthorizationAction.READ,
      resourceId: assetId,
      farmId,
      ownerId: relationship?.userId ?? asset.farm.ownerId,
    });
    return this.evidenceResolver.resolve({
      resourceType: 'farmAsset',
      resourceId: assetId,
    });
  }

  async transferFarm(
    farmId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { id: true, ownerId: true, createdAt: true },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.UPDATE,
      resourceId: farmId,
      ownerId: farm.ownerId,
    });

    return this.transfer(
      'farm',
      farmId,
      farm.ownerId,
      dto,
      farm.createdAt,
      async (tx) =>
        tx.farm.update({
          where: { id: farmId },
          data: { ownerId: dto.destinationUserId },
        }),
    );
  }

  async transferFarmAsset(
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
        farm: { select: { id: true, ownerId: true } },
      },
    });

    if (!asset || asset.farmId !== farmId) {
      throw new NotFoundException('Asset not found');
    }

    const relationship =
      await this.prisma.resourceRelationship.findFirst({
        where: {
          resourceType: 'farmAsset',
          resourceId: assetId,
          relationshipType: 'OWNER',
          endedAt: null,
        },
        orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
        select: { userId: true, validFrom: true },
      });

    const ownerId = relationship?.userId ?? asset.farm.ownerId;

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.UPDATE,
      resourceId: assetId,
      farmId,
      ownerId,
    });

    return this.transfer(
      'farmAsset',
      assetId,
      ownerId,
      dto,
      relationship?.validFrom ?? new Date(0),
      async (tx) =>
        tx.farmAsset.findUnique({
          where: { id: assetId },
        }),
    );
  }

  private async transfer(
    resourceType: string,
    resourceId: string,
    sourceUserId: string,
    dto: TransferResourceDto,
    minimumEffectiveAt: Date,
    persistResource: (tx: any) => Promise<unknown>,
  ) {
    if (dto.destinationUserId === sourceUserId) {
      throw new BadRequestException(
        'Destination user already owns this resource.',
      );
    }

    const effectiveAt = dto.effectiveAt
      ? new Date(dto.effectiveAt)
      : new Date();

    if (
      Number.isNaN(effectiveAt.getTime()) ||
      effectiveAt < minimumEffectiveAt
    ) {
      throw new BadRequestException(
        'Transfer effectiveAt is invalid or precedes the current relationship start.',
      );
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
      const destination = await tx.user.findUnique({
        where: { id: dto.destinationUserId },
        select: { id: true, status: true },
      });

      if (!destination || destination.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Destination user is not active.');
      }

      const result = await this.relationships.transferOwnerRelationship(
        tx,
        resourceType,
        resourceId,
        sourceUserId,
        dto.destinationUserId,
        effectiveAt,
        dto.reason,
        dto.transactionId,
        evidenceInput,
      );

      const resource = await persistResource(tx);

      return {
        resource,
        movement: result.movement,
        evidence: result.evidence,
      };
    });
  }
}

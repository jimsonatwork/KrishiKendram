import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { ResourceRelationshipService } from '../platform/relationships/relationship.service';
import { ResourceLineageType } from '../platform/relationships/lineage.types';
import { RESOURCE_LINEAGE_RESOLVER } from '../platform/relationships/lineage-resolution.types';
import type { ResourceLineageResolver } from '../platform/relationships/lineage-resolution.types';
import { PrismaService } from '../prisma/prisma.service';

import { SplitFarmAssetDto } from './dto/split-farm-asset.dto';

@Injectable()
export class FarmResourceLineageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly relationships: ResourceRelationshipService,
    @Inject(RESOURCE_LINEAGE_RESOLVER)
    private readonly lineageResolver: ResourceLineageResolver,
  ) {}

  async getFarmAssetLineageHistory(
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

    return this.lineageResolver.resolve({
      resourceType: 'farmAsset',
      resourceId: assetId,
      direction: 'BOTH',
    });
  }

  async splitFarmAsset(
    farmId: string,
    assetId: string,
    dto: SplitFarmAssetDto,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        farmId: true,
        type: true,
        name: true,
        quantity: true,
        unit: true,
        metadata: true,
        farm: { select: { id: true, ownerId: true } },
      },
    });

    if (!asset || asset.farmId !== farmId) {
      throw new NotFoundException('Asset not found');
    }
    if (asset.quantity === null || asset.quantity === undefined) {
      throw new BadRequestException(
        'Only quantified farm assets can be split.',
      );
    }
    if (dto.quantity >= asset.quantity) {
      throw new BadRequestException(
        'Split quantity must be less than the source asset quantity.',
      );
    }

    const relationship = await this.prisma.resourceRelationship.findFirst({
      where: {
        resourceType: 'farmAsset',
        resourceId: assetId,
        relationshipType: 'OWNER',
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { userId: true, id: true },
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
    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.CREATE,
      farmId,
      ownerId: asset.farm.ownerId,
    });

    const effectiveAt = dto.effectiveAt
      ? new Date(dto.effectiveAt)
      : new Date();

    if (Number.isNaN(effectiveAt.getTime())) {
      throw new BadRequestException('Split effectiveAt is invalid.');
    }

    const remainingQuantity = asset.quantity - dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.farmAsset.create({
        data: {
          farmId,
          type: asset.type,
          name: dto.name ?? asset.name,
          quantity: dto.quantity,
          unit: asset.unit,
          metadata: (dto.metadata ?? asset.metadata) as any,
        },
      });

      await this.relationships.createOwnerRelationship(
        tx,
        'farmAsset',
        target.id,
        ownerId,
        effectiveAt,
      );

      const movement = await tx.resourceMovement.create({
        data: {
          resourceType: 'farmAsset',
          resourceId: target.id,
          movementType: 'SPLIT',
          sourceResourceType: 'farmAsset',
          sourceResourceId: asset.id,
          destinationResourceType: 'farmAsset',
          destinationResourceId: target.id,
          sourceRelationshipId: relationship?.id,
          quantity: dto.quantity,
          unit: asset.unit,
          effectiveAt,
          reason: dto.reason,
          metadata: { sourceRemainingQuantity: remainingQuantity },
          createdBy: userId,
          updatedBy: userId,
        },
      });

      const lineage = await tx.resourceLineage.create({
        data: {
          sourceResourceType: 'farmAsset',
          sourceResourceId: asset.id,
          targetResourceType: 'farmAsset',
          targetResourceId: target.id,
          lineageType: ResourceLineageType.SPLIT_FROM,
          movementId: movement.id,
          quantity: dto.quantity,
          unit: asset.unit,
          effectiveAt,
          reason: dto.reason,
          metadata: { sourceRemainingQuantity: remainingQuantity },
          createdBy: userId,
          updatedBy: userId,
        },
      });

      const source = await tx.farmAsset.update({
        where: { id: asset.id },
        data: { quantity: remainingQuantity },
      });

      return { source, target, movement, lineage };
    });
  }
}

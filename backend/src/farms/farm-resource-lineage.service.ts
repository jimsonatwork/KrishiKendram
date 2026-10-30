import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { ResourceRelationshipService } from '../platform/relationships/relationship.service';
import { ResourceLineageType } from '../platform/relationships/lineage.types';
import { ResourceMovementType } from '../platform/relationships/movement.types';
import { RESOURCE_LINEAGE_RESOLVER } from '../platform/relationships/lineage-resolution.types';
import { createResourceLineage, createResourceMovement } from '../platform/relationships/movement-integrity';
import type { ResourceLineageResolver } from '../platform/relationships/lineage-resolution.types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../platform/audit/audit.service';
import { assertFarmActive } from './farm-asset-active.guard';

import { SplitFarmAssetDto } from './dto/split-farm-asset.dto';
import { MergeFarmAssetsDto } from './dto/merge-farm-assets.dto';

@Injectable()
export class FarmResourceLineageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly relationships: ResourceRelationshipService,
    @Inject(RESOURCE_LINEAGE_RESOLVER)
    private readonly lineageResolver: ResourceLineageResolver,
    private readonly audit: AuditService,
  ) {}

  async getFarmAssetLineageHistory(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: { farmId: true, farm: { select: { ownerId: true, deletedAt: true } } },
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

  async mergeFarmAssets(
    farmId: string,
    dto: MergeFarmAssetsDto,
    userId: string,
    role: UserRole,
  ) {
    const sourceIds = [...new Set(dto.sourceAssetIds)];
    if (sourceIds.length < 2) {
      throw new BadRequestException('At least two distinct farm assets are required for a merge.');
    }

    const assets = await this.prisma.farmAsset.findMany({
      where: { id: { in: sourceIds }, farmId, deletedAt: null },
      select: {
        id: true,
        farmId: true,
        type: true,
        name: true,
        quantity: true,
        unit: true,
        metadata: true,
        farm: { select: { id: true, ownerId: true, deletedAt: true } },
      },
    });

    if (assets.length !== sourceIds.length || assets.some((asset) => asset.farm.deletedAt)) {
      throw new NotFoundException('One or more source assets were not found.');
    }

    const first = assets[0];
    if (assets.some((asset) => asset.quantity === null || asset.quantity === undefined || asset.quantity <= 0)) {
      throw new BadRequestException('Only positive quantified farm assets can be merged.');
    }
    if (assets.some((asset) => asset.type !== first.type || asset.unit !== first.unit)) {
      throw new BadRequestException('Farm assets must have the same type and unit to be merged.');
    }

    const relationships = await Promise.all(
      assets.map((asset) =>
        this.prisma.resourceRelationship.findFirst({
          where: {
            resourceType: 'farmAsset',
            resourceId: asset.id,
            relationshipType: 'OWNER',
            endedAt: null,
          },
          orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
          select: { userId: true, id: true, validFrom: true },
        }),
      ),
    );
    const ownerId = relationships[0]?.userId ?? first.farm.ownerId;
    if (relationships.some((relationship) => (relationship?.userId ?? first.farm.ownerId) !== ownerId)) {
      throw new BadRequestException('All source assets must have the same active owner.');
    }

    for (const asset of assets) {
      await this.authorization.assertCan({
        user: { userId, role },
        module: 'farms',
        resource: 'farmAsset',
        action: AuthorizationAction.UPDATE,
        resourceId: asset.id,
        farmId,
        ownerId,
      });
    }
    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.CREATE,
      farmId,
      ownerId,
    });

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : new Date();
    if (Number.isNaN(effectiveAt.getTime())) {
      throw new BadRequestException('Merge effectiveAt is invalid.');
    }
    if (relationships.some((relationship) => relationship && effectiveAt < relationship.validFrom)) {
      throw new BadRequestException('Merge effectiveAt cannot precede a source asset ownership start.');
    }

    const latestSourceMovements = await Promise.all(
      sourceIds.map((sourceId) =>
        this.prisma.resourceMovement.findFirst({
          where: { resourceType: 'farmAsset', resourceId: sourceId },
          orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
          select: { id: true, effectiveAt: true },
        }),
      ),
    );
    if (latestSourceMovements.some((movement) => movement && effectiveAt < movement.effectiveAt)) {
      throw new BadRequestException('Merge effectiveAt cannot precede the latest source asset movement.');
    }

    const totalQuantity = assets.reduce((sum, asset) => sum + (asset.quantity ?? 0), 0);

    return this.prisma.$transaction(async (tx) => {
      await assertFarmActive(tx, farmId);
      const target = await tx.farmAsset.create({
        data: {
          farmId,
          type: first.type,
          name: dto.name ?? first.name,
          quantity: totalQuantity,
          unit: first.unit,
          metadata: (dto.metadata ?? first.metadata) as any,
        },
      });

      const targetRelationship = await this.relationships.createOwnerRelationship(
        tx,
        'farmAsset',
        target.id,
        ownerId,
        effectiveAt,
      );

      const movements: any[] = [];
      const lineages: any[] = [];
      let previousTargetMovementId: string | undefined;
      for (let index = 0; index < assets.length; index += 1) {
        const asset = assets[index];
        await this.relationships.terminateResourceRelationships(
          tx,
          'farmAsset',
          asset.id,
          effectiveAt,
          dto.reason ?? 'Merged into another farm asset',
        );
        const sourceUpdate = await tx.farmAsset.updateMany({
          where: { id: asset.id, quantity: asset.quantity, deletedAt: null },
          data: { quantity: 0 },
        });
        if (sourceUpdate.count !== 1) {
          throw new ConflictException(
            'A source farm asset changed while the merge was being prepared. Please retry.',
          );
        }

        const movement = await createResourceMovement(tx, {
          data: {
            resourceType: 'farmAsset',
            resourceId: target.id,
            movementType: ResourceMovementType.MERGE,
            previousMovementId: previousTargetMovementId,
            sourceResourceType: 'farmAsset',
            sourceResourceId: asset.id,
            destinationResourceType: 'farmAsset',
            destinationResourceId: target.id,
            sourceRelationshipId: relationships[index]?.id,
            destinationRelationshipId: targetRelationship.id,
            quantity: asset.quantity,
            unit: asset.unit,
            effectiveAt,
            reason: dto.reason,
            metadata: { sourceQuantity: asset.quantity },
            createdBy: userId,
            updatedBy: userId,
          },
        });
        movements.push(movement);
        previousTargetMovementId = movement.id;

        const lineage = await createResourceLineage(tx, {
          data: {
            sourceResourceType: 'farmAsset',
            sourceResourceId: asset.id,
            targetResourceType: 'farmAsset',
            targetResourceId: target.id,
            lineageType: ResourceLineageType.MERGED_FROM,
            movementId: movement.id,
            quantity: asset.quantity,
            unit: asset.unit,
            effectiveAt,
            reason: dto.reason,
            metadata: { mergedQuantity: totalQuantity },
            createdBy: userId,
            updatedBy: userId,
          },
        });
        lineages.push(lineage);
      }

      await this.audit.createInTransaction(tx, {
        actorId: userId,
        action: 'FARM_ASSETS_MERGED',
        resourceType: 'farmAsset',
        resourceId: target.id,
        description: 'Farm assets merged',
        metadata: { farmId, sourceAssetIds: sourceIds, movementIds: movements.map(({ id }) => id) },
      });

      return { target, movements, lineages };
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
        deletedAt: true,
        type: true,
        name: true,
        quantity: true,
        unit: true,
        metadata: true,
        farm: { select: { id: true, ownerId: true, deletedAt: true } },
      },
    });

    if (!asset || asset.deletedAt || asset.farmId !== farmId || asset.farm.deletedAt) {
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
      select: { userId: true, id: true, validFrom: true },
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
      ownerId,
    });

    const effectiveAt = dto.effectiveAt
      ? new Date(dto.effectiveAt)
      : new Date();

    if (Number.isNaN(effectiveAt.getTime())) {
      throw new BadRequestException('Split effectiveAt is invalid.');
    }
    if (relationship && effectiveAt < relationship.validFrom) {
      throw new BadRequestException('Split effectiveAt cannot precede the source asset ownership start.');
    }

    const latestMovement = await this.prisma.resourceMovement.findFirst({
      where: { resourceType: 'farmAsset', resourceId: assetId },
      orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
      select: { id: true, effectiveAt: true },
    });
    if (latestMovement && effectiveAt < latestMovement.effectiveAt) {
      throw new BadRequestException('Split effectiveAt cannot precede the latest source asset movement.');
    }

    const remainingQuantity = asset.quantity - dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      await assertFarmActive(tx, farmId);
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

      const movement = await createResourceMovement(tx, {
        data: {
          resourceType: 'farmAsset',
          resourceId: target.id,
          movementType: 'SPLIT',
          previousMovementId: latestMovement?.id,
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

      const lineage = await createResourceLineage(tx, {
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

      const sourceUpdate = await tx.farmAsset.updateMany({
        where: { id: asset.id, quantity: asset.quantity, deletedAt: null },
        data: { quantity: remainingQuantity },
      });
      if (sourceUpdate.count !== 1) {
        throw new ConflictException(
          'The source farm asset changed while the split was being prepared. Please retry.',
        );
      }

      const source = await tx.farmAsset.findUniqueOrThrow({
        where: { id: asset.id, deletedAt: null },
      });

      await this.audit.createInTransaction(tx, {
        actorId: userId,
        action: 'FARM_ASSET_SPLIT',
        resourceType: 'farmAsset',
        resourceId: asset.id,
        description: 'Farm asset split',
        metadata: {
          farmId,
          targetAssetId: target.id,
          quantity: dto.quantity,
          unit: asset.unit,
          movementId: movement.id,
        },
      });

      return { source, target, movement, lineage };
    });
  }
}

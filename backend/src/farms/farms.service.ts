import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { AuthorizationService } from '../platform/authorization/authorization.service';
import { RegistryService } from '../platform/registry/registry.service';
import { ResourceRelationshipService } from '../platform/relationships/relationship.service';
import { PrismaService } from '../prisma/prisma.service';

import { FarmResourceLifecycleService } from './farm-resource-lifecycle.service';
import { FarmResourceLineageService } from './farm-resource-lineage.service';
import { FarmAssetCustodyService } from './farm-asset-custody.service';
import { FarmAssetLeaseService } from './farm-asset-lease.service';

import { AuthorizationAction } from '../platform/authorization/authorization.types';

import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreateFarmAssetDto } from './dto/create-farm-asset.dto';
import { CreateFarmRecordDto } from './dto/create-farm-record.dto';
import { TransferResourceDto } from './dto/transfer-resource.dto';
import { SplitFarmAssetDto } from './dto/split-farm-asset.dto';
import { MergeFarmAssetsDto } from './dto/merge-farm-assets.dto';

@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly registry: RegistryService,
    private readonly relationships: ResourceRelationshipService,
    private readonly lifecycle: FarmResourceLifecycleService,
    private readonly lineage: FarmResourceLineageService,
    private readonly custody: FarmAssetCustodyService,
    private readonly lease: FarmAssetLeaseService,
  ) {}

  private async getCurrentFarmOwnerId(
    farmId: string,
    fallbackOwnerId: string,
  ): Promise<string> {
    const relationship = await this.prisma.resourceRelationship.findFirst({
      where: {
        resourceType: 'farm',
        resourceId: farmId,
        relationshipType: 'OWNER',
        endedAt: null,
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { userId: true },
    });

    return relationship?.userId ?? fallbackOwnerId;
  }

  private async getCurrentFarmAssetOwnerId(
    assetId: string,
    fallbackOwnerId: string,
  ): Promise<string> {
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

    return relationship?.userId ?? fallbackOwnerId;
  }

  async create(ownerId: string, role: UserRole, dto: CreateFarmDto) {
    await this.authorization.assertCan({
      user: {
        userId: ownerId,
        role,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.CREATE,
      ownerId,
    });

    const validatedData = this.validateFarmFields(dto);

    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          type: 'FARM',
        },
      });

      const farm = await tx.farm.create({
        data: {
          ...validatedData,
          name: validatedData.name as string,
          ownerId,
          entityId: entity.id,
        },
      });

      await this.relationships.createOwnerRelationship(
        tx,
        'farm',
        farm.id,
        ownerId,
        farm.createdAt,
      );

      return farm;
    });
  }

  private validateFarmFields(
    data: Partial<CreateFarmDto>,
  ): Partial<CreateFarmDto> {
    return this.validateResourceFields(
      'farm',
      data,
    );
  }

  private validateFarmRecordFields(
    data: Partial<CreateFarmRecordDto>,
  ): Partial<CreateFarmRecordDto> {
    return this.validateResourceFields(
      'farmRecord',
      data,
    );
  }

  private validateFarmAssetFields(
    data: Partial<CreateFarmAssetDto>,
  ): Partial<CreateFarmAssetDto> {
    return this.validateResourceFields(
      'farmAsset',
      data,
    );
  }

  private validateResourceFields<T extends object>(
    resourceName: string,
    data: Partial<T>,
  ): Partial<T> {
    const validated: Partial<T> = {};

    for (const fieldName of Object.keys(data) as Array<keyof T>) {
      const value = data[fieldName];

      /*
       * Optional fields retain the existing service behavior:
       * undefined means the field was omitted and should not be sent through
       * Registry validation. Required fields are guaranteed by the DTO layer.
       */
      if (value === undefined) {
        continue;
      }

      const result = this.registry.validateResourceField(
        resourceName,
        String(fieldName),
        value,
      );

      if (!result.valid) {
        throw new BadRequestException({
          message: `Invalid ${this.formatResourceFieldLabel(
            resourceName,
            String(fieldName),
          )}.`,
          errors: result.errors,
        });
      }

      validated[fieldName] = result.value as never;
    }

    return validated;
  }

  private formatResourceFieldLabel(
    resourceName: string,
    fieldName: string,
  ): string {
    return `${this.humanizeIdentifier(
      resourceName,
    )} ${this.humanizeIdentifier(fieldName)}`;
  }

  private humanizeIdentifier(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase();
  }

  async findMyFarms(ownerId: string, role: UserRole) {
    await this.authorization.assertCan({
      user: {
        userId: ownerId,
        role,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.READ,
      ownerId,
    });

    return this.prisma.farm.findMany({
      where: {
        ownerId,
        deletedAt: null,
      },
      include: {
        assets: true,
        records: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findMyArchivedFarms(ownerId: string, role: UserRole) {
    await this.authorization.assertCan({
      user: { userId: ownerId, role },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.READ,
      ownerId,
    });

    return this.prisma.farm.findMany({
      where: { ownerId, deletedAt: { not: null } },
      include: { assets: true, records: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: UserRole) {
    /*
     * First retrieve only the minimum resource context required to authorize
     * access. Protected farm relations and owner identity fields must not be
     * loaded until AuthorizationService has granted READ access.
     */
    const farmContext = await this.prisma.farm.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!farmContext) {
      throw new NotFoundException('Farm not found');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.READ,
      resourceId: id,
      ownerId: await this.getCurrentFarmOwnerId(
        farmContext.id,
        farmContext.ownerId,
      ),
    });

    /*
     * The full farm payload is intentionally retrieved only after successful
     * authorization. This preserves the existing response shape while keeping
     * protected relations outside the pre-authorization boundary.
     */
    const farm = await this.prisma.farm.findUnique({
      where: {
        id,
      },
      include: {
        assets: true,
        records: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }

    return farm;
  }

  async update(
    id: string,
    userId: string,
    role: UserRole,
    dto: UpdateFarmDto,
  ) {
    /*
     * Retrieve only the minimum farm context required for authorization.
     * Protected farm fields must not be loaded before authorization.
     */
    const farmContext = await this.prisma.farm.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!farmContext) {
      throw new NotFoundException('Farm not found');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.UPDATE,
      resourceId: farmContext.id,
      ownerId: await this.getCurrentFarmOwnerId(
        farmContext.id,
        farmContext.ownerId,
      ),
    });

    const updateData = this.validateFarmFields(dto);

    return this.prisma.farm.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  async getFarmMovementHistory(
    farmId: string,
    userId: string,
    role: UserRole,
  ) {
    return this.lifecycle.getFarmMovementHistory(farmId, userId, role);
  }

  async getFarmEvidenceHistory(
    farmId: string,
    userId: string,
    role: UserRole,
  ) {
    return this.lifecycle.getFarmEvidenceHistory(farmId, userId, role);
  }

  async getFarmAssetMovementHistory(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    return this.lifecycle.getFarmAssetMovementHistory(
      farmId,
      assetId,
      userId,
      role,
    );
  }

  async getFarmAssetEvidenceHistory(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    return this.lifecycle.getFarmAssetEvidenceHistory(
      farmId,
      assetId,
      userId,
      role,
    );
  }

  async transferFarm(
    farmId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    return this.lifecycle.transferFarm(farmId, dto, userId, role);
  }

  async transferFarmAsset(
    farmId: string,
    assetId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    return this.lifecycle.transferFarmAsset(
      farmId,
      assetId,
      dto,
      userId,
      role,
    );
  }

  async assignFarmAssetCustodian(
    farmId: string,
    assetId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    return this.custody.assignCustodian(
      farmId,
      assetId,
      dto,
      userId,
      role,
    );
  }

  async returnFarmAssetCustody(
    farmId: string,
    assetId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    return this.custody.returnCustody(farmId, assetId, dto, userId, role);
  }

  async leaseFarmAsset(
    farmId: string,
    assetId: string,
    dto: TransferResourceDto,
    userId: string,
    role: UserRole,
  ) {
    return this.lease.leaseAsset(farmId, assetId, dto, userId, role);
  }

  async endFarmAssetLease(
    farmId: string,
    assetId: string,
    dto: import('./dto/end-resource-lease.dto').EndResourceLeaseDto,
    userId: string,
    role: UserRole,
  ) {
    return this.lease.endLease(farmId, assetId, dto, userId, role);
  }

  async getFarmAssetRelationshipHistory(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    const assetContext = await this.prisma.farmAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        farmId: true,
        farm: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!assetContext || assetContext.farmId !== farmId) {
      throw new NotFoundException('Asset not found');
    }

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.READ,
      resourceId: assetContext.id,
      farmId: assetContext.farmId,
      ownerId: await this.getCurrentFarmAssetOwnerId(
        assetContext.id,
        assetContext.farm.ownerId,
      ),
    });

    return this.relationships.listResourceRelationshipHistory(
      'farmAsset',
      assetId,
    );
  }

  async addAsset(
    farmId: string,
    dto: CreateFarmAssetDto,
    userId: string,
    role: UserRole,
  ) {
    /*
     * Retrieve only the minimum farm context required for authorization.
     * Protected farm fields must not be loaded before authorization.
     */
    const farmContext = await this.prisma.farm.findUnique({
      where: {
        id: farmId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!farmContext) {
      throw new NotFoundException('Farm not found');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.CREATE,
      farmId: farmContext.id,
      ownerId: await this.getCurrentFarmOwnerId(
        farmContext.id,
        farmContext.ownerId,
      ),
    });

    const validatedData = this.validateFarmAssetFields(dto);

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.farmAsset.create({
        data: {
          farmId,
          ...validatedData,
          type: validatedData.type as string,
        },
      });

      await this.relationships.createOwnerRelationship(
        tx,
        'farmAsset',
        asset.id,
        await this.getCurrentFarmOwnerId(
          farmContext.id,
          farmContext.ownerId,
        ),
        asset.createdAt,
      );

      return asset;
    });
  }

  async getFarmAssetLineageHistory(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    return this.lineage.getFarmAssetLineageHistory(farmId, assetId, userId, role);
  }

  async mergeFarmAssets(
    farmId: string,
    dto: MergeFarmAssetsDto,
    userId: string,
    role: UserRole,
  ) {
    return this.lineage.mergeFarmAssets(farmId, dto, userId, role);
  }

  async splitFarmAsset(
    farmId: string,
    assetId: string,
    dto: SplitFarmAssetDto,
    userId: string,
    role: UserRole,
  ) {
    return this.lineage.splitFarmAsset(farmId, assetId, dto, userId, role);
  }

  async updateAsset(
    farmId: string,
    assetId: string,
    dto: CreateFarmAssetDto,
    userId: string,
    role: UserRole,
  ) {
    /*
     * Retrieve only the minimum asset/farm context required for authorization.
     * Protected farm payload data must not be loaded before authorization.
     */
    const assetContext = await this.prisma.farmAsset.findUnique({
      where: {
        id: assetId,
      },
      select: {
        id: true,
        farmId: true,
        farm: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!assetContext) {
      throw new NotFoundException('Asset not found');
    }

    if (assetContext.farmId !== farmId) {
      throw new NotFoundException('Asset not found');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.UPDATE,
      resourceId: assetContext.id,
      farmId: assetContext.farmId,
      ownerId: await this.getCurrentFarmAssetOwnerId(
        assetContext.id,
        assetContext.farm.ownerId,
      ),
    });

    const validatedData = this.validateFarmAssetFields(dto);

    return this.prisma.farmAsset.update({
      where: {
        id: assetId,
      },
      data: validatedData,
    });
  }

  async removeAsset(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    /*
     * Retrieve only the minimum asset/farm context required for authorization.
     * The protected asset/farm payload is not loaded until authorization succeeds.
     */
    const assetContext = await this.prisma.farmAsset.findUnique({
      where: {
        id: assetId,
      },
      select: {
        id: true,
        farmId: true,
        farm: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!assetContext) {
      throw new NotFoundException('Asset not found');
    }

    if (assetContext.farmId !== farmId) {
      throw new NotFoundException('Asset not found');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farmAsset',
      action: AuthorizationAction.DELETE,
      resourceId: assetContext.id,
      farmId: assetContext.farmId,
      ownerId: await this.getCurrentFarmAssetOwnerId(
        assetContext.id,
        assetContext.farm.ownerId,
      ),
    });

    return this.prisma.$transaction(async (tx) => {
      const endedAt = new Date();

      await this.relationships.terminateResourceRelationships(
        tx,
        'farmAsset',
        assetId,
        endedAt,
        'Farm asset deleted',
      );

      return tx.farmAsset.delete({
        where: { id: assetId },
      });
    });
  }

  async addRecord(
    farmId: string,
    dto: CreateFarmRecordDto,
    userId: string,
    role: UserRole,
  ) {
    /*
     * Retrieve only the minimum farm context required for authorization.
     * Protected farm fields must not be loaded before authorization.
     */
    const farmContext = await this.prisma.farm.findUnique({
      where: {
        id: farmId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!farmContext) {
      throw new NotFoundException('Farm not found');
    }

    /*
     * Authorization must remain before Registry validation.
     * Validation must never become a resource-existence or data-disclosure
     * oracle for callers who are not authorized to access this farm.
     */
    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farmRecord',
      action: AuthorizationAction.CREATE,
      farmId: farmContext.id,
      ownerId: await this.getCurrentFarmOwnerId(
        farmContext.id,
        farmContext.ownerId,
      ),
    });

    const validatedData = this.validateFarmRecordFields(dto);

    /*
     * These fields are required by the FarmRecord business contract.
     * Registry validation has already validated and normalized them.
     * The explicit checks below narrow the Partial DTO type before Prisma
     * receives the data; they do not introduce a second validation policy.
     */
    if (
      validatedData.category === undefined ||
      validatedData.inputMethod === undefined ||
      validatedData.data === undefined
    ) {
      throw new BadRequestException(
        'Invalid FarmRecord data.',
      );
    }

    /*
     * Preserve the existing FarmRecord title semantics:
     * an explicitly supplied empty/whitespace title is normalized to null.
     */
    const normalizedTitle =
      validatedData.title === ''
        ? null
        : validatedData.title;

    return this.prisma.farmRecord.create({
      data: {
        farmId,
        category: validatedData.category,
        inputMethod: validatedData.inputMethod,
        data: validatedData.data,
        title: normalizedTitle,
      },
    });
  }

  async remove(id: string, userId: string, role: UserRole) {
    const farmContext = await this.prisma.farm.findUnique({
      where: { id },
      select: { id: true, ownerId: true, deletedAt: true },
    });
    if (!farmContext || farmContext.deletedAt) {
      throw new NotFoundException('Farm not found');
    }

    await this.authorization.assertCan({
      user: { userId, role },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.DELETE,
      resourceId: farmContext.id,
      ownerId: await this.getCurrentFarmOwnerId(
        farmContext.id,
        farmContext.ownerId,
      ),
    });

    return this.prisma.$transaction(async (tx) => {
      const endedAt = new Date();
      await this.relationships.terminateResourceRelationships(
        tx, 'farm', id, endedAt, 'Farm archived',
      );
      return tx.farm.update({ where: { id }, data: { deletedAt: endedAt } });
    });
  }

  async restore(id: string, userId: string, role: UserRole) {
    const farmContext = await this.prisma.farm.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, ownerId: true },
    });
    if (!farmContext) throw new NotFoundException('Archived farm not found');

    const lastOwner = await this.prisma.resourceRelationship.findFirst({
      where: { resourceType: 'farm', resourceId: id, relationshipType: 'OWNER' },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { userId: true },
    });
    const ownerId = lastOwner?.userId ?? farmContext.ownerId;

    await this.authorization.assertCan({
      user: { userId, role }, module: 'farms', resource: 'farm',
      action: AuthorizationAction.RESTORE, resourceId: id, ownerId,
    });

    return this.prisma.$transaction(async (tx) => {
      const farm = await tx.farm.update({ where: { id }, data: { deletedAt: null } });
      await this.relationships.createOwnerRelationship(tx, 'farm', farm.id, ownerId, new Date());
      return farm;
    });
  }

}

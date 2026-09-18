import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CropSeason, CropStatus, UserRole } from '@prisma/client';

import { AuthorizationService } from '../platform/authorization/authorization.service';
import { RegistryService } from '../platform/registry/registry.service';
import { PrismaService } from '../prisma/prisma.service';

import { AuthorizationAction } from '../platform/authorization/authorization.types';

import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreateFarmAssetDto } from './dto/create-farm-asset.dto';
import { CreateFarmRecordDto } from './dto/create-farm-record.dto';

@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly registry: RegistryService,
  ) {}

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

      return tx.farm.create({
        data: {
          ...validatedData,
          name: validatedData.name as string,
          ownerId,
          entityId: entity.id,
        },
      });
    });
  }

  private validateFarmFields(
    data: Partial<CreateFarmDto>,
  ): Partial<CreateFarmDto> {
    const fields: Array<{
      key: keyof CreateFarmDto;
      label: string;
    }> = [
      {
        key: 'name',
        label: 'farm name',
      },
      {
        key: 'type',
        label: 'farm type',
      },
      {
        key: 'description',
        label: 'farm description',
      },
      {
        key: 'location',
        label: 'farm location',
      },
      {
        key: 'latitude',
        label: 'farm latitude',
      },
      {
        key: 'longitude',
        label: 'farm longitude',
      },
      {
        key: 'area',
        label: 'farm area',
      },
      {
        key: 'unit',
        label: 'farm unit',
      },
    ];

    const validated: Partial<CreateFarmDto> = {};

    for (const field of fields) {
      const value = data[field.key];

      if (value === undefined) {
        continue;
      }

      const result = this.registry.validateResourceField(
        'farm',
        field.key,
        value,
      );

      if (!result.valid) {
        throw new BadRequestException({
          message: `Invalid ${field.label}.`,
          errors: result.errors,
        });
      }

      validated[field.key] = result.value as never;
    }

    return validated;
  }

  private validateFarmRecordFields(
    data: Partial<CreateFarmRecordDto>,
  ): Partial<CreateFarmRecordDto> {
    const fields: Array<{
      key: keyof CreateFarmRecordDto;
      label: string;
    }> = [
      {
        key: 'category',
        label: 'farm record category',
      },
      {
        key: 'title',
        label: 'farm record title',
      },
      {
        key: 'inputMethod',
        label: 'farm record input method',
      },
      {
        key: 'data',
        label: 'farm record data',
      },
    ];

    const validated: Partial<CreateFarmRecordDto> = {};

    for (const field of fields) {
      const value = data[field.key];

      /*
       * Optional FarmRecord fields retain the existing service behavior:
       * undefined means the field was omitted and should not be sent through
       * Registry validation. Required fields are guaranteed by the DTO layer.
       */
      if (value === undefined) {
        continue;
      }

      const result = this.registry.validateResourceField(
        'farmRecord',
        field.key,
        value,
      );

      if (!result.valid) {
        throw new BadRequestException({
          message: `Invalid ${field.label}.`,
          errors: result.errors,
        });
      }

      validated[field.key] = result.value as never;
    }

    return validated;
  }

  private validateFarmAssetFields(
    data: Partial<CreateFarmAssetDto>,
  ): Partial<CreateFarmAssetDto> {
    const fields: Array<{
      key: keyof CreateFarmAssetDto;
      label: string;
    }> = [
      {
        key: 'type',
        label: 'farm asset type',
      },
      {
        key: 'name',
        label: 'farm asset name',
      },
      {
        key: 'quantity',
        label: 'farm asset quantity',
      },
      {
        key: 'unit',
        label: 'farm asset unit',
      },
      {
        key: 'metadata',
        label: 'farm asset metadata',
      },
    ];

    const validated: Partial<CreateFarmAssetDto> = {};

    for (const field of fields) {
      const value = data[field.key];

      if (value === undefined) {
        continue;
      }

      const result = this.registry.validateResourceField(
        'farmAsset',
        field.key,
        value,
      );

      if (!result.valid) {
        throw new BadRequestException({
          message: `Invalid ${field.label}.`,
          errors: result.errors,
        });
      }

      validated[field.key] = result.value as never;
    }

    return validated;
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

  async findOne(id: string, userId: string, role: UserRole) {
    /*
     * First retrieve only the minimum resource context required to authorize
     * access. Protected farm relations and owner identity fields must not be
     * loaded until AuthorizationService has granted READ access.
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
      action: AuthorizationAction.READ,
      resourceId: id,
      ownerId: farmContext.ownerId,
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
      ownerId: farmContext.ownerId,
    });

    const updateData = this.validateFarmFields(dto);

    return this.prisma.farm.update({
      where: {
        id,
      },
      data: updateData,
    });
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
      ownerId: farmContext.ownerId,
    });

    const validatedData = this.validateFarmAssetFields(dto);

    return this.prisma.farmAsset.create({
      data: {
        farmId,
        ...validatedData,
        type: validatedData.type as string,
      },
    });
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
      ownerId: assetContext.farm.ownerId,
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
      ownerId: assetContext.farm.ownerId,
    });

    return this.prisma.farmAsset.delete({
      where: {
        id: assetId,
      },
    });
  }

  async addCrop(
    farmId: string,
    input: {
      name: string;
      variety?: string;
      season?: CropSeason;
      status?: CropStatus;
      sowingDate?: Date;
      harvestDate?: Date;
      area?: number;
      unit?: string;
      notes?: string;
    },
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
      resource: 'crop',
      action: AuthorizationAction.CREATE,
      farmId: farmContext.id,
      ownerId: farmContext.ownerId,
    });

    const nameResult = this.registry.validateResourceField(
      'crop',
      'name',
      input.name,
    );

    if (!nameResult.valid) {
      throw new BadRequestException({
        message: 'Invalid crop name.',
        errors: nameResult.errors,
      });
    }

    const normalizedName = nameResult.value as string;
    const sowingDate = input.sowingDate ?? new Date();

    /*
     * Preserve the existing Intake duplicate rule:
     * a Crop with the same name on the same calendar day is not created twice.
     *
     * The duplicate check intentionally uses the Registry-normalized name so
     * equivalent user/AI input cannot bypass duplicate protection through
     * formatting differences.
     */
    const startOfDay = new Date(
      sowingDate.getFullYear(),
      sowingDate.getMonth(),
      sowingDate.getDate(),
    );

    const startOfNextDay = new Date(
      sowingDate.getFullYear(),
      sowingDate.getMonth(),
      sowingDate.getDate() + 1,
    );

    const existingCrop =
      await this.prisma.crop.findFirst({
        where: {
          farmId: farmContext.id,
          deletedAt: null,
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
          sowingDate: {
            gte: startOfDay,
            lt: startOfNextDay,
          },
        },
      });

    if (existingCrop) {
      return existingCrop;
    }

    return this.prisma.crop.create({
      data: {
        farmId: farmContext.id,
        name: normalizedName,
        variety: input.variety,
        season: input.season ?? CropSeason.UNKNOWN,
        status: input.status ?? CropStatus.SOWN,
        sowingDate,
        harvestDate: input.harvestDate,
        area: input.area,
        unit: input.unit,
        notes: input.notes,
      },
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
      ownerId: farmContext.ownerId,
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
      action: AuthorizationAction.DELETE,
      resourceId: farmContext.id,
      ownerId: farmContext.ownerId,
    });

    return this.prisma.farm.delete({
      where: {
        id,
      },
    });
  }
}

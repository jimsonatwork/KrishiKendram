import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

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

    const nameResult = this.registry.validateResourceField(
      'farm',
      'name',
      dto.name,
    );

    if (!nameResult.valid) {
      throw new BadRequestException({
        message: 'Invalid farm name.',
        errors: nameResult.errors,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          type: 'FARM',
        },
      });

      return tx.farm.create({
        data: {
          ...dto,
          name: nameResult.value as string,
          ownerId,
          entityId: entity.id,
        },
      });
    });
  }

  async findMyFarms(ownerId: string) {
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

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farm',
      action: AuthorizationAction.READ,
      resourceId: id,
      ownerId: farm.ownerId,
    });

    return farm;
  }

  async update(id: string, userId: string, role: UserRole, dto: UpdateFarmDto) {
    const farm = await this.prisma.farm.findUnique({
      where: {
        id,
      },
    });

    if (!farm) {
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
      resourceId: id,
      ownerId: farm.ownerId,
    });

    let updateData = dto;

    if (dto.name !== undefined) {
      const nameResult = this.registry.validateResourceField(
        'farm',
        'name',
        dto.name,
      );

      if (!nameResult.valid) {
        throw new BadRequestException({
          message: 'Invalid farm name.',
          errors: nameResult.errors,
        });
      }

      updateData = {
        ...dto,
        name: nameResult.value as string,
      };
    }

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
    const farm = await this.prisma.farm.findUnique({
      where: {
        id: farmId,
      },
    });

    if (!farm) {
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
      farmId,
      ownerId: farm.ownerId,
    });

    let assetData = {
      farmId,
      ...dto,
    };

    if (dto.name !== undefined) {
      const nameResult = this.registry.validateResourceField(
        'farmAsset',
        'name',
        dto.name,
      );

      if (!nameResult.valid) {
        throw new BadRequestException({
          message: 'Invalid farm asset name.',
          errors: nameResult.errors,
        });
      }

      assetData = {
        ...assetData,
        name: nameResult.value as string,
      };
    }

    return this.prisma.farmAsset.create({
      data: assetData,
    });
  }

  async updateAsset(
    farmId: string,
    assetId: string,
    dto: CreateFarmAssetDto,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: {
        id: assetId,
      },
      include: {
        farm: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.farmId !== farmId) {
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
      resourceId: assetId,
      farmId,
      ownerId: asset.farm.ownerId,
    });

    let assetData = {
      ...dto,
    };

    if (dto.name !== undefined) {
      const nameResult = this.registry.validateResourceField(
        'farmAsset',
        'name',
        dto.name,
      );

      if (!nameResult.valid) {
        throw new BadRequestException({
          message: 'Invalid farm asset name.',
          errors: nameResult.errors,
        });
      }

      assetData = {
        ...assetData,
        name: nameResult.value as string,
      };
    }

    return this.prisma.farmAsset.update({
      where: {
        id: assetId,
      },
      data: assetData,
    });
  }

  async removeAsset(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    const asset = await this.prisma.farmAsset.findUnique({
      where: {
        id: assetId,
      },
      include: {
        farm: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.farmId !== farmId) {
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
      resourceId: assetId,
      farmId,
      ownerId: asset.farm.ownerId,
    });

    return this.prisma.farmAsset.delete({
      where: {
        id: assetId,
      },
    });
  }

  async addRecord(
    farmId: string,
    dto: CreateFarmRecordDto,
    userId: string,
    role: UserRole,
  ) {
    const farm = await this.prisma.farm.findUnique({
      where: {
        id: farmId,
      },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farmRecord',
      action: AuthorizationAction.CREATE,
      farmId,
      ownerId: farm.ownerId,
    });

    const categoryResult = this.registry.validateResourceField(
      'farmRecord',
      'category',
      dto.category,
    );

    if (!categoryResult.valid) {
      throw new BadRequestException(categoryResult.errors.join(' '));
    }

    let normalizedTitle: string | null | undefined;

    if (dto.title !== undefined) {
      const titleResult = this.registry.validateResourceField(
        'farmRecord',
        'title',
        dto.title,
      );

      if (!titleResult.valid) {
        throw new BadRequestException(titleResult.errors.join(' '));
      }

      normalizedTitle =
        titleResult.value === '' ? null : String(titleResult.value);
    }

    return this.prisma.farmRecord.create({
      data: {
        farmId,
        category: categoryResult.value as string,
        title: normalizedTitle,
        inputMethod: dto.inputMethod,
        data: dto.data,
      },
    });
  }

  async remove(id: string, userId: string, role: UserRole) {
    const farm = await this.prisma.farm.findUnique({
      where: {
        id,
      },
    });

    if (!farm) {
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
      resourceId: id,
      ownerId: farm.ownerId,
    });

    return this.prisma.farm.delete({
      where: {
        id,
      },
    });
  }
}

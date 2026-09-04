import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  AuthorizationAction,
} from '../platform/authorization/authorization.types';
import {
  AuthorizationService,
} from '../platform/authorization/authorization.service';

import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';

@Injectable()
export class CropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  async create(
    userId: string,
    role: UserRole,
    dto: CreateCropDto,
  ) {
    const farm = await this.prisma.farm.findUnique({
      where: {
        id: dto.farmId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found.');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'crop',
      action: AuthorizationAction.CREATE,
      farmId: farm.id,
      ownerId: farm.ownerId,
    });

    return this.prisma.crop.create({
      data: {
        farmId: dto.farmId,
        name: dto.name,
        variety: dto.variety,
        season: dto.season,
        status: dto.status,
        sowingDate: dto.sowingDate
          ? new Date(dto.sowingDate)
          : null,
        harvestDate: dto.harvestDate
          ? new Date(dto.harvestDate)
          : null,
        area: dto.area,
        unit: dto.unit,
        notes: dto.notes,
      },
    });
  }

  async findMyCrops(
    userId: string,
    role: UserRole,
  ) {
    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'crop',
      action: AuthorizationAction.READ,
      ownerId: userId,
    });

    return this.prisma.crop.findMany({
      where: {
        deletedAt: null,
        farm: {
          ownerId: userId,
        },
      },
      include: {
        farm: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(
    userId: string,
    role: UserRole,
    cropId: string,
  ) {
    const crop = await this.prisma.crop.findFirst({
      where: {
        id: cropId,
        deletedAt: null,
      },
      include: {
        farm: true,
      },
    });

    if (!crop) {
      throw new NotFoundException('Crop not found.');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'crop',
      action: AuthorizationAction.READ,
      resourceId: crop.id,
      farmId: crop.farmId,
      ownerId: crop.farm.ownerId,
    });

    return crop;
  }

  async update(
    userId: string,
    role: UserRole,
    cropId: string,
    dto: UpdateCropDto,
  ) {
    const crop = await this.prisma.crop.findFirst({
      where: {
        id: cropId,
        deletedAt: null,
      },
      include: {
        farm: true,
      },
    });

    if (!crop) {
      throw new NotFoundException('Crop not found.');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'crop',
      action: AuthorizationAction.UPDATE,
      resourceId: crop.id,
      farmId: crop.farmId,
      ownerId: crop.farm.ownerId,
    });

    return this.prisma.crop.update({
      where: {
        id: cropId,
      },
      data: {
        ...dto,
        sowingDate: dto.sowingDate
          ? new Date(dto.sowingDate)
          : undefined,
        harvestDate: dto.harvestDate
          ? new Date(dto.harvestDate)
          : undefined,
      },
    });
  }

  async archive(
    userId: string,
    role: UserRole,
    cropId: string,
  ) {
    const crop = await this.prisma.crop.findFirst({
      where: {
        id: cropId,
        deletedAt: null,
      },
      include: {
        farm: true,
      },
    });

    if (!crop) {
      throw new NotFoundException('Crop not found.');
    }

    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'crop',
      action: AuthorizationAction.DELETE,
      resourceId: crop.id,
      farmId: crop.farmId,
      ownerId: crop.farm.ownerId,
    });

    return this.prisma.crop.update({
      where: {
        id: cropId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

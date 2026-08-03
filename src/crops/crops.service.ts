import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';

@Injectable()
export class CropsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateCropDto) {
    const farm = await this.prisma.farm.findFirst({
      where: {
        id: dto.farmId,
        ownerId,
      },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found.');
    }

    return this.prisma.crop.create({
      data: {
        farmId: dto.farmId,
        name: dto.name,
        variety: dto.variety,
        season: dto.season,
        status: dto.status,
        sowingDate: dto.sowingDate ? new Date(dto.sowingDate) : null,
        harvestDate: dto.harvestDate ? new Date(dto.harvestDate) : null,
        area: dto.area,
        unit: dto.unit,
        notes: dto.notes,
      },
    });
  }

  async findMyCrops(ownerId: string) {
    return this.prisma.crop.findMany({
      where: {
        deletedAt: null,
        farm: {
          ownerId,
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

  async findOne(ownerId: string, cropId: string) {
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

    if (crop.farm.ownerId !== ownerId) {
      throw new ForbiddenException('Access denied.');
    }

    return crop;
  }

  async update(ownerId: string, cropId: string, dto: UpdateCropDto) {
    await this.findOne(ownerId, cropId);

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

  async archive(ownerId: string, cropId: string) {
    await this.findOne(ownerId, cropId);

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
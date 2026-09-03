import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreateFarmAssetDto } from './dto/create-farm-asset.dto';
import { CreateFarmRecordDto } from './dto/create-farm-record.dto';

@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private isPrivileged(role: UserRole) {
    return (
      role === UserRole.ADMIN ||
      role === UserRole.SUPER_ADMIN
    );
  }

  private assertFarmAccess(
    farmOwnerId: string,
    userId: string,
    role: UserRole,
  ) {
    if (
      farmOwnerId !== userId &&
      !this.isPrivileged(role)
    ) {
      throw new ForbiddenException(
        'Access denied',
      );
    }
  }

  async create(
    ownerId: string,
    dto: CreateFarmDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          type: 'FARM',
        },
      });

      return tx.farm.create({
        data: {
          ...dto,
          ownerId,
          entityId: entity.id,
        },
      });
    });
  }

  async findMyFarms(
    ownerId: string,
  ) {
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

  async findOne(
    id: string,
    userId: string,
    role: UserRole,
  ) {
    const farm =
      await this.prisma.farm.findUnique({
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
      throw new NotFoundException(
        'Farm not found',
      );
    }

    this.assertFarmAccess(
      farm.ownerId,
      userId,
      role,
    );

    return farm;
  }

  async update(
    id: string,
    userId: string,
    role: UserRole,
    dto: UpdateFarmDto,
  ) {
    await this.findOne(
      id,
      userId,
      role,
    );

    return this.prisma.farm.update({
      where: {
        id,
      },
      data: dto,
    });
  }

  async addAsset(
    farmId: string,
    dto: CreateFarmAssetDto,
    userId: string,
    role: UserRole,
  ) {
    const farm =
      await this.prisma.farm.findUnique({
        where: {
          id: farmId,
        },
      });

    if (!farm) {
      throw new NotFoundException(
        'Farm not found',
      );
    }

    this.assertFarmAccess(
      farm.ownerId,
      userId,
      role,
    );

    return this.prisma.farmAsset.create({
      data: {
        farmId,
        ...dto,
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
    const asset =
      await this.prisma.farmAsset.findUnique({
        where: {
          id: assetId,
        },
        include: {
          farm: true,
        },
      });

    if (!asset) {
      throw new NotFoundException(
        'Asset not found',
      );
    }

    if (asset.farmId !== farmId) {
      throw new NotFoundException(
        'Asset not found',
      );
    }

    this.assertFarmAccess(
      asset.farm.ownerId,
      userId,
      role,
    );

    return this.prisma.farmAsset.update({
      where: {
        id: assetId,
      },
      data: {
        ...dto,
      },
    });
  }

  async removeAsset(
    farmId: string,
    assetId: string,
    userId: string,
    role: UserRole,
  ) {
    const asset =
      await this.prisma.farmAsset.findUnique({
        where: {
          id: assetId,
        },
        include: {
          farm: true,
        },
      });

    if (!asset) {
      throw new NotFoundException(
        'Asset not found',
      );
    }

    if (asset.farmId !== farmId) {
      throw new NotFoundException(
        'Asset not found',
      );
    }

    this.assertFarmAccess(
      asset.farm.ownerId,
      userId,
      role,
    );

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
    const farm =
      await this.prisma.farm.findUnique({
        where: {
          id: farmId,
        },
      });

    if (!farm) {
      throw new NotFoundException(
        'Farm not found',
      );
    }

    this.assertFarmAccess(
      farm.ownerId,
      userId,
      role,
    );

    return this.prisma.farmRecord.create({
      data: {
        farmId,
        ...dto,
      },
    });
  }

  async remove(
    id: string,
    userId: string,
    role: UserRole,
  ) {
    await this.findOne(
      id,
      userId,
      role,
    );

    return this.prisma.farm.delete({
      where: {
        id,
      },
    });
  }
}

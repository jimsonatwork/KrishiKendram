import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from '../platform/registry/registry.service';

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
    private readonly registry: RegistryService,
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

    const nameResult = this.registry.validateResourceField(
      'crop',
      'name',
      dto.name,
    );

    if (!nameResult.valid) {
      throw new BadRequestException({
        message: 'Invalid crop name.',
        errors: nameResult.errors,
      });
    }

    return this.prisma.crop.create({
      data: {
        farmId: dto.farmId,
        name: nameResult.value as string,
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
    /*
     * First retrieve only the minimum resource context required to authorize
     * access. The protected crop payload must not be loaded until READ access
     * has been granted.
     */
    const cropContext = await this.prisma.crop.findFirst({
      where: {
        id: cropId,
        deletedAt: null,
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

    if (!cropContext) {
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
      resourceId: cropContext.id,
      farmId: cropContext.farmId,
      ownerId: cropContext.farm.ownerId,
    });

    /*
     * Preserve the existing response shape, but only retrieve the protected
     * crop payload after successful authorization.
     */
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

    return crop;
  }

  async update(
    userId: string,
    role: UserRole,
    cropId: string,
    dto: UpdateCropDto,
  ) {
    /*
     * Only load the minimum Crop/Farm context needed to authorize the update.
     * Full protected Crop data is unnecessary because the mutation operates
     * directly on the supplied resource ID and update DTO.
     */
    const cropContext = await this.prisma.crop.findFirst({
      where: {
        id: cropId,
        deletedAt: null,
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

    if (!cropContext) {
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
      resourceId: cropContext.id,
      farmId: cropContext.farmId,
      ownerId: cropContext.farm.ownerId,
    });

    let updateData = {
      ...dto,
      sowingDate: dto.sowingDate
        ? new Date(dto.sowingDate)
        : undefined,
      harvestDate: dto.harvestDate
        ? new Date(dto.harvestDate)
        : undefined,
    };

    if (dto.name !== undefined) {
      const nameResult = this.registry.validateResourceField(
        'crop',
        'name',
        dto.name,
      );

      if (!nameResult.valid) {
        throw new BadRequestException({
          message: 'Invalid crop name.',
          errors: nameResult.errors,
        });
      }

      updateData = {
        ...updateData,
        name: nameResult.value as string,
      };
    }

    return this.prisma.crop.update({
      where: {
        id: cropId,
      },
      data: updateData,
    });
  }

  async archive(
    userId: string,
    role: UserRole,
    cropId: string,
  ) {
    /*
     * Archive is a destructive lifecycle action, so authorization must happen
     * before the mutation. Only the minimum Crop/Farm context is required.
     */
    const cropContext = await this.prisma.crop.findFirst({
      where: {
        id: cropId,
        deletedAt: null,
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

    if (!cropContext) {
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
      resourceId: cropContext.id,
      farmId: cropContext.farmId,
      ownerId: cropContext.farm.ownerId,
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

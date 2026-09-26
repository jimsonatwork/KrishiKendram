import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CropSeason,
  CropStatus,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from '../platform/registry/registry.service';
import { ResourceRelationshipService } from '../platform/relationships/relationship.service';

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
    private readonly relationships: ResourceRelationshipService,
  ) {}

  async create(
    userId: string,
    role: UserRole,
    dto: CreateCropDto,
  ) {
    return this.createCanonical(
      dto.farmId,
      {
        name: dto.name,
        variety: dto.variety,
        season: dto.season,
        status: dto.status,
        sowingDate: dto.sowingDate
          ? new Date(dto.sowingDate)
          : undefined,
        harvestDate: dto.harvestDate
          ? new Date(dto.harvestDate)
          : undefined,
        area: dto.area,
        unit: dto.unit,
        notes: dto.notes,
      },
      userId,
      role,
      {
        defaultSeason: dto.season,
        defaultStatus: undefined,
        defaultSowingDate: undefined,
        preventSameDayDuplicate: false,
        preserveNullDates: true,
      },
    );
  }

  /*
   * Canonical internal Crop creation boundary for interpretation-driven
   * workflows such as AI Intake.
   *
   * Intake owns interpretation. CropsService owns Crop authorization,
   * Registry normalization, duplicate protection, defaults, and persistence.
   */
  async createFromIntake(
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
    return this.createCanonical(
      farmId,
      {
        name: input.name,
        variety: input.variety,
        season: input.season,
        status: input.status,
        sowingDate: input.sowingDate,
        harvestDate: input.harvestDate,
        area: input.area,
        unit: input.unit,
        notes: input.notes,
      },
      userId,
      role,
      {
        defaultSeason: CropSeason.UNKNOWN,
        defaultStatus: CropStatus.SOWN,
        defaultSowingDate: new Date(),
        preventSameDayDuplicate: true,
      },
    );
  }

  private async createCanonical(
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
    options: {
      defaultSeason: CropSeason;
      defaultStatus?: CropStatus;
      defaultSowingDate?: Date;
      preventSameDayDuplicate: boolean;
      preserveNullDates?: boolean;
    },
  ) {
    /*
     * Retrieve only the minimum farm context required for authorization.
     * Protected farm fields must not be loaded before authorization.
     */
    const farm = await this.prisma.farm.findUnique({
      where: {
        id: farmId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found.');
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
      farmId: farm.id,
      ownerId: farm.ownerId,
    });

    const normalizedName = this.validateCropName(input.name);
    const sowingDate =
      input.sowingDate ??
      options.defaultSowingDate;

    /*
     * Intake historically prevented duplicate same-day Crop creation.
     * Keep that rule inside the canonical Crop owner so it cannot be bypassed
     * by moving the workflow to another entry point.
     */
    if (
      options.preventSameDayDuplicate &&
      sowingDate
    ) {
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
            farmId: farm.id,
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
    }

    return this.prisma.$transaction(async (tx) => {
      const crop = await tx.crop.create({
        data: {
          farmId: farm.id,
          name: normalizedName,
          variety: input.variety,
          season:
            input.season ??
            options.defaultSeason,
          status:
            input.status ??
            options.defaultStatus,
          sowingDate:
            sowingDate ??
            (options.preserveNullDates ? null : undefined),
          harvestDate:
            input.harvestDate ??
            (options.preserveNullDates ? null : undefined),
          area: input.area,
          unit: input.unit,
          notes: input.notes,
        },
      });

      await this.relationships.createOwnerRelationship(
        tx,
        'crop',
        crop.id,
        farm.ownerId,
        crop.createdAt,
      );

      return crop;
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

  async getRelationshipHistory(
    userId: string,
    role: UserRole,
    cropId: string,
  ) {
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
      user: { userId, role },
      module: 'farms',
      resource: 'crop',
      action: AuthorizationAction.READ,
      resourceId: cropContext.id,
      farmId: cropContext.farmId,
      ownerId: cropContext.farm.ownerId,
    });

    return this.relationships.listResourceRelationshipHistory(
      'crop',
      cropId,
    );
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
      updateData = {
        ...updateData,
        name: this.validateCropName(dto.name),
      };
    }

    return this.prisma.crop.update({
      where: {
        id: cropId,
      },
      data: updateData,
    });
  }

  private validateCropName(name: string): string {
    const result = this.registry.validateResourceField(
      'crop',
      'name',
      name,
    );

    if (!result.valid) {
      throw new BadRequestException({
        message: 'Invalid crop name.',
        errors: result.errors,
      });
    }

    return result.value as string;
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

    return this.prisma.$transaction(async (tx) => {
      const endedAt = new Date();

      await this.relationships.terminateResourceRelationships(
        tx,
        'crop',
        cropId,
        endedAt,
        'Crop archived',
      );

      return tx.crop.update({
        where: { id: cropId },
        data: { deletedAt: endedAt },
      });
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CropSeason,
  CropStatus,
  Prisma,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { FarmsService } from '../farms/farms.service';

import {
  AuthorizationAction,
} from '../platform/authorization/authorization.types';

import {
  AuthorizationService,
} from '../platform/authorization/authorization.service';

import {
  RegistryService,
} from '../platform/registry/registry.service';

import { CreateIntakeDto } from './dto/create-intake.dto';
import { IntakeExtractorService } from './extractor/intake-extractor.service';

@Injectable()
export class IntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: IntakeExtractorService,
    private readonly authorization: AuthorizationService,
    private readonly registry: RegistryService,
    private readonly farmsService: FarmsService,
  ) {}

  async create(
    userId: string,
    role: UserRole,
    dto: CreateIntakeDto,
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

    /*
     * Authorize the farm-record creation before processing the supplied intake
     * content. The extractor is an AI/data-processing boundary and must not
     * receive unauthorized farm content.
     */
    await this.authorization.assertCan({
      user: {
        userId,
        role,
      },
      module: 'farms',
      resource: 'farmRecord',
      action: AuthorizationAction.CREATE,
      farmId: farm.id,
      ownerId: farm.ownerId,
    });

    const extracted = await this.extractor.extract(
      dto.content,
    );

    if (
      extracted.category === 'PLANTING' &&
      extracted.crop
    ) {
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

      const sowingDate = new Date();

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
              equals: extracted.crop.name,
              mode: 'insensitive',
            },
            sowingDate: {
              gte: startOfDay,
              lt: startOfNextDay,
            },
          },
        });

      if (!existingCrop) {
        const cropNameResult =
          this.registry.validateResourceField(
            'crop',
            'name',
            extracted.crop.name,
          );

        if (!cropNameResult.valid) {
          throw new BadRequestException(
            cropNameResult.errors.join(' '),
          );
        }

        await this.prisma.crop.create({
          data: {
            farmId: farm.id,
            name: cropNameResult.value as string,
            season: CropSeason.UNKNOWN,
            status: CropStatus.SOWN,
            sowingDate,
            area: extracted.activity?.area,
            unit: extracted.activity?.unit,
          },
        });
      }
    }

    /*
     * FarmRecord mutation belongs to FarmsService.
     *
     * Intake owns interpretation of the supplied content, but it must not
     * create a second FarmRecord persistence/validation path. FarmsService
     * remains the canonical mutation boundary for authorization, Registry
     * validation, normalization, and Prisma persistence.
     */
    const jsonData =
      JSON.parse(
        JSON.stringify(extracted),
      ) as Prisma.InputJsonValue;

    return this.farmsService.addRecord(
      dto.farmId,
      {
        category: extracted.category,
        title: 'AI Intake Record',
        inputMethod: dto.inputMethod,
        data: jsonData as Record<string, any>,
      },
      userId,
      role,
    );
  }
}

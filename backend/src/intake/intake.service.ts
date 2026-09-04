import {
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

import {
  AuthorizationAction,
} from '../platform/authorization/authorization.types';

import {
  AuthorizationService,
} from '../platform/authorization/authorization.service';

import { CreateIntakeDto } from './dto/create-intake.dto';
import { IntakeExtractorService } from './extractor/intake-extractor.service';

@Injectable()
export class IntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: IntakeExtractorService,
    private readonly authorization: AuthorizationService,
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

    const extracted = await this.extractor.extract(
      dto.content,
    );

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
        await this.prisma.crop.create({
          data: {
            farmId: farm.id,
            name: extracted.crop.name,
            season: CropSeason.UNKNOWN,
            status: CropStatus.SOWN,
            sowingDate,
            area: extracted.activity?.area,
            unit: extracted.activity?.unit,
          },
        });
      }
    }

    const jsonData =
      JSON.parse(
        JSON.stringify(extracted),
      ) as Prisma.InputJsonValue;

    const record =
      await this.prisma.farmRecord.create({
        data: {
          farmId: dto.farmId,
          category: extracted.category,
          title: 'AI Intake Record',
          inputMethod: dto.inputMethod,
          data: jsonData,
        },
      });

    return record;
  }
}

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { FarmsService } from '../farms/farms.service';
import { CropsService } from '../crops/crops.service';

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
    private readonly farmsService: FarmsService,
    private readonly cropsService: CropsService,
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
      /*
       * Keep the Crop authorization at the Intake boundary before passing
       * extracted farm data into the canonical Crop mutation service.
       *
       * CropsService.createFromIntake() performs the same authorization
       * again as its own mandatory mutation boundary. This protects the
       * service if it is ever called from another entry point.
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

      const sowingDate = new Date();

      /*
       * Crop persistence belongs to CropsService.
       *
       * Intake owns interpretation of the supplied content, but it must not
       * maintain a second Crop validation, duplicate-check, or Prisma
       * persistence path.
       */
      await this.cropsService.createFromIntake(
        dto.farmId,
        {
          name: extracted.crop.name,
          sowingDate,
          area: extracted.activity?.area,
          unit: extracted.activity?.unit,
        },
        userId,
        role,
      );
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

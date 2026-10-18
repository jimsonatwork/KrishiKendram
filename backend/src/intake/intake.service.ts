import {
  BadRequestException,
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

    const originalLanguage = dto.originalLanguage ?? 'en';
    const originalContent = dto.originalContent?.trim() || dto.content.trim();
    const englishTranslation = dto.englishTranslation?.trim() || (
      originalLanguage === 'en' ? dto.content.trim() : ''
    );

    // Server-side enforcement is mandatory: client-side checkbox state is not trusted.
    if (originalLanguage !== 'en' && (!englishTranslation || dto.translationConfirmed !== true)) {
      throw new BadRequestException(
        'A non-English intake requires a reviewed English meaning and explicit confirmation.',
      );
    }

    const extracted = await this.extractor.extract(englishTranslation);

    const extractedWithProvenance = {
      ...extracted,
      intakeMetadata: {
        originalContent,
        originalLanguage,
        englishTranslation,
        translationStatus: originalLanguage === 'en' ? 'NOT_REQUIRED' : 'CONFIRMED',
        inputMethod: dto.inputMethod,
        capturedAt: new Date().toISOString(),
      },
    };

    const jsonData =
      JSON.parse(
        JSON.stringify(extractedWithProvenance),
      ) as Prisma.InputJsonValue;

    /*
     * Interpretation and authorization are complete before opening the
     * transaction. Crop + FarmRecord persistence now share one transaction,
     * so a failure in either canonical mutation rolls back the complete
     * Intake write-set, including their audit/relationship writes.
     */
    return this.prisma.$transaction(async (tx) => {
      let createdCrop: Awaited<ReturnType<CropsService['createFromIntakeInTransaction']>> | undefined;
      if (
        extracted.category === 'PLANTING' &&
        extracted.crop
      ) {
        createdCrop = await this.cropsService.createFromIntakeInTransaction(
          tx,
          dto.farmId,
          {
            name: extracted.crop.name,
            sowingDate: extracted.activity?.sowingDate
              ? new Date(extracted.activity.sowingDate)
              : extracted.activity?.sowingDateUnknown ? undefined : new Date(),
            sowingDateUnknown: extracted.activity?.sowingDateUnknown === true,
            area: extracted.activity?.area,
            unit: extracted.activity?.unit,
          },
          userId,
          role,
        );
      }

      const farmRecord = await this.farmsService.addRecordInTransaction(
        tx,
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
      // Return confirmation of the domain record created in the same transaction.
      // Non-planting intake keeps its historical response shape.
      return createdCrop
        ? { ...farmRecord, createdCrop: { id: createdCrop.id, name: createdCrop.name } }
        : farmRecord;
    });
  }
}

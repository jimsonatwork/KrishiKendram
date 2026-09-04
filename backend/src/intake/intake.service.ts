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

    return this.prisma.farmRecord.create({
      data: {
        farmId: dto.farmId,
        category: extracted.category ?? 'GENERAL',
        title: 'AI Intake Record',
        inputMethod: dto.inputMethod,
        data: extracted,
      },
    });
  }
}
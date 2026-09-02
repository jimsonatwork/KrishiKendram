import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { IntakeExtractorService } from './extractor/intake-extractor.service';

@Injectable()
export class IntakeService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: IntakeExtractorService,
  ) {}

  async create(dto: CreateIntakeDto) {

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
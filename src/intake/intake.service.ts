import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateIntakeDto } from './dto/create-intake.dto';

@Injectable()
export class IntakeService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateIntakeDto) {
    return this.prisma.farmRecord.create({
      data: {
        farmId: dto.farmId,
        category: 'GENERAL',
        title: 'AI Intake Record',
        inputMethod: dto.inputMethod,
        data: {
          raw: dto.content,
          source: 'INTAKE',
        },
      },
    });
  }
}
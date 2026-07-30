import {
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateFarmDto } from './dto/create-farm.dto';

@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    ownerId: string,
    dto: CreateFarmDto,
  ) {
    return this.prisma.farm.create({
      data: {
        ...dto,
        ownerId,
      },
    });
  }

  async findMyFarms(
    ownerId: string,
  ) {
    return this.prisma.farm.findMany({
      where: {
        ownerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAll() {
    return this.prisma.farm.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
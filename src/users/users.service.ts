import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
return this.prisma.user.findMany({
  orderBy: {
    createdAt: 'desc',
  },

  select: {
    id: true,
    name: true,
    email: true,
    mobile: true,
    role: true,
    status: true,
    preferredLanguage: true,
    preferredInputMethod: true,
    profileCompletion: true,
    isVerified: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  },
});
  }

async findByEmailOrMobile(identifier: string) {
  return this.prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { mobile: identifier },
      ],
    },
  });
}

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        role: 'FARMER',
      },
    });
  }
}
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

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

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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
    password: string;
  }) {
    const passwordHash = await bcrypt.hash(
      data.password,
      12,
    );

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'FARMER',
      },
    });

    const {
      passwordHash: _,
      refreshTokenHash,
      ...safeUser
    } = user;

    return safeUser;
  }
  
  async update(
    id: string,
    data: {
      role?: UserRole;
      status?: UserStatus;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });

      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      const isLastActiveSuperAdmin =
        currentUser.role === UserRole.SUPER_ADMIN &&
        currentUser.status === UserStatus.ACTIVE &&
        ((data.role !== undefined && data.role !== UserRole.SUPER_ADMIN) ||
          (data.status !== undefined && data.status !== UserStatus.ACTIVE));

      if (isLastActiveSuperAdmin) {
        const activeSuperAdminCount = await tx.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
          },
        });

        if (activeSuperAdminCount <= 1) {
          throw new BadRequestException(
            'Cannot demote or disable the last active SUPER_ADMIN',
          );
        }
      }

      return tx.user.update({
        where: {
          id,
        },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });
    });
  }
  
}

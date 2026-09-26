import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import {
  UserStatus,
} from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { generateMemberId } from '../platform/identity/member-id';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../platform/audit/audit.service';
import { RegistryService } from '../platform/registry/registry.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly registry: RegistryService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const name =
      this.validateUserField(
        'name',
        dto.name,
      ) as string;

    let normalizedEmail:
      | string
      | null
      | undefined;

    if (dto.email !== undefined) {
      const value =
        this.validateUserField(
          'email',
          dto.email,
        );

      normalizedEmail =
        value === null ||
        value === undefined
          ? null
          : String(value);
    }

    let normalizedMobile:
      | string
      | null
      | undefined;

    if (dto.mobile !== undefined) {
      const value =
        this.validateUserField(
          'mobile',
          dto.mobile,
        );

      normalizedMobile =
        value === null ||
        value === undefined ||
        value === ''
          ? null
          : String(value);
    }

    const passwordResult =
      this.registry.validateField(
        'userPassword',
        dto.password,
      );

    if (!passwordResult.valid) {
      throw new BadRequestException(
        passwordResult.errors.join(' '),
      );
    }

    let normalizedPreferredLanguage:
      | string
      | null
      | undefined;

    if (
      dto.preferredLanguage !== undefined
    ) {
      const value =
        this.validateUserField(
          'preferredLanguage',
          dto.preferredLanguage,
        );

      normalizedPreferredLanguage =
        value === ''
          ? null
          : String(value);
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      12,
    );

    const user = await this.prisma.user.create({
      data: {
        memberId: generateMemberId(),
        name,
        email: normalizedEmail,
        mobile: normalizedMobile,
        preferredLanguage:
          normalizedPreferredLanguage,
        preferredInputMethod:
          dto.preferredInputMethod,
        passwordHash,
      },
    });

    await this.auditService.create({
      action: 'USER_CREATED',
      resourceType: 'USER',
      resourceId: user.id,
      description: `User ${user.name} registered`,
      metadata: {
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });

    const {
      passwordHash: _,
      ...result
    } = user;

    return result;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { mobile: dto.identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    if (
      user.status === UserStatus.PENDING_DELETE
    ) {
      throw new UnauthorizedException(
        'This account is pending deletion',
      );
    }

    if (
      user.status === UserStatus.DELETED
    ) {
      throw new UnauthorizedException(
        'This account has been deleted',
      );
    }

    if (
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException(
        'This account is suspended',
      );
    }

    if (
      user.status === UserStatus.BLOCKED
    ) {
      throw new UnauthorizedException(
        'This account is blocked',
      );
    }

    if (
      user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException(
        'This account is not active',
      );
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const now = new Date();

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
      );

    const refreshToken =
      await this.jwtService.signAsync(
        payload,
        {
          expiresIn: '7d',
        },
      );

    const refreshTokenHash =
      await bcrypt.hash(
        refreshToken,
        12,
      );

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshTokenHash,
        lastLoginAt: now,
        lastSeenAt: now,
      },
    });

    await this.auditService.create({
      actorId: user.id,
      action: 'LOGIN',
      resourceType: 'USER',
      resourceId: user.id,
      description: `User ${user.name} logged in`,
    });

    const {
      passwordHash,
      refreshTokenHash:
        storedRefreshTokenHash,
      failedLoginCount,
      lockedUntil,
      ...safeUser
    } = {
      ...user,
      lastLoginAt: now,
      lastSeenAt: now,
    };

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }

  async me(userId: string) {
    const dbUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastSeenAt: new Date(),
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
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return dbUser;
  }

  async logout(userId: string) {
    const now = new Date();

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenHash: null,
        lastSeenAt: now,
      },
    });

    await this.auditService.create({
      actorId: userId,
      action: 'LOGOUT',
      resourceType: 'USER',
      resourceId: userId,
      description: 'User logged out',
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload =
      await this.jwtService.verifyAsync(
        dto.refreshToken,
      );

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

    if (
      !user ||
      !user.refreshTokenHash
    ) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    if (
      user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException(
        'This account is not active',
      );
    }

    const valid = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!valid) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const newPayload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken =
      await this.jwtService.signAsync(
        newPayload,
      );

    const refreshToken =
      await this.jwtService.signAsync(
        newPayload,
        {
          expiresIn: '7d',
        },
      );

    const refreshTokenHash =
      await bcrypt.hash(
        refreshToken,
        12,
      );

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshTokenHash,
        lastSeenAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private validateUserField(
    fieldName: string,
    value: unknown,
  ): unknown {
    const result =
      this.registry.validateResourceField(
        'user',
        fieldName,
        value,
      );

    if (!result.valid) {
      throw new BadRequestException(
        result.errors.join(' '),
      );
    }

    return result.value;
  }

}

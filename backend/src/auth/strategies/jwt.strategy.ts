import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        'User account not found',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    return {
      userId: user.id,
      role: user.role,
    };
  }
}
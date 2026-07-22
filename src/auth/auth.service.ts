import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.mobile ? { mobile: dto.mobile } : {},
        ],
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Email or mobile already registered',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        mobile: dto.mobile,
        passwordHash,
        preferredLanguage: dto.preferredLanguage ?? 'en',
        preferredInputMethod:
          dto.preferredInputMethod ?? 'MIXED',
      },
    });

    const { passwordHash: _, ...result } = user;

    return result;
  }
}
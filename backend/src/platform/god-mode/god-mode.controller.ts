import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { AuthorityTier, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemTruthService } from '../registry/system-truth.service';
import { GodModeService } from './god-mode.service';

@Controller('admin/god-mode')
@UseGuards(JwtAuthGuard)
export class GodModeController {
  constructor(
    private readonly godMode: GodModeService,
    private readonly systemTruth: SystemTruthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('system-truth')
  async systemTruthView(@Req() request: Request) {
    await this.assertGod(request);
    return this.systemTruth.read();
  }

  @Get('credential-status')
  async credentialStatus(@Req() request: Request) {
    await this.assertGod(request);
    return this.godMode.credentialStatus();
  }

  private async assertGod(request: Request): Promise<void> {
    const userId = (request.user as { userId?: string } | undefined)?.userId;
    if (!userId) throw new ForbiddenException('God Mode identity required.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, authorityTier: true },
    });

    if (
      user?.authorityTier !== AuthorityTier.SYSTEM_GOD ||
      user.email?.toLowerCase() !== GodModeService.GOD_EMAIL ||
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('God Mode identity required.');
    }
  }
}

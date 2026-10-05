import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthorityTier, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemTruthService } from '../registry/system-truth.service';
import { GodModeService } from './god-mode.service';
import { GodConfigurationService } from './god-configuration.service';

@Controller('admin/god-mode')
@UseGuards(JwtAuthGuard)
export class GodModeController {
  constructor(
    private readonly godMode: GodModeService,
    private readonly systemTruth: SystemTruthService,
    private readonly prisma: PrismaService,
    private readonly configuration: GodConfigurationService,
  ) {}

  @Get('overview')
  async overview(@Req() request: Request) {
    await this.assertGod(request);
    const truth = await this.systemTruth.read();
    const [users, activeUsers, superAdmins, gods, modules, resources, fields, permissions, recentAudit] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } }),
        this.prisma.user.count({ where: { authorityTier: AuthorityTier.SYSTEM_GOD } }),
        this.prisma.entity.count(),
        this.prisma.entity.count(),
        this.prisma.fieldPermission.count(),
        this.prisma.permission.count(),
        this.prisma.auditEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, action: true, resourceType: true, resourceId: true, description: true, createdAt: true },
        }).catch(() => []),
      ]);

    return {
      identity: truth.authority.god,
      root: truth.root,
      runtime: truth.runtime,
      paths: truth.paths,
      environmentKeys: truth.configuration.environmentKeys,
      credentialPolicy: truth.credentialPolicy,
      registry: truth.registry,
      controlPlane: truth.godModeControlPlane,
      startupInvariant: truth.startupInvariant,
      health: { api: true },
      counts: { users, activeUsers, superAdmins, systemGods: gods, modules, resources, fields, permissions },
      credential: await this.godMode.credentialStatus(),
      recentAudit,
      recovery: { singletonEnforced: gods === 1, canonicalIdentityPresent: true, protected: true },
    };
  }

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

  @Get('validation-policy')
  async validationPolicy(@Req() request: Request) {
    await this.assertGod(request);
    return this.configuration.getValidationPolicy();
  }

  @Patch('validation-policy')
  async updateValidationPolicy(@Req() request: Request, @Body() body: { value?: unknown }) {
    await this.assertGod(request);
    const actorId = (request.user as { userId?: string }).userId;
    if (!actorId) throw new ForbiddenException('God Mode identity required.');
    return this.configuration.updateValidationPolicy(body?.value, actorId);
  }

  @Get('configuration')
  async configurationList(@Req() request: Request) {
    await this.assertGod(request);
    return this.configuration.list();
  }

  @Get('configuration/:stableId')
  async configurationGet(@Req() request: Request, @Param('stableId') stableId: string) {
    await this.assertGod(request);
    return this.configuration.get(stableId);
  }

  @Get('configuration/:stableId/snapshots')
  async configurationSnapshots(@Req() request: Request, @Param('stableId') stableId: string) {
    await this.assertGod(request);
    return this.configuration.snapshots(stableId);
  }

  @Post('configuration/:stableId/rollback/:version')
  async configurationRollback(@Req() request: Request, @Param('stableId') stableId: string, @Param('version') version: string) {
    await this.assertGod(request);
    const actorId = (request.user as { userId?: string }).userId;
    if (!actorId) throw new ForbiddenException('God Mode identity required.');
    return this.configuration.rollback(stableId, Number(version), actorId);
  }

  @Patch('configuration/:stableId')
  async configurationUpdate(
    @Req() request: Request,
    @Param('stableId') stableId: string,
    @Body() body: { value?: unknown; reason?: string },
  ) {
    await this.assertGod(request);
    const actorId = (request.user as { userId?: string }).userId;
    if (!actorId) throw new ForbiddenException('God Mode identity required.');
    return this.configuration.update(stableId, body?.value, actorId, body?.reason);
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

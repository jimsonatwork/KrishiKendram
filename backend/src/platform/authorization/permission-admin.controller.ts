import { Body, Controller, Get, Param, Patch, Req, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthorityTier, UserRole } from '@prisma/client';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthorizationAction } from './authorization.types';
import { AuthorizationService } from './authorization.service';
import { PermissionService } from './permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegistryService } from '../registry/registry.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; role: UserRole };
}

@Controller('platform/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionAdminController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly permissions: PermissionService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly registry: RegistryService,
  ) {}

  private async assertCanManageMatrix(request: AuthenticatedRequest) {
    const actor = await this.prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { role: true, authorityTier: true, status: true },
    });
    if (!actor || actor.status !== 'ACTIVE' ||
      actor.role !== UserRole.ADMIN && actor.role !== UserRole.SUPER_ADMIN &&
      actor.authorityTier !== AuthorityTier.SYSTEM_GOD) {
      throw new ForbiddenException('Admin, Super Admin, or God Mode authority is required.');
    }
    return actor;
  }

  @Get('access-matrix/settings')
  async getAccessMatrixSettings(@Req() request: AuthenticatedRequest) {
    await this.assertCanManageMatrix(request);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'platform.accessMatrix.enabled' } });
    return { enabled: setting?.value === true || (typeof setting?.value === 'object' && setting?.value !== null && (setting.value as { enabled?: boolean }).enabled === true) };
  }

  @Patch('access-matrix/settings')
  async setAccessMatrixSettings(@Body() body: { enabled?: boolean; reason?: string }, @Req() request: AuthenticatedRequest) {
    await this.assertCanManageMatrix(request);
    if (typeof body.enabled !== 'boolean') throw new ForbiddenException('A boolean enabled value is required.');
    if (!body.reason?.trim()) throw new ForbiddenException('A reason is required for this platform setting change.');
    const key = 'platform.accessMatrix.enabled';
    const current = await this.prisma.systemSetting.findUnique({ where: { key } });
    const value = { enabled: body.enabled, reason: body.reason.trim(), changedBy: request.user.userId, changedAt: new Date().toISOString() };
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { id: 'platform-access-matrix-enabled', key, value, category: 'authorization', label: 'User access matrix visibility', editable: true },
      update: { value, category: 'authorization', label: 'User access matrix visibility', editable: true },
    });
    await this.audit.create({
      actorId: request.user.userId,
      action: 'TOGGLE_USER_ACCESS_MATRIX',
      resourceType: 'SystemSetting',
      resourceId: key,
      description: 'Changed user access matrix visibility.',
      metadata: { previous: current?.value ?? { enabled: false }, enabled: body.enabled, reason: body.reason.trim() },
    });
    return { enabled: body.enabled };
  }

  @Get('users/:userId/access-matrix')
  async getUserAccessMatrix(@Param('userId') userId: string, @Req() request: AuthenticatedRequest) {
    await this.assertCanManageMatrix(request);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'platform.accessMatrix.enabled' } });
    const enabled = setting?.value === true || (typeof setting?.value === 'object' && setting?.value !== null && (setting.value as { enabled?: boolean }).enabled === true);
    if (!enabled) throw new ForbiddenException('User access matrix visibility is disabled by platform administration.');
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, status: true, authorityTier: true } });
    if (!target) throw new NotFoundException('User not found.');
    const persisted = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }, { scope: 'asc' }],
      include: {
        rolePermissions: { where: { role: target.role }, select: { role: true } },
        accessGrants: { where: { OR: [{ userId: target.id }, { subjectType: 'USER', subjectId: target.id }] }, select: { userId: true, subjectType: true, subjectId: true, effect: true } },
      },
    });
    const declarations = this.registry.getAll().flatMap((resource) =>
      (resource.capabilities ?? []).flatMap((capability) =>
        capability.scopes.map((scope) => {
          const permission = persisted.find((item) =>
            item.module === resource.module && item.resource === resource.name &&
            item.action === capability.action && item.scope === scope,
          );
          return {
            module: resource.module, section: null, resource: resource.name,
            action: capability.action, scope,
            roleGranted: Boolean(permission?.rolePermissions.length),
            userGrants: (permission?.accessGrants ?? []).map((grant) => ({ effect: grant.effect, subjectType: grant.subjectType })),
            permissionPersisted: Boolean(permission),
          };
        }),
      ),
    );
    return {
      user: target,
      generatedAt: new Date().toISOString(),
      note: 'Registry-declared actions are listed even when no grant exists. Configured role and user-specific grants only; resource ownership, farm relationships, feature switches, account status, and contextual policies may further restrict an action at request time.',
      permissions: declarations,
    };
  }

  @Get('reconciliation')
  async getReconciliation(@Req() request: AuthenticatedRequest) {
    await this.authorization.assertCan({
      user: request.user,
      module: 'platform',
      resource: 'permission',
      action: AuthorizationAction.READ,
    });

    return this.permissions.getRegistryReconciliation();
  }

  @Get()
  async getAll(@Req() request: AuthenticatedRequest) {
    await this.authorization.assertCan({
      user: request.user,
      module: 'platform',
      resource: 'permission',
      action: AuthorizationAction.READ,
    });

    return this.permissions.listForAdministration();
  }
}

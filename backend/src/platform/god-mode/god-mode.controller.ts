import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthorityTier, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemTruthService } from '../registry/system-truth.service';
import { AuditService } from '../audit/audit.service';
import { RegistryService } from '../registry/registry.service';
import { ModuleLifecycleService } from '../registry/module-lifecycle.service';
import { GodModeService } from './god-mode.service';
import { GodConfigurationService } from './god-configuration.service';
import { GodDatabaseCredentialService } from './god-database-credential.service';

@Controller('admin/god-mode')
@UseGuards(JwtAuthGuard)
export class GodModeController {
  constructor(
    private readonly godMode: GodModeService,
    private readonly systemTruth: SystemTruthService,
    private readonly prisma: PrismaService,
    private readonly configuration: GodConfigurationService,
    private readonly audit: AuditService,
    private readonly registry: RegistryService,
    private readonly lifecycle: ModuleLifecycleService,
    private readonly databaseCredentials: GodDatabaseCredentialService,
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

  @Get('database-credential')
  async databaseCredential(@Req() request: Request) {
    await this.assertGod(request);
    return this.databaseCredentials.status();
  }

  @Post('database-credential/rotate')
  async rotateDatabaseCredential(
    @Req() request: Request,
    @Body() body: { newPassword?: string; reason?: string },
  ) {
    await this.assertGod(request);
    const actorId = (request.user as { userId?: string }).userId;
    if (!actorId) throw new ForbiddenException('God Mode identity required.');
    return this.databaseCredentials.rotatePassword(body?.newPassword ?? '', actorId, body?.reason);
  }

  @Get('authority')
  async authority(@Req() request: Request) {
    await this.assertGod(request);
    const [permissions, rolePermissions] = await Promise.all([
      this.prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }, { scope: 'asc' }],
      }),
      this.prisma.rolePermission.findMany({
        include: { permission: true },
        orderBy: [{ role: 'asc' }, { permission: { module: 'asc' } }],
      }),
    ]);
    return { roles: Object.values(UserRole), permissions, rolePermissions };
  }

  @Patch('authority/role-permission')
  async updateRolePermission(
    @Req() request: Request,
    @Body() body: {
      role: UserRole;
      module: string;
      section?: string | null;
      resource?: string | null;
      action: string;
      scope: string;
      enabled: boolean;
      reason?: string;
    },
  ) {
    await this.assertGod(request);
    const actorId = (request.user as { userId?: string }).userId;
    if (!actorId) throw new ForbiddenException('God Mode identity required.');
    if (!body?.role || !body.module?.trim() || !body.action?.trim() || !body.scope?.trim()) {
      throw new ForbiddenException('Role, module, action and scope are required.');
    }

    const module = body.module.trim();
    const section = body.section?.trim() || null;
    const resource = body.resource?.trim() || null;
    const action = body.action.trim();
    const scope = body.scope.trim();

    let permission = await this.prisma.permission.findFirst({
      where: { module, section, resource, action, scope },
    });
    if (!permission) {
      permission = await this.prisma.permission.create({
        data: { module, section, resource, action, scope },
      });
    }

    if (body.enabled) {
      await this.prisma.rolePermission.upsert({
        where: { role_permissionId: { role: body.role, permissionId: permission.id } },
        create: { role: body.role, permissionId: permission.id },
        update: {},
      });
    } else {
      await this.prisma.rolePermission.deleteMany({ where: { role: body.role, permissionId: permission.id } });
    }

    await this.audit.create({
      actorId,
      action: 'GOD_AUTHORITY_POLICY_UPDATED',
      resourceType: 'ROLE_PERMISSION',
      resourceId: permission.id,
      description: body.enabled
        ? `God enabled ${body.role} permission ${body.module}:${body.action}:${body.scope}.`
        : `God disabled ${body.role} permission ${body.module}:${body.action}:${body.scope}.`,
      metadata: {
        role: body.role,
        module: body.module.trim(),
        section: body.section?.trim() || null,
        resource: body.resource?.trim() || null,
        action: body.action.trim(),
        scope: body.scope.trim(),
        enabled: body.enabled,
        reason: body.reason?.trim() || null,
      },
    });

    return { role: body.role, permission, enabled: body.enabled };
  }

  @Get('capabilities')
  async capabilities(@Req() request: Request) {
    await this.assertGod(request);
    const resources = this.registry.getAll();
    const permissions = await this.prisma.permission.findMany({
      where: { resource: { not: null } },
      include: { rolePermissions: true },
      orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }, { scope: 'asc' }],
    });
    const declarations = resources.flatMap((resource) =>
      (resource.capabilities ?? []).flatMap((capability) =>
        capability.scopes.map((scope) => ({
          module: resource.module, resource: resource.name,
          action: capability.action, scope,
        })),
      ),
    );
    const declaredKeys = new Set(
      declarations.map((item) => item.module + '|' + item.resource + '|' + item.action + '|' + item.scope),
    );
    return {
      declarations,
      policies: permissions
        .filter((permission) =>
          declaredKeys.has(permission.module + '|' + permission.resource + '|' + permission.action + '|' + permission.scope),
        )
        .map((permission) => ({
          id: permission.id, module: permission.module, resource: permission.resource,
          action: permission.action, scope: permission.scope,
          roles: permission.rolePermissions.map((entry) => entry.role),
        })),
    };
  }

  @Patch('capabilities/role-policy')
  async updateCapabilityPolicy(
    @Req() request: Request,
    @Body() body: {
      role: UserRole; module: string; resource: string; action: string;
      scope: string; enabled: boolean; reason?: string;
    },
  ) {
    await this.assertGod(request);
    const actorId = (request.user as { userId?: string }).userId;
    if (!actorId) throw new ForbiddenException('God Mode identity required.');

    const module = body?.module?.trim();
    const resourceName = body?.resource?.trim();
    const action = body?.action?.trim();
    const scope = body?.scope?.trim();
    if (!body?.role || !module || !resourceName || !action || !scope) {
      throw new ForbiddenException('Role, module, resource, action and scope are required.');
    }

    const resource = this.registry.get(resourceName);
    if (!resource || resource.module !== module) {
      throw new ForbiddenException(`Resource '${resourceName}' is not registered under module '${module}'.`);
    }
    const capability = resource.capabilities?.find(
      (entry) => entry.action === action && entry.scopes.includes(scope as never),
    );
    if (!capability) {
      throw new ForbiddenException(
        `Capability '${module}:${resourceName}:${action}:${scope}' is not declared by the canonical Registry.`,
      );
    }

    let permission = await this.prisma.permission.findFirst({
      where: { module, section: null, resource: resourceName, action, scope },
    });
    if (!permission) {
      permission = await this.prisma.permission.create({
        data: { module, section: null, resource: resourceName, action, scope },
      });
    }

    if (body.enabled) {
      await this.prisma.rolePermission.upsert({
        where: { role_permissionId: { role: body.role, permissionId: permission.id } },
        create: { role: body.role, permissionId: permission.id }, update: {},
      });
    } else {
      await this.prisma.rolePermission.deleteMany({
        where: { role: body.role, permissionId: permission.id },
      });
    }

    await this.audit.create({
      actorId, action: 'GOD_CAPABILITY_POLICY_UPDATED',
      resourceType: 'RESOURCE_CAPABILITY', resourceId: permission.id,
      description: body.enabled
        ? `God enabled ${body.role} capability ${module}:${resourceName}:${action}:${scope}.`
        : `God disabled ${body.role} capability ${module}:${resourceName}:${action}:${scope}.`,
      metadata: {
        role: body.role, module, resource: resourceName, action, scope,
        enabled: body.enabled, reason: body.reason?.trim() || null,
      },
    });
    return { role: body.role, module, resource: resourceName, action, scope, enabled: body.enabled, permission };
  }

  @Get('modules')
  async modules(@Req() request: Request) {
    await this.assertGod(request);
    return this.registry.getAllModules().map((module) => ({
      ...module,
      status: this.lifecycle.getStatus(module.id),
    }));
  }

  @Patch('modules/:moduleId/lifecycle')
  async updateModuleLifecycle(
    @Req() request: Request,
    @Param('moduleId') moduleId: string,
    @Body() body: { lifecycle?: 'ACTIVE' | 'DISABLED' | 'DEPRECATED'; reason?: string },
  ) {
    await this.assertGod(request);
    const actorId = (request.user as { userId?: string }).userId;
    if (!actorId) throw new ForbiddenException('God Mode identity required.');
    if (!body?.lifecycle) throw new ForbiddenException('Lifecycle state is required.');

    const current = this.registry.getModule(moduleId);
    if (!current) throw new ForbiddenException(`Module '${moduleId}' is not registered.`);
    this.lifecycle.assertTransitionAllowed(current.lifecycle, body.lifecycle);
    if (body.lifecycle !== 'DISABLED' && this.lifecycle.getUnavailableDependencies(moduleId).length) {
      throw new ForbiddenException('Module dependencies are not operational.');
    }

    const updated = this.registry.setModuleLifecycle(moduleId, body.lifecycle);
    await this.audit.create({
      actorId,
      action: 'GOD_MODULE_LIFECYCLE_UPDATED',
      resourceType: 'MODULE',
      resourceId: moduleId,
      description: `God changed module '${moduleId}' from ${current.lifecycle} to ${body.lifecycle}.`,
      metadata: { from: current.lifecycle, to: body.lifecycle, reason: body.reason?.trim() || null },
    });
    return { ...updated, status: this.lifecycle.getStatus(moduleId) };
  }

  @Get('resources')
  async resources(@Req() request: Request) {
    await this.assertGod(request);
    return this.registry.getAll();
  }

  @Get('fields')
  async fields(@Req() request: Request) {
    await this.assertGod(request);
    return this.registry.getAllFields();
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

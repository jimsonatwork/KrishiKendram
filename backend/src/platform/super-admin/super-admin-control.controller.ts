import { Body, Controller, Get, Param, Patch, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionService } from '../authorization/permission.service';
import { RegistryService } from '../registry/registry.service';
import { ModuleLifecycleService } from '../registry/module-lifecycle.service';
import { CredentialArtifactService } from '../../credential-artifact.service';

type SuperAdminRequest = {
  user?: { userId?: string; role?: UserRole };
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Controller('admin/super-control')
@UseGuards(JwtAuthGuard)
export class SuperAdminControlController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: RegistryService,
    private readonly lifecycle: ModuleLifecycleService,
    private readonly permissions: PermissionService,
    private readonly audit: AuditService,
    private readonly credentialArtifacts: CredentialArtifactService,
  ) {}

  private assertSuperAdmin(request: SuperAdminRequest): void {
    if (request.user?.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Super Admin access required.');
    }
  }

  @Get('overview')
  async overview(@Req() request: SuperAdminRequest) {
    this.assertSuperAdmin(request);
    const [users, reconciliation, audit, credentials] = await Promise.all([
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.permissions.getRegistryReconciliation(),
      this.audit.getRecentActivity(12),
      this.credentialArtifacts.status(),
    ]);
    const modules = this.registry.getAllModules();
    const moduleStatus = modules.map((module) => this.lifecycle.getStatus(module.id)).filter(Boolean);
    const rawDatabaseUrl = process.env.DATABASE_URL ?? '';
    let database = { provider: 'postgresql', host: '', port: '5432', database: '', username: '' };
    try {
      const url = new URL(rawDatabaseUrl);
      database = {
        provider: url.protocol.replace(':', ''),
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.replace(/^\//, ''),
        username: url.username,
      };
    } catch {}
    return {
      version: 2,
      identity: { controlPlane: 'SUPER_ADMIN', currentRole: request.user?.role ?? null },
      overview: {
        users: users.reduce((sum, item) => sum + item._count._all, 0),
        activeUsers: users.find((item) => item.status === 'ACTIVE')?._count._all ?? 0,
        modules: modules.length,
        resources: this.registry.getAll().length,
        fields: this.registry.getAllFields().length,
        permissions: reconciliation.summary.persistedResourcePermissionCount,
        permissionCoverage: reconciliation.summary.declaredCount
          ? Math.round((reconciliation.summary.coveredCount / reconciliation.summary.declaredCount) * 100)
          : 0,
        auditEvents: audit.length,
      },
      modules: moduleStatus,
      resources: this.registry.getAll().map((resource) => ({
        name: resource.name,
        module: resource.module,
        capabilities: resource.capabilities ?? [],
      })),
      usersByStatus: users.map((item) => ({ status: item.status, count: item._count._all })),
      permissions: reconciliation,
      audit,
      database,
      credentialArtifacts: credentials,
      controls: {
        uiTheme: true,
        audit: true,
        perUserAccess: true,
        perModuleAccess: true,
        resourceCrud: true,
        lifecycle: true,
        databaseParameters: true,
        credentialArtifacts: true,
        rolePermissionControl: true,
      },
    };
  }

  @Get('audit')
  async auditEvents(@Req() request: SuperAdminRequest, @Query('limit') limit?: string) {
    this.assertSuperAdmin(request);
    const parsed = Math.min(Math.max(Number.parseInt(limit ?? '100', 10) || 100, 1), 500);
    return this.audit.getRecentActivity(parsed);
  }

  @Get('roles')
  async roles(@Req() request: SuperAdminRequest) {
    this.assertSuperAdmin(request);
    const [users, rolePermissions] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.rolePermission.groupBy({ by: ['role'], _count: { _all: true } }),
    ]);
    return Object.values(UserRole).map((role) => ({
      role,
      userCount: users.find((item) => item.role === role)?._count._all ?? 0,
      permissionCount: rolePermissions.find((item) => item.role === role)?._count._all ?? 0,
    }));
  }

  @Get('roles/:role/permissions')
  async rolePermissions(@Param('role') roleName: string, @Req() request: SuperAdminRequest) {
    this.assertSuperAdmin(request);
    const role = this.parseRole(roleName);
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }, { scope: 'asc' }],
      select: {
        id: true,
        module: true,
        section: true,
        resource: true,
        action: true,
        scope: true,
        inherited: true,
        rolePermissions: { where: { role }, select: { role: true } },
      },
    });
  }

  @Patch('roles/:role/permissions')
  async setRolePermissions(
    @Param('role') roleName: string,
    @Body() body: { permissionIds?: string[] },
    @Req() request: SuperAdminRequest,
  ) {
    this.assertSuperAdmin(request);
    const role = this.parseRole(roleName);
    const permissionIds = [...new Set(Array.isArray(body.permissionIds) ? body.permissionIds.filter(Boolean) : [])];

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
      });
      const allowed = new Set(existing.map((item) => item.id));
      const validIds = permissionIds.filter((id) => allowed.has(id));

      await tx.rolePermission.deleteMany({ where: { role } });
      if (validIds.length) {
        await tx.rolePermission.createMany({
          data: validIds.map((permissionId) => ({ role, permissionId })),
          skipDuplicates: true,
        });
      }
      return { role, permissionIds: validIds };
    });

    await this.audit.create({
      actorId: request.user?.userId ?? null,
      action: 'UPDATE_ROLE_PERMISSIONS',
      resourceType: 'RolePermission',
      resourceId: role,
      description: `Updated permissions for role ${role}.`,
      metadata: { role, permissionCount: result.permissionIds.length },
      ipAddress: request.ip ?? null,
      userAgent: typeof request.headers?.['user-agent'] === 'string' ? request.headers['user-agent'] : null,
    });
    return result;
  }

  @Get('validations')
  async validations(@Req() request: SuperAdminRequest) {
    this.assertSuperAdmin(request);
    const fields = this.registry.getAllFields();
    const resources = this.registry.getAll();
    const modules = this.registry.getAllModules();
    return {
      policy: 'CANONICAL_REGISTRY',
      contactPolicy: { emailDuplicate: 'BLOCK', mobileDuplicate: 'TRANSFER_REQUIRED', emailMobileCombinationDuplicate: 'BLOCK' },
      summary: { fields: fields.length, resources: resources.length, modules: modules.length },
      fields: fields.map((field) => ({ name: field.name, type: field.type, validation: field.validation ?? {}, normalization: field.normalization ?? {} })),
    };
  }

  @Get('access/users')
  async userAccess(@Req() request: SuperAdminRequest) {
    this.assertSuperAdmin(request);
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, status: true, isVerified: true },
    });
    return users.map((user) => ({ user, accessModel: 'ROLE_BASED', role: user.role }));
  }

  @Get('access/modules')
  async moduleAccess(@Req() request: SuperAdminRequest) {
    this.assertSuperAdmin(request);
    const modules = this.registry.getAllModules();
    const permissions = await this.prisma.rolePermission.findMany({
      select: { role: true, permission: { select: { module: true, resource: true, action: true, scope: true } } },
    });
    return modules.map((module) => ({
      module: module.id,
      name: module.name,
      dependencies: module.dependencies ?? [],
      access: Object.values(UserRole).map((role) => ({
        role,
        permissions: permissions.filter((item) => item.role === role && item.permission.module === module.id).map((item) => item.permission),
      })),
    }));
  }

  @Get('settings')
  async settings(@Req() request: SuperAdminRequest) {
    this.assertSuperAdmin(request);
    const modules = this.registry.getAllModules();
    const resources = this.registry.getAll();
    const fields = this.registry.getAllFields();
    return {
      version: 1,
      source: 'PERSISTED_PLATFORM_CONTROL',
      controlPlane: 'SUPER_ADMIN',
      registry: { policy: 'CANONICAL_REGISTRY', modules: modules.length, resources: resources.length, fields: fields.length },
      access: { model: 'ROLE_BASED', perUser: true, perModule: true, rolePermission: true },
      lifecycle: { managed: true, persisted: true, audited: true },
      security: { secretsMaskedByDefault: true, credentialArtifactsManaged: true },
      runtime: { healthChecks: true, routeInventory: true },
    };
  }

  @Get('connections')
  async connections(@Req() request: SuperAdminRequest, @Query('reveal') reveal?: string) {
    this.assertSuperAdmin(request);
    const sensitive = reveal === 'true';
    const raw = process.env.DATABASE_URL ?? '';
    let database: Record<string, unknown> = { provider: 'postgresql', host: '', port: '5432', database: '', username: '', password: sensitive ? '' : '••••••••••••', databaseUrl: sensitive ? raw : '••••••••••••', sensitiveRevealed: sensitive };
    try {
      const url = new URL(raw);
      database = { provider: url.protocol.replace(':', ''), host: url.hostname, port: url.port || '5432', database: url.pathname.replace(/^\//, ''), username: url.username, password: sensitive ? url.password : '••••••••••••', databaseUrl: sensitive ? raw : '••••••••••••', sensitiveRevealed: sensitive };
    } catch {}
    const credentials = await this.credentialArtifacts.status();
    return {
      version: 1,
      connections: [
        { id: 'database', name: 'Primary Database', type: 'DATABASE', status: database.host ? 'CONFIGURED' : 'NOT_CONFIGURED', configuration: database },
        { id: 'backend-api', name: 'Backend API', type: 'SERVICE', status: 'HEALTHY', basePath: '/api/v1' },
        { id: 'registry', name: 'Canonical Registry', type: 'SERVICE', status: 'HEALTHY', modules: this.registry.getAllModules().length, resources: this.registry.getAll().length },
        { id: 'credentials', name: 'Credential Artifacts', type: 'CREDENTIALS', status: 'CONFIGURED', artifactDirectory: credentials.artifactDirectory, files: credentials.files },
        { id: 'runtime', name: 'Application Runtime', type: 'RUNTIME', status: 'HEALTHY' },
      ],
      routes: ['/api/v1/registry', '/api/v1/platform/permissions', '/api/v1/platform/audit', '/api/v1/admin/super-control'],
    };
  }

  private parseRole(roleName: string): UserRole {
    const normalized = roleName.toUpperCase() as UserRole;
    if (!Object.values(UserRole).includes(normalized)) {
      throw new UnauthorizedException(`Unknown role: ${roleName}`);
    }
    return normalized;
  }
}

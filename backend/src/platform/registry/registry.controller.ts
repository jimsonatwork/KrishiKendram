import {
  Controller,
  Get,
  Patch,
  Body,
  Header,
  ForbiddenException,
  NotFoundException,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ModuleLifecycleService } from './module-lifecycle.service';
import { AuditService } from '../audit/audit.service';
import { credentialDeliveryRegistry } from './credential-delivery';
import { RegistryService } from './registry.service';
import { FilesystemRegistryService } from './filesystem-registry.service';
import { CredentialArtifactService } from '../../credential-artifact.service';

@Controller('registry')
@UseGuards(JwtAuthGuard)
export class RegistryController {
  constructor(
    private readonly registry: RegistryService,
    private readonly lifecycle: ModuleLifecycleService,
    private readonly audit: AuditService,
    private readonly filesystem: FilesystemRegistryService,
    private readonly credentialArtifacts: CredentialArtifactService,
  ) {}

  private assertSuperAdmin(request: { user?: { role?: UserRole } }): void {
    if (request.user?.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Super Admin access required.');
    }
  }

  @Get()
  getAll(@Req() request: { user?: { role?: UserRole } }) {
    this.assertSuperAdmin(request);
    return this.registry.getAll();
  }

  @Get('filesystem')
  getFilesystem(@Req() request: { user?: { role?: UserRole } }) {
    this.assertSuperAdmin(request);
    return this.filesystem.getDefinition();
  }

  @Get('credential-artifacts')
  getCredentialArtifacts(@Req() request: { user?: { role?: UserRole } }) {
    this.assertSuperAdmin(request);
    return this.credentialArtifacts.status();
  }

  @Get('credential-artifacts/settings')
  getCredentialArtifactSettings(@Req() request: { user?: { role?: UserRole } }) {
    this.assertSuperAdmin(request);
    return this.credentialArtifacts.getSettings();
  }

  @Patch('credential-artifacts/settings')
  async updateCredentialArtifactSettings(
    @Req() request: { user?: { role?: UserRole } },
    @Body() body: { createPatternFile?: boolean; createPasswordFile?: boolean },
  ) {
    this.assertSuperAdmin(request);
    return this.credentialArtifacts.updateSettings(body);
  }

  @Get('database-parameters')
  getDatabaseParameters(@Req() request: { user?: { role?: UserRole } }) {
    this.assertSuperAdmin(request);
    return this.databaseParameters(false);
  }

  @Get('database-parameters/reveal')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  async revealDatabaseParameters(@Req() request: { user?: { role?: UserRole; userId?: string }; ip?: string; headers?: Record<string, string | string[] | undefined> }) {
    this.assertSuperAdmin(request);
    if (!credentialDeliveryRegistry.sensitiveInformation.viewEnabled) {
      throw new ForbiddenException('Sensitive information viewing is disabled by the Registry.');
    }
    const result = this.databaseParameters(true);
    await this.audit.create({ actorId: request.user?.userId ?? null, action: 'VIEW_SENSITIVE_DATABASE_CONFIGURATION', resourceType: 'DatabaseConfiguration', description: 'Super Admin revealed database connection credentials.', metadata: { revealed: ['password', 'rawDatabaseUrl'] }, ipAddress: request.ip ?? null, userAgent: typeof request.headers?.['user-agent'] === 'string' ? request.headers['user-agent'] : null });
    return result;
  }

  private databaseParameters(reveal: boolean) {
    const raw = process.env.DATABASE_URL ?? '';
    let url: URL | null = null;
    try { url = raw ? new URL(raw) : null; } catch { url = null; }
    const masked = (value: string) => value ? '••••••••••••' : 'Not configured';
    return { provider: url?.protocol.replace(':', '') || 'postgresql', host: url?.hostname || '', port: url?.port || '5432', database: url?.pathname.replace(/^\//, '') || '', username: url?.username || '', password: reveal ? (url?.password || '') : masked(url?.password || ''), databaseUrl: reveal ? raw : masked(raw), sensitiveRevealed: reveal, sensitiveViewEnabled: credentialDeliveryRegistry.sensitiveInformation.viewEnabled };
  }

  @Get('modules')
  getModules(@Req() request: { user?: { role?: UserRole } }) {
    this.assertSuperAdmin(request);
    return this.registry.getAllModules();
  }

  @Get('fields')
  getFields(@Req() request: { user?: { role?: UserRole } }) {
    this.assertSuperAdmin(request);
    return this.registry.getAllFields();
  }

  @Get('modules/status')
  getModuleStatuses(@Req() request: { user?: { role?: UserRole } }) {
    this.assertSuperAdmin(request);
    return this.registry.getAllModules().map((module) =>
      this.lifecycle.getStatus(module.id),
    );
  }

  @Get(':name')
  getOne(
    @Param('name') name: string,
    @Req() request: { user?: { role?: UserRole } },
  ) {
    this.assertSuperAdmin(request);
    const resource = this.registry.get(name);

    if (!resource) {
      throw new NotFoundException(
        `Resource '${name}' not found`,
      );
    }

    return resource;
  }
}
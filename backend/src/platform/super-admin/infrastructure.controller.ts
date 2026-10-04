import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RegistryService } from '../registry/registry.service'
import { CredentialArtifactService } from '../../credential-artifact.service'

@Controller('admin/connections')
@UseGuards(JwtAuthGuard)
export class InfrastructureController {
  constructor(
    private readonly registry: RegistryService,
    private readonly credentials: CredentialArtifactService,
  ) {}

  @Get('runtime')
  async getRuntime(@Req() request: { user?: { role?: UserRole } }) {
    if (request.user?.role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Super Admin access required.')
    const startedAt = process.env.APP_STARTED_AT ? new Date(process.env.APP_STARTED_AT).toISOString() : null
    return {
      version: 1,
      status: 'HEALTHY',
      service: 'KrishiKendram API',
      node: process.version,
      platform: process.platform,
      pid: process.pid,
      startedAt,
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV ?? 'development',
      docker: { managed: false, status: 'NOT_MANAGED_BY_APPLICATION' },
    }
  }

  @Get()
  async getConnections(@Req() request: { user?: { role?: UserRole } }, @Query('reveal') reveal?: string) {
    if (request.user?.role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Super Admin access required.')
    const sensitive = reveal === 'true'
    const raw = process.env.DATABASE_URL ?? ''
    let database: Record<string, unknown> = { provider: 'postgresql', host: '', port: '5432', database: '', username: '', password: sensitive ? '' : '••••••••••••', databaseUrl: sensitive ? raw : '••••••••••••', sensitiveRevealed: sensitive }
    try {
      const url = new URL(raw)
      database = { provider: url.protocol.replace(':', ''), host: url.hostname, port: url.port || '5432', database: url.pathname.replace(/^\//, ''), username: url.username, password: sensitive ? url.password : '••••••••••••', databaseUrl: sensitive ? raw : '••••••••••••', sensitiveRevealed: sensitive }
    } catch {}
    const credentials = await this.credentials.status()
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
    }
  }
}

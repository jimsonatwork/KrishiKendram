import { Controller, Get, Query, Req } from '@nestjs/common'
import { AuditService } from './audit.service'
import { AuthorizationService } from '../authorization/authorization.service'
import { AuthorizationAction } from '../authorization/authorization.types'

@Controller('platform/audit')
export class AuditAdminController {
  constructor(
    private readonly audit: AuditService,
    private readonly authorization: AuthorizationService,
  ) {}

  @Get('recent')
  async recent(@Req() request: { user?: { id?: string; role?: string } }, @Query('limit') limit?: string) {
    await this.authorization.assertCan({
      user: request.user,
      module: 'platform',
      resource: 'audit',
      action: AuthorizationAction.READ,
    })
    const parsed = Number(limit)
    return this.audit.getRecentActivity(Number.isFinite(parsed) ? parsed : 50)
  }
}

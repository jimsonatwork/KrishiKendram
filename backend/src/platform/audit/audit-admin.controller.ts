import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { AuditService } from './audit.service'
import { AuthorizationService } from '../authorization/authorization.service'
import { AuthorizationAction } from '../authorization/authorization.types'

@Controller('platform/audit')
@UseGuards(JwtAuthGuard)
export class AuditAdminController {
  constructor(
    private readonly audit: AuditService,
    private readonly authorization: AuthorizationService,
  ) {}

  @Get('recent')
  async recent(
    @Req() request: { user?: { userId?: string; role?: UserRole } },
    @Query('limit') limit?: string,
  ) {
    if (!request.user?.userId || !request.user.role) {
      throw new UnauthorizedException('Authentication required.')
    }

    await this.authorization.assertCan({
      user: {
        userId: request.user.userId,
        role: request.user.role,
      },
      module: 'platform',
      resource: 'audit',
      action: AuthorizationAction.READ,
    })

    const parsed = Number(limit)
    return this.audit.getRecentActivity(Number.isFinite(parsed) ? parsed : 50)
  }
}

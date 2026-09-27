import { Module } from '@nestjs/common'

import { AuthorizationModule } from '../authorization/authorization.module'
import { AuditAdminController } from './audit-admin.controller'
import { AuditService } from './audit.service'

@Module({
  imports: [AuthorizationModule],
  controllers: [AuditAdminController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

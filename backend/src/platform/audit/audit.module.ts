import { forwardRef, Module } from '@nestjs/common'

import { AuthorizationModule } from '../authorization/authorization.module'
import { AuditAdminController } from './audit-admin.controller'
import { AuditService } from './audit.service'

@Module({
  imports: [forwardRef(() => AuthorizationModule)],
  controllers: [AuditAdminController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

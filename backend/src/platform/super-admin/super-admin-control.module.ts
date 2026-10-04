import { Module } from '@nestjs/common';
import { SuperAdminControlController } from './super-admin-control.controller';
import { InfrastructureController } from './infrastructure.controller';
import { RegistryModule } from '../registry';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [RegistryModule, AuditModule, AuthorizationModule,],
  controllers: [SuperAdminControlController, InfrastructureController],
})
export class SuperAdminControlModule {}

import { Module } from '@nestjs/common';
import { AuditModule } from '../platform/audit/audit.module';
import { RegistryModule } from '../platform/registry/registry.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({ imports: [AuditModule, RegistryModule], controllers: [FinanceController], providers: [FinanceService], exports: [FinanceService] })
export class FinanceModule {}

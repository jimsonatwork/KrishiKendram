import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RegistryModule } from '../registry/registry.module';
import { GodModeController } from './god-mode.controller';
import { GodModeService } from './god-mode.service';
import { GodConfigurationService } from './god-configuration.service';
import { GodDatabaseCredentialService } from './god-database-credential.service';

@Module({
  imports: [PrismaModule, AuditModule, RegistryModule],
  controllers: [GodModeController],
  providers: [GodModeService, GodConfigurationService],
  exports: [GodModeService, GodConfigurationService],
})
export class GodModeModule {}

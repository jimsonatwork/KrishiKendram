import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RegistryModule } from '../registry/registry.module';
import { GodModeController } from './god-mode.controller';
import { GodModeService } from './god-mode.service';
import { GodConfigurationService } from './god-configuration.service';
import { GodDatabaseCredentialService } from './god-database-credential.service';

@Module({
  imports: [PrismaModule, AuditModule, RegistryModule, AiModule],
  controllers: [GodModeController],
  providers: [GodModeService, GodConfigurationService, GodDatabaseCredentialService],
  exports: [GodModeService, GodConfigurationService],
})
export class GodModeModule {}

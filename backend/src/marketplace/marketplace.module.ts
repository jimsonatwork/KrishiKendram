import { Module } from '@nestjs/common';
import { AuditModule } from '../platform/audit/audit.module';
import { RegistryModule } from '../platform/registry/registry.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [AuditModule, RegistryModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
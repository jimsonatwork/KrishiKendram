import { Module } from '@nestjs/common';
import { AuditModule } from '../platform/audit/audit.module';
import { RegistryModule } from '../platform/registry/registry.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [AuditModule, RegistryModule, InventoryModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
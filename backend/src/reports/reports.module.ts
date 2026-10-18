import { Module } from '@nestjs/common';
import { CropsModule } from '../crops/crops.module';
import { FarmsModule } from '../farms/farms.module';
import { FinanceModule } from '../finance/finance.module';
import { InventoryModule } from '../inventory/inventory.module';
import { LivestockModule } from '../livestock/livestock.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { RegistryModule } from '../platform/registry/registry.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [CropsModule, FarmsModule, FinanceModule, InventoryModule, LivestockModule, MarketplaceModule, RegistryModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

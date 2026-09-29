import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PlatformModule } from '../platform/platform.module';
import { AuditModule } from '../platform/audit/audit.module';

import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { FarmResourceLifecycleService } from './farm-resource-lifecycle.service';
import { FarmResourceLineageService } from './farm-resource-lineage.service';
import { FarmAssetCustodyService } from './farm-asset-custody.service';
import { FarmAssetLeaseService } from './farm-asset-lease.service';


@Module({

imports:[
 PrismaModule,
 PlatformModule,
 AuditModule,
],

controllers:[
 FarmsController,
],

providers:[
 FarmsService,
 FarmResourceLifecycleService,
 FarmResourceLineageService,
 FarmAssetCustodyService,
 FarmAssetLeaseService,
],

exports:[
 FarmsService,
],

})
export class FarmsModule {}

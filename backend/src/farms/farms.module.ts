import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PlatformModule } from '../platform/platform.module';

import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { FarmResourceLifecycleService } from './farm-resource-lifecycle.service';
import { FarmResourceLineageService } from './farm-resource-lineage.service';


@Module({

imports:[
 PrismaModule,
 PlatformModule,
],

controllers:[
 FarmsController,
],

providers:[
 FarmsService,
 FarmResourceLifecycleService,
 FarmResourceLineageService,
],

exports:[
 FarmsService,
],

})
export class FarmsModule {}

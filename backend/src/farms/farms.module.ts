import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { FarmResourceLifecycleService } from './farm-resource-lifecycle.service';


@Module({

imports:[
 PrismaModule,
],

controllers:[
 FarmsController,
],

providers:[
 FarmsService,
 FarmResourceLifecycleService,
],

exports:[
 FarmsService,
],

})
export class FarmsModule {}

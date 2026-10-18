import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../platform/authorization/authorization.module';
import { AuditModule } from '../platform/audit/audit.module';
import { RelationshipsModule } from '../platform/relationships/relationships.module';
import { LivestockController } from './livestock.controller';
import { LivestockService } from './livestock.service';
import { LivestockRecordsController } from './livestock-records.controller';
import { LivestockRecordsService } from './livestock-records.service';

@Module({
  imports: [PrismaModule, AuthorizationModule, AuditModule, RelationshipsModule],
  controllers: [LivestockController, LivestockRecordsController],
  providers: [LivestockService, LivestockRecordsService],
  exports: [LivestockService],
})
export class LivestockModule {}
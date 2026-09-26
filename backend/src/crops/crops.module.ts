import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../platform/authorization/authorization.module';
import { RelationshipsModule } from '../platform/relationships/relationships.module';

import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';

@Module({
  imports: [PrismaModule, AuthorizationModule, RelationshipsModule],
  controllers: [CropsController],
  providers: [CropsService],
  exports: [CropsService],
})
export class CropsModule {}

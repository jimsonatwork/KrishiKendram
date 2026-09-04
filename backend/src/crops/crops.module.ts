import { Module } from '@nestjs/common';

import { AuthorizationModule } from '../platform/authorization/authorization.module';

import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [CropsController],
  providers: [CropsService],
})
export class CropsModule {}

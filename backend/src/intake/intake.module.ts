import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../platform/authorization/authorization.module';

import { IntakeController } from './intake.controller';
import { IntakeService } from './intake.service';
import { IntakeExtractorService } from './extractor/intake-extractor.service';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
  ],
  controllers: [
    IntakeController,
  ],
  providers: [
    IntakeService,
    IntakeExtractorService,
  ],
})
export class IntakeModule {}
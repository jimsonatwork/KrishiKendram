import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../platform/authorization/authorization.module';
import { FarmsModule } from '../farms/farms.module';
import { CropsModule } from '../crops/crops.module';
import { AiModule } from '../ai/ai.module';

import { IntakeController } from './intake.controller';
import { IntakeService } from './intake.service';
import { IntakeExtractorService } from './extractor/intake-extractor.service';
import { IntakeTranslationService } from './intake-translation.service';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
    FarmsModule,
    CropsModule,
    AiModule,
  ],
  controllers: [
    IntakeController,
  ],
  providers: [
    IntakeService,
    IntakeExtractorService,
    IntakeTranslationService,
  ],
})
export class IntakeModule {}
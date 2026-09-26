import { Module } from '@nestjs/common';

import { AuthorizationModule } from './authorization/authorization.module';
import { RegistryModule } from './registry';
import { RelationshipsModule } from './relationships/relationships.module';
import { MovementsModule } from './relationships/movements.module';
import { LineageModule } from './relationships/lineage.module';
import { EvidenceModule } from './relationships/evidence.module';

@Module({
  imports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
    MovementsModule,
    LineageModule,
    EvidenceModule,
  ],
  exports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
    MovementsModule,
    LineageModule,
    EvidenceModule,
  ],
})
export class PlatformModule {}

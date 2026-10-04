import { Module } from '@nestjs/common';

import { AuthorizationModule } from './authorization/authorization.module';
import { RegistryModule } from './registry';
import { RelationshipsModule } from './relationships/relationships.module';
import { MovementsModule } from './relationships/movements.module';
import { LineageModule } from './relationships/lineage.module';
import { EvidenceModule } from './relationships/evidence.module';
import { SuperAdminControlModule } from './super-admin/super-admin-control.module';

@Module({
  imports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
    MovementsModule,
    LineageModule,
    EvidenceModule,
    SuperAdminControlModule,
  ],
  exports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
    MovementsModule,
    LineageModule,
    EvidenceModule,
    SuperAdminControlModule,
  ],
})
export class PlatformModule {}

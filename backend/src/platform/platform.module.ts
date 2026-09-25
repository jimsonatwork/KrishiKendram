import { Module } from '@nestjs/common';

import { AuthorizationModule } from './authorization/authorization.module';
import { RegistryModule } from './registry';
import { RelationshipsModule } from './relationships/relationships.module';
import { MovementsModule } from './relationships/movements.module';
import { LineageModule } from './relationships/lineage.module';

@Module({
  imports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
    MovementsModule,
    LineageModule,
  ],
  exports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
    MovementsModule,
    LineageModule,
  ],
})
export class PlatformModule {}

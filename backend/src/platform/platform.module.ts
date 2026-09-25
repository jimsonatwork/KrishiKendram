import { Module } from '@nestjs/common';

import { AuthorizationModule } from './authorization/authorization.module';
import { RegistryModule } from './registry';
import { RelationshipsModule } from './relationships/relationships.module';
import { MovementsModule } from './relationships/movements.module';

@Module({
  imports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
    MovementsModule,
  ],
  exports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
    MovementsModule,
  ],
})
export class PlatformModule {}

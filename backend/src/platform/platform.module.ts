import { Module } from '@nestjs/common';

import { AuthorizationModule } from './authorization/authorization.module';
import { RegistryModule } from './registry';
import { RelationshipsModule } from './relationships/relationships.module';

@Module({
  imports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
  ],
  exports: [
    RegistryModule,
    AuthorizationModule,
    RelationshipsModule,
  ],
})
export class PlatformModule {}

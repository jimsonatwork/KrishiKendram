import { Module } from '@nestjs/common';

import { AuthorizationModule } from './authorization/authorization.module';
import { RegistryModule } from './registry';

@Module({
  imports: [
    RegistryModule,
    AuthorizationModule,
  ],
  exports: [
    RegistryModule,
    AuthorizationModule,
  ],
})
export class PlatformModule {}

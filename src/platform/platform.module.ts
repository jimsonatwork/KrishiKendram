import { Module } from '@nestjs/common';
import { RegistryModule } from './registry';

@Module({
  imports: [RegistryModule],
  exports: [RegistryModule],
})
export class PlatformModule {}
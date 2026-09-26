import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { RESOURCE_MOVEMENT_RESOLVER } from './movement-resolution.types';
import { ResourceMovementResolverService } from './movement-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [
    ResourceMovementResolverService,
    {
      provide: RESOURCE_MOVEMENT_RESOLVER,
      useExisting: ResourceMovementResolverService,
    },
  ],
  exports: [RESOURCE_MOVEMENT_RESOLVER],
})
export class MovementsModule {}

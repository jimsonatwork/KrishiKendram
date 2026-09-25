import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { RESOURCE_LINEAGE_RESOLVER } from './lineage-resolution.types';
import { ResourceLineageResolverService } from './lineage-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [
    ResourceLineageResolverService,
    {
      provide: RESOURCE_LINEAGE_RESOLVER,
      useExisting: ResourceLineageResolverService,
    },
  ],
  exports: [RESOURCE_LINEAGE_RESOLVER],
})
export class LineageModule {}

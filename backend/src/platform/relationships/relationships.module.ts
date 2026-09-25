import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import {
  RESOURCE_RELATIONSHIP_RESOLVER,
  ResourceRelationshipResolver,
} from './relationship-resolution.types';
import { ResourceRelationshipResolverService } from './relationship-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [
    ResourceRelationshipResolverService,
    {
      provide: RESOURCE_RELATIONSHIP_RESOLVER,
      useExisting: ResourceRelationshipResolverService,
    },
  ],
  exports: [RESOURCE_RELATIONSHIP_RESOLVER],
})
export class RelationshipsModule {}

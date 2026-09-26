import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import {
  RESOURCE_RELATIONSHIP_RESOLVER,
} from './relationship-resolution.types';
import { RelationshipAccessPolicy } from './relationship-access.policy';
import { ResourceRelationshipResolverService } from './relationship-resolver.service';
import { ResourceRelationshipService } from './relationship.service';

@Module({
  imports: [PrismaModule],
  providers: [
    RelationshipAccessPolicy,
    ResourceRelationshipResolverService,
    ResourceRelationshipService,
    {
      provide: RESOURCE_RELATIONSHIP_RESOLVER,
      useExisting: ResourceRelationshipResolverService,
    },
  ],
  exports: [
    RelationshipAccessPolicy,
    ResourceRelationshipService,
    RESOURCE_RELATIONSHIP_RESOLVER,
  ],
})
export class RelationshipsModule {}

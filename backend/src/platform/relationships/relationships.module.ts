import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

import {
  RESOURCE_RELATIONSHIP_RESOLVER,
} from './relationship-resolution.types';
import { RelationshipAccessPolicy } from './relationship-access.policy';
import { ResourceRelationshipResolverService } from './relationship-resolver.service';
import { ResourceRelationshipService } from './relationship.service';
import { ResourceTransferRequestController } from './transfer-request.controller';
import { ResourceTransferRequestService } from './transfer-request.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ResourceTransferRequestController],
  providers: [
    RelationshipAccessPolicy,
    ResourceRelationshipResolverService,
    ResourceRelationshipService,
    ResourceTransferRequestService,
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

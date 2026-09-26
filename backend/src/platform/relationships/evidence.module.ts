import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { RESOURCE_EVIDENCE_RESOLVER } from './evidence-resolution.types';
import { ResourceEvidenceResolverService } from './evidence-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [
    ResourceEvidenceResolverService,
    {
      provide: RESOURCE_EVIDENCE_RESOLVER,
      useExisting: ResourceEvidenceResolverService,
    },
  ],
  exports: [RESOURCE_EVIDENCE_RESOLVER],
})
export class EvidenceModule {}

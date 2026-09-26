import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ResourceEvidence } from './evidence.types';
import {
  ResourceEvidenceQuery,
  ResourceEvidenceResolution,
  ResourceEvidenceResolver,
} from './evidence-resolution.types';

@Injectable()
export class ResourceEvidenceResolverService
  implements ResourceEvidenceResolver
{
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    query: ResourceEvidenceQuery,
  ): Promise<ResourceEvidenceResolution> {
    const resolvedAt = new Date();
    const where: Prisma.ResourceEvidenceWhereInput = {
      ...(query.evidenceType ? { evidenceType: query.evidenceType } : {}),
      ...(query.referenceType ? { referenceType: query.referenceType } : {}),
      ...(query.referenceValue ? { referenceValue: query.referenceValue } : {}),
      ...(query.relationshipId
        ? { relationships: { some: { id: query.relationshipId } } }
        : {}),
      ...(query.movementId
        ? { movements: { some: { id: query.movementId } } }
        : {}),
    };

    if (query.resourceType && query.resourceId) {
      where.OR = [
        {
          relationships: {
            some: {
              resourceType: query.resourceType,
              resourceId: query.resourceId,
            },
          },
        },
        {
          movements: {
            some: {
              resourceType: query.resourceType,
              resourceId: query.resourceId,
            },
          },
        },
      ];
    }

    const evidence = await this.prisma.resourceEvidence.findMany({
      where,
      orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });

    return {
      evidence: evidence.map((item) => this.toDomainEvidence(item)),
      resolvedAt,
    };
  }

  private toDomainEvidence(
    evidence: Prisma.ResourceEvidenceGetPayload<{}>,
  ): ResourceEvidence {
    return {
      id: evidence.id,
      evidenceType: evidence.evidenceType as ResourceEvidence['evidenceType'],
      referenceType: evidence.referenceType,
      referenceValue: evidence.referenceValue,
      documentNumber: evidence.documentNumber ?? undefined,
      issuer: evidence.issuer ?? undefined,
      issuedAt: evidence.issuedAt ?? undefined,
      expiresAt: evidence.expiresAt ?? undefined,
      integrityHash: evidence.integrityHash ?? undefined,
      metadata: evidence.metadata ?? undefined,
      createdBy: evidence.createdBy,
      updatedBy: evidence.updatedBy,
    };
  }
}

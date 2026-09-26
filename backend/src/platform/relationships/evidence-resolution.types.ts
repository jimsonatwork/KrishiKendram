import { ResourceEvidence, ResourceEvidenceType } from './evidence.types';

export interface ResourceEvidenceQuery {
  resourceType?: string;
  resourceId?: string;
  relationshipId?: string;
  movementId?: string;
  evidenceType?: ResourceEvidenceType;
  referenceType?: string;
  referenceValue?: string;
}

export interface ResourceEvidenceResolution {
  evidence: ResourceEvidence[];
  resolvedAt: Date;
}

export interface ResourceEvidenceResolver {
  resolve(query: ResourceEvidenceQuery): Promise<ResourceEvidenceResolution>;
}

export const RESOURCE_EVIDENCE_RESOLVER = Symbol('RESOURCE_EVIDENCE_RESOLVER');

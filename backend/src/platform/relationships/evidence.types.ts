export enum ResourceEvidenceType {
  DOCUMENT = 'DOCUMENT',
  TRANSACTION = 'TRANSACTION',
  REGISTRY = 'REGISTRY',
  RECORD = 'RECORD',
  PROOF = 'PROOF',
}

export interface ResourceEvidence {
  id: string;
  evidenceType: ResourceEvidenceType;
  referenceType: string;
  referenceValue: string;
  documentNumber?: string;
  issuer?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  integrityHash?: string;
  metadata?: unknown;
  createdBy: string;
  updatedBy: string;
}

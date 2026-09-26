export enum ResourceLineageType {
  DERIVED_FROM = 'DERIVED_FROM',
  SPLIT_FROM = 'SPLIT_FROM',
  MERGED_FROM = 'MERGED_FROM',
  TRANSFERRED_FROM = 'TRANSFERRED_FROM',
}

/**
 * Business continuity link between a source resource/portion and a target
 * resource/portion. Lineage does not replace movement or technical audit.
 */
export interface ResourceLineage {
  sourceResourceType: string;
  sourceResourceId: string;
  targetResourceType: string;
  targetResourceId: string;
  lineageType: ResourceLineageType;
  movementId?: string;
  quantity?: number;
  unit?: string;
  effectiveAt: Date;
  reason?: string;
  metadata?: unknown;
  createdBy: string;
  updatedBy: string;
}

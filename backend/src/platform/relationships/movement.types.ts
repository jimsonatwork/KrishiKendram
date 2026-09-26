/**
 * Business events that change ownership, possession, custody, allocation,
 * location, or resource continuity.
 *
 * Movement types are business facts. They do not grant authorization.
 */
export enum ResourceMovementType {
  SALE = 'SALE',
  PARTIAL_SALE = 'PARTIAL_SALE',
  TRANSFER = 'TRANSFER',
  PARTIAL_TRANSFER = 'PARTIAL_TRANSFER',
  LEASE = 'LEASE',
  LEASE_END = 'LEASE_END',
  INHERITANCE = 'INHERITANCE',
  GIFT = 'GIFT',
  DONATION = 'DONATION',
  ALLOCATION = 'ALLOCATION',
  REALLOCATION = 'REALLOCATION',
  RETURN = 'RETURN',
  MERGE = 'MERGE',
  SPLIT = 'SPLIT',
  RECOVERY = 'RECOVERY',
  LOCATION_CHANGE = 'LOCATION_CHANGE',
  CUSTODY_CHANGE = 'CUSTODY_CHANGE',
}

/** Canonical business movement record exposed outside persistence. */
export interface ResourceMovement {
  resourceType: string;
  resourceId: string;
  movementType: ResourceMovementType;
  sourceUserId?: string;
  destinationUserId?: string;
  sourceResourceType?: string;
  sourceResourceId?: string;
  destinationResourceType?: string;
  destinationResourceId?: string;
  sourceRelationshipId?: string;
  destinationRelationshipId?: string;
  previousMovementId?: string;
  quantity?: number;
  unit?: string;
  effectiveAt: Date;
  recordedAt: Date;
  reason?: string;
  transactionId?: string;
  evidenceId?: string;
  metadata?: unknown;
  createdBy: string;
  updatedBy: string;
}

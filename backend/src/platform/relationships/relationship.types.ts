/**
 * Domain relationship types describe how a user is related to a resource.
 *
 * These values are relationship facts, not permissions and not user roles.
 */
export enum ResourceRelationshipType {
  OWNER = 'OWNER',
  CO_OWNER = 'CO_OWNER',
  LESSEE = 'LESSEE',
  MANAGER = 'MANAGER',
  WORKER = 'WORKER',
  CUSTODIAN = 'CUSTODIAN',
  CARETAKER = 'CARETAKER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  ADVISOR = 'ADVISOR',
  VETERINARIAN = 'VETERINARIAN',
  AUTHORIZED_OPERATOR = 'AUTHORIZED_OPERATOR',
}

/**
 * Lifecycle state of a resource relationship.
 *
 * Status describes the relationship's business lifecycle and does not itself
 * grant or revoke authorization.
 */
export enum ResourceRelationshipStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TRANSFERRED = 'TRANSFERRED',
  REVOKED = 'REVOKED',
  TERMINATED = 'TERMINATED',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Canonical domain contract for a relationship between a user and a resource.
 *
 * R1.4 intentionally defines the domain contract only. Persistence,
 * relationship resolution, permission evaluation, and authorization behavior
 * remain outside this contract.
 */
export interface ResourceRelationship {
  /**
   * Generic registry resource identifier, for example "farm" or "farmAsset".
   */
  resourceType: string;

  /**
   * Identifier of the resource instance.
   */
  resourceId: string;

  /**
   * User participating in the relationship.
   */
  userId: string;

  /**
   * Business relationship between the user and resource.
   */
  relationshipType: ResourceRelationshipType;

  /**
   * Current lifecycle state of the relationship.
   */
  status: ResourceRelationshipStatus;

  /**
   * Beginning of the relationship's effective period.
   */
  validFrom: Date;

  /**
   * Optional end of the relationship's effective period.
   */
  validUntil?: Date;

  /**
   * Actual time at which the relationship ended, when applicable.
   */
  endedAt?: Date;

  /**
   * Business reason for ending the relationship.
   */
  endedReason?: string;

  /**
   * User or system identity that created the relationship record.
   */
  createdBy: string;

  /**
   * User or system identity that last updated the relationship record.
   */
  updatedBy: string;
}

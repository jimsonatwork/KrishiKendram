import {
  ResourceRelationship,
  ResourceRelationshipStatus,
  ResourceRelationshipType,
} from './relationship.types';

/**
 * Defines which relationship facts are eligible to establish access to a
 * farm boundary.
 *
 * Relationship facts and authorization decisions remain separate concerns.
 * This policy is the explicit translation boundary between them.
 *
 * Farm-boundary access is intentionally limited to relationships that
 * represent an ongoing ownership, tenancy, management, operational, or
 * custodial relationship with the farm.
 *
 * This policy does not grant resource actions or field permissions. Those
 * remain the responsibility of the authorization and permission layers.
 */
export class RelationshipAccessPolicy {
  /**
   * Determines whether a resolved relationship fact may establish access
   * to the farm boundary.
   *
   * The relationship must be ACTIVE before its relationship type can be
   * considered for access. Temporal validity is established by the
   * relationship resolver before this policy evaluates the relationship.
   */
  allowsFarmAccess(relationship: ResourceRelationship): boolean {
    if (relationship.status !== ResourceRelationshipStatus.ACTIVE) {
      return false;
    }

    return this.farmAccessRelationshipTypes().has(
      relationship.relationshipType,
    );
  }

  /**
   * Explicit allow-list for relationship types that may establish farm
   * boundary access.
   *
   * OWNER is intentionally excluded because current farm ownership is
   * evaluated directly by FarmAccessService.
   *
   * Service-provider and advisory relationships are intentionally excluded
   * because their farm access must not become a blanket farm-boundary grant.
   */
  private farmAccessRelationshipTypes(): ReadonlySet<ResourceRelationshipType> {
    return new Set<ResourceRelationshipType>([
      ResourceRelationshipType.CO_OWNER,
      ResourceRelationshipType.LESSEE,
      ResourceRelationshipType.MANAGER,
      ResourceRelationshipType.WORKER,
      ResourceRelationshipType.CUSTODIAN,
      ResourceRelationshipType.CARETAKER,
      ResourceRelationshipType.AUTHORIZED_OPERATOR,
    ]);
  }
}

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
 * R1.9A intentionally starts with no relationship type granting access.
 * Existing farm-owner access remains owned by FarmAccessService and is not
 * represented by this policy.
 */
export class RelationshipAccessPolicy {
  /**
   * Determines whether a resolved relationship fact may establish access
   * to the farm boundary.
   *
   * The relationship must be current and ACTIVE before its relationship
   * type can be considered for access.
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
   * R1.9A intentionally returns an empty set. Relationship types must not
   * become authorization grants merely because they exist in the domain
   * taxonomy. Future milestones may add explicitly approved types here
   * together with their policy tests.
   */
  private farmAccessRelationshipTypes(): ReadonlySet<ResourceRelationshipType> {
    return new Set<ResourceRelationshipType>();
  }
}

import { ResourceRelationship } from './relationship.types';

/**
 * Query used to resolve a user's relationship with a resource.
 *
 * When `at` is omitted, the resolver evaluates the relationship context
 * relevant to the current time. When supplied, the resolver evaluates the
 * relationship context at that point in time.
 */
export interface ResourceRelationshipQuery {
  /**
   * Generic registry resource identifier, for example "farm" or "farmAsset".
   */
  resourceType: string;

  /**
   * Identifier of the resource instance.
   */
  resourceId: string;

  /**
   * User whose relationship with the resource is being resolved.
   */
  userId: string;

  /**
   * Optional point in time for temporal relationship resolution.
   */
  at?: Date;
}

/**
 * Result of resolving a user's relationship with a resource.
 *
 * The resolver returns relationship facts. It does not convert those facts
 * into permissions or authorization decisions.
 */
export interface ResourceRelationshipResolution {
  /**
   * Resource type resolved by the query.
   */
  resourceType: string;

  /**
   * Resource instance resolved by the query.
   */
  resourceId: string;

  /**
   * User whose relationships were resolved.
   */
  userId: string;

  /**
   * Relationship facts applicable to the requested resolution context.
   */
  relationships: ResourceRelationship[];

  /**
   * Time at which the resolution was produced.
   */
  resolvedAt: Date;
}

/**
 * Platform boundary for resolving resource relationships.
 *
 * Implementations may later resolve relationships from persistence,
 * historical records, external sources, or other domain providers.
 */
export interface ResourceRelationshipResolver {
  resolve(
    query: ResourceRelationshipQuery,
  ): Promise<ResourceRelationshipResolution>;
}

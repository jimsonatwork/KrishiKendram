import { ResourceLineage } from './lineage.types';

export interface ResourceLineageQuery {
  resourceType: string;
  resourceId: string;
  direction?: 'INBOUND' | 'OUTBOUND' | 'BOTH';
  from?: Date;
  to?: Date;
}

export interface ResourceLineageResolution {
  resourceType: string;
  resourceId: string;
  lineages: ResourceLineage[];
  resolvedAt: Date;
}

export const RESOURCE_LINEAGE_RESOLVER = Symbol('ResourceLineageResolver');

export interface ResourceLineageResolver {
  resolve(query: ResourceLineageQuery): Promise<ResourceLineageResolution>;
}

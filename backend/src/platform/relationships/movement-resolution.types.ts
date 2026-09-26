import { ResourceMovement } from './movement.types';

export interface ResourceMovementQuery {
  resourceType: string;
  resourceId: string;
  from?: Date;
  to?: Date;
}

export interface ResourceMovementResolution {
  resourceType: string;
  resourceId: string;
  movements: ResourceMovement[];
  resolvedAt: Date;
}

export const RESOURCE_MOVEMENT_RESOLVER = Symbol('ResourceMovementResolver');

export interface ResourceMovementResolver {
  resolve(query: ResourceMovementQuery): Promise<ResourceMovementResolution>;
}

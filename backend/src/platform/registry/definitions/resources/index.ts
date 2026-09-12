import { ResourceDefinition } from '../../resource-definition.interface';

import { cropResource } from './crop.resource';
import { farmAssetResource } from './farm-asset.resource';
import { farmRecordResource } from './farm-record.resource';
import { farmResource } from './farm.resource';
import { userResource } from './user.resource';

export const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
  userResource,
  farmResource,
  cropResource,
  farmAssetResource,
  farmRecordResource,
];

export {
  cropResource,
  farmAssetResource,
  farmRecordResource,
  farmResource,
  userResource,
};

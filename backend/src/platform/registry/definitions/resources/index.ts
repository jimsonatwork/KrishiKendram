import { ResourceDefinition } from '../../resource-definition.interface';

import { auditResource } from './audit.resource';
import { cropResource } from './crop.resource';
import { conversationResource } from './conversation.resource';
import { livestockResource } from './livestock.resource';
import { marketplaceListingResource } from './marketplace-listing.resource';
import { farmAssetResource } from './farm-asset.resource';
import { farmRecordResource } from './farm-record.resource';
import { farmResource } from './farm.resource';
import { permissionResource } from './permission.resource';
import { userResource } from './user.resource';

export const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
  userResource,
  permissionResource,
  conversationResource,
  auditResource,
  farmResource,
  cropResource,
  livestockResource,
  marketplaceListingResource,
  farmAssetResource,
  farmRecordResource,
];

export {
  auditResource,
  cropResource,
  livestockResource,
  marketplaceListingResource,
  farmAssetResource,
  farmRecordResource,
  farmResource,
  userResource,
  permissionResource,
  conversationResource,
};

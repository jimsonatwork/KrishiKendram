import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const marketplaceRFQResource: ResourceDefinition = {
  name: 'marketplaceRFQ',
  module: 'marketplace',
  model: 'MarketplaceRFQ',
  ownerField: 'buyerId',
  fields: { title:{definition:'marketplaceRFQTitle'}, category:{definition:'marketplaceListingCategory'}, description:{definition:'marketplaceRFQDescription'}, quantity:{definition:'marketplaceRFQQuantity'}, unit:{definition:'marketplaceRFQUnit'}, deliveryRegion:{definition:'marketplaceRFQRegion'}, targetUnitPrice:{definition:'marketplaceRFQTargetUnitPrice'}, currency:{definition:'marketplaceRFQCurrency'}, neededBy:{definition:'marketplaceRFQNeededBy'} },
  searchableFields: ['title','category','deliveryRegion'],
  sortableFields: ['createdAt','updatedAt','status'],
  defaultSort: 'createdAt:desc',
  capabilities: [... [AuthorizationAction.READ,AuthorizationAction.CREATE,AuthorizationAction.UPDATE].map(action=>({action,scopes:[AuthorizationScope.OWN,AuthorizationScope.PUBLIC]}))],
  permissions: ['READ','CREATE','UPDATE'],
  scopes: ['OWN','PUBLIC'],
  features: ['bulk-sourcing','audit-history'],
};

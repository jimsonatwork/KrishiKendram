import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const marketplaceRFQResponseResource: ResourceDefinition = {
  name: 'marketplaceRFQResponse',
  module: 'marketplace',
  model: 'MarketplaceRFQResponse',
  ownerField: 'sellerId',
  fields: { status:{definition:'marketplaceRFQResponseStatus'}, unitPrice:{definition:'marketplaceRFQResponseUnitPrice'}, availableQuantity:{definition:'marketplaceRFQResponseQuantity'}, note:{definition:'marketplaceRFQResponseNote'} },
  searchableFields: ['rfqId','status'],
  sortableFields: ['createdAt','updatedAt'],
  defaultSort: 'createdAt:desc',
  capabilities: [... [AuthorizationAction.READ,AuthorizationAction.CREATE,AuthorizationAction.UPDATE].map(action=>({action,scopes:[AuthorizationScope.OWN]}))],
  permissions: ['READ','CREATE','UPDATE'],
  scopes: ['OWN'],
  features: ['seller-quotations','audit-history'],
};

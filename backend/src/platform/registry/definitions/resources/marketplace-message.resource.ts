import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const marketplaceMessageResource: ResourceDefinition = {
  name: 'marketplaceMessage',
  module: 'marketplace',
  model: 'MarketplaceMessage',
  ownerField: 'senderId',
  fields: { body:{definition:'marketplaceMessageBody'}, listingId:{definition:'marketplaceResourceId'}, orderId:{definition:'marketplaceResourceId'} },
  searchableFields: ['body','listingId','orderId'],
  sortableFields: ['createdAt','readAt'],
  defaultSort: 'createdAt:desc',
  capabilities: [... [AuthorizationAction.READ,AuthorizationAction.CREATE].map(action=>({action,scopes:[AuthorizationScope.OWN]}))],
  permissions: ['READ','CREATE'],
  scopes: ['OWN'],
  features: ['participant-private','audit-history'],
};

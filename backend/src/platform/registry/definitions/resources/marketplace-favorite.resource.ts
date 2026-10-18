import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const marketplaceFavoriteResource: ResourceDefinition = {
  name: 'marketplaceFavorite',
  module: 'marketplace',
  model: 'MarketplaceFavorite',
  ownerField: 'userId',
  fields: { listingId:{definition:'marketplaceResourceId'} },
  searchableFields: ['listingId'],
  sortableFields: ['updatedAt','createdAt'],
  defaultSort: 'createdAt:desc',
  capabilities: [... [AuthorizationAction.READ,AuthorizationAction.CREATE,AuthorizationAction.UPDATE].map(action=>({action,scopes:[AuthorizationScope.OWN]}))],
  permissions: ['READ','CREATE','UPDATE'],
  scopes: ['OWN'],
  features: ['private-shortlist','soft-remove'],
};

import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

export const marketplaceListingResource: ResourceDefinition = {
  name: 'marketplaceListing',
  module: 'marketplace',
  model: 'MarketplaceListing',
  ownerField: 'sellerId',
  fields: {
    resourceType: { definition: 'marketplaceResourceType' },
    resourceId: { definition: 'marketplaceResourceId' },
    title: { definition: 'marketplaceListingTitle' },
    description: { definition: 'marketplaceListingDescription' },
    quantity: { definition: 'marketplaceListingQuantity' },
    unit: { definition: 'marketplaceListingUnit' },
    price: { definition: 'marketplaceListingPrice' },
    currency: { definition: 'marketplaceListingCurrency' },
  },
  searchableFields: ['title', 'resourceType', 'status'],
  sortableFields: ['title', 'price', 'createdAt', 'publishedAt'],
  defaultSort: 'createdAt:desc',
  capabilities: [
    ...[AuthorizationAction.READ, AuthorizationAction.CREATE, AuthorizationAction.UPDATE, AuthorizationAction.DELETE].map((action) => ({
      action,
      scopes: [AuthorizationScope.OWN, AuthorizationScope.PUBLIC, AuthorizationScope.GLOBAL],
    })),
  ],
  permissions: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
  scopes: ['OWN', 'PUBLIC', 'GLOBAL'],
  features: ['soft-delete', 'public-read'],
  softDelete: true,
};
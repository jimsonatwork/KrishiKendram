import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const marketplaceSellerProfileResource: ResourceDefinition = {
  name: 'marketplaceSellerProfile',
  module: 'marketplace',
  model: 'MarketplaceSellerProfile',
  ownerField: 'userId',
  fields: { displayName:{definition:'marketplaceSellerDisplayName'}, bio:{definition:'marketplaceSellerBio'}, regionLabel:{definition:'marketplaceSellerRegion'}, contactPreference:{definition:'marketplaceSellerContactPreference'}, showPhone:{definition:'marketplaceSellerShowPhone'}, publicPhone:{definition:'marketplaceSellerPublicPhone'} },
  searchableFields: ['displayName','regionLabel'],
  sortableFields: ['updatedAt','createdAt'],
  defaultSort: 'createdAt:desc',
  capabilities: [... [AuthorizationAction.READ,AuthorizationAction.CREATE,AuthorizationAction.UPDATE].map(action=>({action,scopes:[AuthorizationScope.OWN,AuthorizationScope.PUBLIC]}))],
  permissions: ['READ','CREATE','UPDATE'],
  scopes: ['OWN','PUBLIC'],
  features: ['private-contact-consent','audit-history'],
};

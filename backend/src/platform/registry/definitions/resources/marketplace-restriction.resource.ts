import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const marketplaceRestrictionResource: ResourceDefinition = {
  name: 'marketplaceRestriction', module: 'marketplace', model: 'MarketplaceRestriction', ownerField: 'userId',
  fields: { scope: { definition: 'marketplaceRestrictionScope' }, reason: { definition: 'marketplaceTrustCaseDescription' } },
  searchableFields: ['scope', 'status'], sortableFields: ['createdAt', 'expiresAt', 'status'], defaultSort: 'createdAt:desc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.UPDATE].map(action => ({ action, scopes: [AuthorizationScope.OWN, AuthorizationScope.GLOBAL] })),
  permissions: ['READ', 'UPDATE'], scopes: ['OWN', 'GLOBAL'], features: ['scoped', 'expiring', 'audited'], softDelete: false,
};

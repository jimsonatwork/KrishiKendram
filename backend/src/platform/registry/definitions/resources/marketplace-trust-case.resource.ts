import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const marketplaceTrustCaseResource: ResourceDefinition = {
  name: 'marketplaceTrustCase', module: 'marketplace', model: 'MarketplaceTrustCase', ownerField: 'reporterId',
  fields: { type: { definition: 'marketplaceTrustCaseType' }, category: { definition: 'marketplaceTrustCaseCategory' }, status: { definition: 'marketplaceTrustCaseStatus' }, description: { definition: 'marketplaceTrustCaseDescription' } },
  searchableFields: ['type', 'category', 'status'], sortableFields: ['createdAt', 'updatedAt', 'status'], defaultSort: 'createdAt:desc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.CREATE, AuthorizationAction.UPDATE].map(action => ({ action, scopes: [AuthorizationScope.OWN, AuthorizationScope.GLOBAL] })),
  permissions: ['READ', 'CREATE', 'UPDATE'], scopes: ['OWN', 'GLOBAL'], features: ['private-evidence', 'appeals', 'audit-history'], softDelete: false,
};

import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const marketplaceFeatureFlagResource: ResourceDefinition = {
  name: 'marketplaceFeatureFlag', module: 'marketplace', model: 'MarketplaceFeatureFlag', ownerField: 'updatedById',
  fields: { key: { definition: 'marketplaceFeatureKey' }, title: { definition: 'marketplaceFeatureTitle' }, description: { definition: 'marketplaceFeatureDescription' }, enabled: { definition: 'marketplaceFeatureEnabled' }, riskLevel: { definition: 'marketplaceFeatureRiskLevel' } },
  searchableFields: ['key', 'title', 'riskLevel'], sortableFields: ['key', 'updatedAt', 'riskLevel'], defaultSort: 'key:asc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.UPDATE].map(action => ({ action, scopes: [AuthorizationScope.GLOBAL] })),
  permissions: ['READ', 'UPDATE'], scopes: ['GLOBAL'], features: ['dependency-aware', 'versioned', 'audited'],
};

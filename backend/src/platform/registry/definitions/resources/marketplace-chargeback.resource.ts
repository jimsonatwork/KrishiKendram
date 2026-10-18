import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

export const marketplaceChargebackResource: ResourceDefinition = {
  name: 'marketplaceChargeback',
  module: 'marketplace',
  model: 'MarketplaceChargeback',
  ownerField: 'createdById',
  fields: {
    status: { definition: 'marketplaceChargebackStatus' },
    reason: { definition: 'marketplaceChargebackReason' },
  },
  searchableFields: ['status', 'orderId'],
  sortableFields: ['createdAt', 'updatedAt', 'status', 'evidenceDeadline'],
  defaultSort: 'createdAt:desc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.CREATE, AuthorizationAction.UPDATE].map(action => ({
    action,
    scopes: [AuthorizationScope.OWN, AuthorizationScope.GLOBAL],
  })),
  permissions: ['READ', 'CREATE', 'UPDATE'],
  scopes: ['OWN', 'GLOBAL'],
  features: ['signed-sandbox-outcomes', 'evidence-deadline', 'payout-hold-governance', 'audit-history'],
  softDelete: false,
};

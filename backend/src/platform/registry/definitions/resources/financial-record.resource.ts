import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const financialRecordResource: ResourceDefinition = {
  name: 'financialRecord', module: 'finance', model: 'FarmFinancialRecord', ownerField: 'farm.ownerId',
  fields: { type: { definition: 'financialRecordType' }, category: { definition: 'financialRecordCategory' }, amount: { definition: 'financialRecordAmount' }, currency: { definition: 'financialRecordCurrency' }, reference: { definition: 'financialRecordReference' }, notes: { definition: 'financialRecordNotes' } },
  searchableFields: ['type', 'category', 'reference'], sortableFields: ['occurredAt', 'amount', 'category'], defaultSort: 'occurredAt:desc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.CREATE, AuthorizationAction.UPDATE, AuthorizationAction.DELETE].map(action => ({ action, scopes: [AuthorizationScope.FARM, AuthorizationScope.GLOBAL] })),
  permissions: ['READ', 'CREATE', 'UPDATE', 'DELETE'], scopes: ['FARM', 'GLOBAL'], features: ['soft-delete', 'audit-history', 'farm-financial-summary'], softDelete: true,
};

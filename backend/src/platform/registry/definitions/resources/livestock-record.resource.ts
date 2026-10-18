import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';
export const livestockRecordResource: ResourceDefinition = {
  name: 'livestockRecord', module: 'livestock', model: 'LivestockRecord', ownerField: 'livestock.farm.ownerId',
  fields: { type: { definition: 'livestockRecordType' }, description: { definition: 'livestockRecordDescription' }, quantity: { definition: 'livestockRecordQuantity' }, unit: { definition: 'livestockRecordUnit' }, reference: { definition: 'livestockRecordReference' }, notes: { definition: 'livestockRecordNotes' } },
  searchableFields: ['type', 'description', 'reference'], sortableFields: ['type', 'recordedAt', 'createdAt'], defaultSort: 'recordedAt:desc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.CREATE].map(action => ({ action, scopes: [AuthorizationScope.FARM, AuthorizationScope.GLOBAL] })),
  permissions: ['READ', 'CREATE'], scopes: ['FARM', 'GLOBAL'], features: ['append-only', 'audit-history', 'follow-up-reminders'],
};

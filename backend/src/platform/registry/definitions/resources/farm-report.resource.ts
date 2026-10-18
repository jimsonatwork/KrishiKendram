import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

export const farmReportResource: ResourceDefinition = {
  name: 'farmReport',
  module: 'reports',
  model: 'ReportView',
  ownerField: 'ownerId',
  fields: {
    farmId: { definition: 'reportFarmId' },
    fromDate: { definition: 'reportFromDate' },
    toDate: { definition: 'reportToDate' },
  },
  searchableFields: ['farmId', 'fromDate', 'toDate'],
  sortableFields: ['generatedAt'],
  defaultSort: 'generatedAt:desc',
  capabilities: [
    { action: AuthorizationAction.READ, scopes: [AuthorizationScope.OWN, AuthorizationScope.FARM] },
    { action: AuthorizationAction.EXPORT, scopes: [AuthorizationScope.OWN, AuthorizationScope.FARM] },
  ],
  permissions: ['READ', 'EXPORT'],
  scopes: ['OWN', 'FARM'],
  features: ['farm-scoped-aggregation', 'date-filtering', 'currency-safe-totals', 'read-only', 'csv-export'],
  softDelete: false,
};

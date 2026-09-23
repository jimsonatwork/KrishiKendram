import {
  AuthorizationAction,
  AuthorizationScope,
} from '../../../authorization/authorization.types';

import { ResourceDefinition } from '../../resource-definition.interface';

export const farmRecordResource: ResourceDefinition = {
  name: 'farmRecord',
  module: 'farms',
  model: 'FarmRecord',

  fields: {
    category: {
      definition: 'farmRecordCategory',
    },

    title: {
      definition: 'farmRecordTitle',
    },

    inputMethod: {
      definition: 'farmRecordInputMethod',
    },

    data: {
      definition: 'farmRecordData',
    },
  },

  ownerField: 'farm.ownerId',

  searchableFields: [
    'category',
    'title',
  ],

  sortableFields: [
    'category',
    'title',
    'createdAt',
  ],

  defaultSort: 'createdAt:desc',

  capabilities: [
    {
      action: AuthorizationAction.READ,
      scopes: [
        AuthorizationScope.OWN,
        AuthorizationScope.FARM,
        AuthorizationScope.GLOBAL,
      ],
    },
    {
      action: AuthorizationAction.CREATE,
      scopes: [
        AuthorizationScope.OWN,
        AuthorizationScope.FARM,
        AuthorizationScope.GLOBAL,
      ],
    },
    {
      action: AuthorizationAction.UPDATE,
      scopes: [
        AuthorizationScope.OWN,
        AuthorizationScope.FARM,
        AuthorizationScope.GLOBAL,
      ],
    },
    {
      action: AuthorizationAction.DELETE,
      scopes: [
        AuthorizationScope.OWN,
        AuthorizationScope.FARM,
        AuthorizationScope.GLOBAL,
      ],
    },
  ],

  permissions: [
    'READ',
    'CREATE',
    'UPDATE',
    'DELETE',
  ],

  scopes: [
    'OWN',
    'FARM',
    'GLOBAL',
  ],

  softDelete: false,
};

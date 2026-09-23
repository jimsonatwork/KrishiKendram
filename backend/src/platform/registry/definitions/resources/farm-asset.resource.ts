import {
  AuthorizationAction,
  AuthorizationScope,
} from '../../../authorization/authorization.types';

import { ResourceDefinition } from '../../resource-definition.interface';

export const farmAssetResource: ResourceDefinition = {
  name: 'farmAsset',
  module: 'farms',
  model: 'FarmAsset',

  fields: {
    type: {
      definition: 'farmAssetType',
    },

    name: {
      definition: 'farmAssetName',
    },

    quantity: {
      definition: 'farmAssetQuantity',
    },

    unit: {
      definition: 'farmAssetUnit',
    },

    metadata: {
      definition: 'farmAssetMetadata',
    },
  },

  ownerField: 'farm.ownerId',

  searchableFields: [
    'type',
    'name',
  ],

  sortableFields: [
    'type',
    'name',
    'quantity',
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

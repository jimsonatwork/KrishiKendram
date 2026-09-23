import {
  AuthorizationAction,
  AuthorizationScope,
} from '../../../authorization/authorization.types';

import { ResourceDefinition } from '../../resource-definition.interface';

export const cropResource: ResourceDefinition = {
  name: 'crop',
  module: 'farms',
  model: 'Crop',

  fields: {
    name: {
      definition: 'name',
      override: {
        validation: {
          required: true,
        },
      },
    },
  },

  ownerField: 'farm.ownerId',

  searchableFields: [
    'name',
    'variety',
    'season',
    'status',
  ],

  sortableFields: [
    'name',
    'season',
    'status',
    'area',
    'createdAt',
    'updatedAt',
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

  features: [
    'soft-delete',
  ],

  softDelete: true,
};

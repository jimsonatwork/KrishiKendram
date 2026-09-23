import {
  AuthorizationAction,
  AuthorizationScope,
} from '../../../authorization/authorization.types';

import { ResourceDefinition } from '../../resource-definition.interface';

export const farmResource: ResourceDefinition = {
  name: 'farm',
  module: 'farms',
  model: 'Farm',

  fields: {
    name: {
      definition: 'farmName',
    },

    type: {
      definition: 'farmType',
    },

    description: {
      definition: 'farmDescription',
    },

    location: {
      definition: 'farmLocation',
    },

    latitude: {
      definition: 'farmLatitude',
    },

    longitude: {
      definition: 'farmLongitude',
    },

    area: {
      definition: 'farmArea',
    },

    unit: {
      definition: 'farmUnit',
    },
  },

  ownerField: 'ownerId',

  searchableFields: [
    'name',
    'type',
    'location',
  ],

  sortableFields: [
    'name',
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
        AuthorizationScope.GLOBAL,
      ],
    },
    {
      action: AuthorizationAction.CREATE,
      scopes: [
        AuthorizationScope.OWN,
        AuthorizationScope.GLOBAL,
      ],
    },
    {
      action: AuthorizationAction.UPDATE,
      scopes: [
        AuthorizationScope.OWN,
        AuthorizationScope.GLOBAL,
      ],
    },
    {
      action: AuthorizationAction.DELETE,
      scopes: [
        AuthorizationScope.OWN,
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
    'GLOBAL',
  ],

  features: [
    'assets',
    'records',
  ],

  softDelete: false,
};

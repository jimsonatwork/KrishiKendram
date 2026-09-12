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

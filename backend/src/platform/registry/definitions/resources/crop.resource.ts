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

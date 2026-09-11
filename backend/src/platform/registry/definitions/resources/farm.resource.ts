import { ResourceDefinition } from '../../resource-definition.interface';

export const farmResource: ResourceDefinition = {
  name: 'farm',
  model: 'Farm',

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

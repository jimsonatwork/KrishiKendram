import { ResourceDefinition } from '../../resource-definition.interface';

export const farmAssetResource: ResourceDefinition = {
  name: 'farmAsset',
  model: 'FarmAsset',

  fields: {
    name: {
      definition: 'name',
      override: {
        validation: {
          maxLength: 100,
        },
      },
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

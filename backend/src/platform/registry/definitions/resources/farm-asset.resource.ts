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

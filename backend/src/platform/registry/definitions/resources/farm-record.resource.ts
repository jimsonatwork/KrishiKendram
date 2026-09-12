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

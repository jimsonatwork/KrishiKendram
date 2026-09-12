import { ResourceDefinition } from '../../resource-definition.interface';

export const userResource: ResourceDefinition = {
  name: 'user',
  model: 'User',

  fields: {
    name: {
      definition: 'userName',
      override: {
        validation: {
          required: true,
        },
      },
    },

    email: {
      definition: 'userEmail',
      override: {
        validation: {
          required: false,
        },
      },
    },

    mobile: {
      definition: 'userMobile',
    },

    preferredLanguage: {
      definition: 'userPreferredLanguage',
    },

    profileCompletion: {
      definition: 'userProfileCompletion',
    },

    role: {
      definition: 'userRole',
    },

    status: {
      definition: 'userStatus',
    },

    preferredInputMethod: {
      definition: 'userPreferredInputMethod',
    },

    isVerified: {
      definition: 'userVerified',
    },
  },

  ownerField: 'id',

  searchableFields: [
    'name',
    'email',
    'mobile',
  ],

  sortableFields: [
    'name',
    'email',
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
    'GLOBAL',
  ],

  softDelete: true,
};

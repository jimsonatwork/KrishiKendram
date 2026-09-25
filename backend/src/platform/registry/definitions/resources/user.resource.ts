import {
  AuthorizationAction,
  AuthorizationScope,
} from '../../../authorization/authorization.types';

import { ResourceDefinition } from '../../resource-definition.interface';

export const userResource: ResourceDefinition = {
  name: 'user',
  module: 'platform',
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

  capabilities: [
    {
      action: AuthorizationAction.READ,
      scopes: [AuthorizationScope.GLOBAL],
    },
    {
      action: AuthorizationAction.CREATE,
      scopes: [AuthorizationScope.GLOBAL],
    },
    {
      action: AuthorizationAction.UPDATE,
      scopes: [AuthorizationScope.GLOBAL],
    },
    {
      action: AuthorizationAction.DELETE,
      scopes: [AuthorizationScope.GLOBAL],
    },
    {
      action: AuthorizationAction.READ_ACTIVITY,
      scopes: [AuthorizationScope.GLOBAL],
    },
    {
      action: AuthorizationAction.READ_HISTORY,
      scopes: [AuthorizationScope.GLOBAL],
    },
    {
      action: AuthorizationAction.RESTORE,
      scopes: [AuthorizationScope.GLOBAL],
    },
  ],

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

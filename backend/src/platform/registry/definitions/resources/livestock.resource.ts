import {
  AuthorizationAction,
  AuthorizationScope,
} from '../../../authorization/authorization.types';

import { ResourceDefinition } from '../../resource-definition.interface';

export const livestockResource: ResourceDefinition = {
  name: 'livestock',
  module: 'livestock',
  model: 'Livestock',
  fields: {
    species: { definition: 'livestockSpecies' },
    name: { definition: 'livestockName' },
    tag: { definition: 'livestockTag' },
    breed: { definition: 'livestockBreed' },
    sex: { definition: 'livestockSex' },
    count: { definition: 'livestockCount' },
    status: { definition: 'livestockStatus' },
    acquiredAt: { definition: 'livestockAcquiredAt' },
    notes: { definition: 'livestockNotes' },
  },
  ownerField: 'farm.ownerId',
  searchableFields: ['species', 'name', 'tag', 'breed', 'status'],
  sortableFields: ['species', 'name', 'count', 'status', 'createdAt'],
  defaultSort: 'createdAt:desc',
  capabilities: [
    ...[AuthorizationAction.READ, AuthorizationAction.CREATE,
      AuthorizationAction.UPDATE, AuthorizationAction.DELETE,
      AuthorizationAction.RESTORE].map((action) => ({
      action,
      scopes: [AuthorizationScope.OWN, AuthorizationScope.FARM, AuthorizationScope.GLOBAL],
    })),
  ],
  permissions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'],
  scopes: ['OWN', 'FARM', 'GLOBAL'],
  features: ['soft-delete'],
  softDelete: true,
};
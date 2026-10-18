import { ModuleDefinition } from '../../module-definition.interface';

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'platform',
    name: 'Platform',
    lifecycle: 'ACTIVE',
  },
  {
    id: 'farms',
    name: 'Farms',
    lifecycle: 'ACTIVE',
  },
  {
    id: 'livestock',
    name: 'Livestock',
    lifecycle: 'ACTIVE',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    lifecycle: 'ACTIVE',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    lifecycle: 'ACTIVE',
    parentId: 'marketplace',
  },
  {
    id: 'finance',
    name: 'Finance',
    lifecycle: 'ACTIVE',
    parentId: 'marketplace',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    lifecycle: 'ACTIVE',
  },
];

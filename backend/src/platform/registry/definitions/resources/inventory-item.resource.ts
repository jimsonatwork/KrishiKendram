import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

export const inventoryItemResource: ResourceDefinition = {
  name: 'inventoryItem', module: 'inventory', model: 'InventoryItem', ownerField: 'farm.ownerId',
  fields: {
    name: { definition: 'inventoryItemName', override: { validation: { required: true } } },
    category: { definition: 'inventoryItemCategory' }, unit: { definition: 'inventoryItemUnit' },
    quantityOnHand: { definition: 'inventoryItemQuantity' }, reorderLevel: { definition: 'inventoryItemReorderLevel' },
    supplier: { definition: 'inventoryItemSupplier' }, notes: { definition: 'inventoryItemNotes' },
  },
  searchableFields: ['name', 'category'], sortableFields: ['name', 'category', 'quantityOnHand', 'updatedAt'],
  defaultSort: 'name:asc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.CREATE, AuthorizationAction.UPDATE, AuthorizationAction.DELETE, AuthorizationAction.RESTORE].map(action => ({
    action, scopes: [AuthorizationScope.FARM, AuthorizationScope.GLOBAL],
  })),
  permissions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'], scopes: ['FARM', 'GLOBAL'],
  features: ['stock-ledger', 'soft-delete', 'reorder-alerts', 'audit-history'], softDelete: true,
};

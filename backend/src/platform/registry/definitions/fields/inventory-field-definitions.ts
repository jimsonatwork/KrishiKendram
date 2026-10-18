import { FieldDefinition } from '../../field-definition.interface';

const text = (name: string, maxLength: number): FieldDefinition => ({
  name, type: 'string', description: name, validation: { required: false, maxLength },
  normalization: { trim: true }, overrideMode: 'EXTENDABLE',
  overridableValidation: ['required', 'minLength', 'maxLength', 'pattern'],
});

export const INVENTORY_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  text('inventoryItemName', 200),
  text('inventoryItemCategory', 40),
  text('inventoryItemUnit', 40),
  text('inventoryItemSupplier', 200),
  text('inventoryItemNotes', 2000),
  { name: 'inventoryItemQuantity', type: 'number', description: 'Inventory quantity', validation: { required: false, min: 0 }, overrideMode: 'EXTENDABLE', overridableValidation: ['required', 'min', 'max'] },
  { name: 'inventoryItemReorderLevel', type: 'number', description: 'Inventory reorder level', validation: { required: false, min: 0 }, overrideMode: 'EXTENDABLE', overridableValidation: ['required', 'min', 'max'] },
];

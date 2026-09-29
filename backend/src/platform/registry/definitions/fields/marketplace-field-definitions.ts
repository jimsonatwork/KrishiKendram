import { FieldDefinition } from '../../field-definition.interface';

const text = (name: string, maxLength: number): FieldDefinition => ({
  name, type: 'string', description: name, validation: { required: false, maxLength },
  normalization: { trim: true }, overrideMode: 'EXTENDABLE',
  overridableValidation: ['required', 'minLength', 'maxLength', 'pattern'],
});

export const MARKETPLACE_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  text('marketplaceResourceType', 40),
  text('marketplaceResourceId', 100),
  text('marketplaceListingTitle', 200),
  text('marketplaceListingDescription', 2000),
  text('marketplaceListingUnit', 40),
  text('marketplaceListingCurrency', 3),
  { name: 'marketplaceListingQuantity', type: 'number', description: 'Listing quantity', validation: { required: false, min: 0 }, overrideMode: 'EXTENDABLE', overridableValidation: ['required', 'min', 'max'] },
  { name: 'marketplaceListingPrice', type: 'number', description: 'Listing price', validation: { required: false, min: 0 }, overrideMode: 'EXTENDABLE', overridableValidation: ['required', 'min', 'max'] },
];
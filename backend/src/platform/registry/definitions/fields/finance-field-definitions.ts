import { FieldDefinition } from '../../field-definition.interface';
const text = (name: string, maxLength: number): FieldDefinition => ({ name, type: 'string', description: name, validation: { required: false, maxLength }, normalization: { trim: true }, overrideMode: 'EXTENDABLE', overridableValidation: ['required', 'minLength', 'maxLength', 'pattern'] });
export const FINANCE_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  text('financialRecordType', 20), text('financialRecordCategory', 80), text('financialRecordCurrency', 3), text('financialRecordReference', 200), text('financialRecordNotes', 2000),
  { name: 'financialRecordAmount', type: 'number', description: 'Financial record amount', validation: { required: true, min: 0.01 }, overrideMode: 'EXTENDABLE', overridableValidation: ['required', 'min', 'max'] },
];

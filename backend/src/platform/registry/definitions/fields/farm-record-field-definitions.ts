import { FieldDefinition } from '../../field-definition.interface';

/*
 * Canonical Farm Record field policies.
 *
 * These definitions are business-policy definitions, not transport DTOs.
 * DTO validation may reject malformed requests earlier, but every backend
 * entry path that creates or updates a Farm Record must use these definitions.
 */

export const farmRecordCategoryField: FieldDefinition = {
  name: 'farmRecordCategory',
  type: 'string',
  description: 'Canonical FarmRecord category field.',
  validation: {
    required: true,
  },
  normalization: {
    trim: true,
  },
  overrideMode: 'EXTENDABLE',
  overridableValidation: [
    'required',
  ],
};

export const farmRecordTitleField: FieldDefinition = {
  name: 'farmRecordTitle',
  type: 'string',
  description: 'Canonical FarmRecord title field.',
  validation: {
    required: false,
  },
  normalization: {
    trim: true,
  },
  overrideMode: 'EXTENDABLE',
  overridableValidation: [
    'required',
  ],
};

export const farmRecordInputMethodField: FieldDefinition = {
  name: 'farmRecordInputMethod',
  type: 'enum',
  description: 'Canonical FarmRecord input method policy.',
  validation: {
    required: true,
    enumValues: [
      'VOICE',
      'MANUAL',
      'IMAGE',
      'VIDEO',
      'MIXED',
    ],
  },
  overrideMode: 'FIXED',
};

export const farmRecordDataField: FieldDefinition = {
  name: 'farmRecordData',
  type: 'object',
  description: 'Canonical FarmRecord data payload.',
  validation: {
    required: true,
  },
  overrideMode: 'FIXED',
};

export const FARM_RECORD_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  farmRecordCategoryField,
  farmRecordTitleField,
  farmRecordInputMethodField,
  farmRecordDataField,
];

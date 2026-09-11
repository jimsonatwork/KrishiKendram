import { FieldDefinition } from './field-definition.interface';

/*
 * Canonical User field policies.
 *
 * These definitions are business-policy definitions, not transport DTOs.
 * DTO validation may reject malformed requests earlier, but every backend
 * entry path that creates or updates a User must use these definitions.
 */

export const userNameField: FieldDefinition = {
  name: 'userName',
  type: 'string',
  description: 'Canonical User display/name field.',
  validation: {
    required: false,
    minLength: 1,
    maxLength: 200,
  },
  normalization: {
    trim: true,
  },
  overrideMode: 'EXTENDABLE',
  overridableValidation: [
    'required',
    'minLength',
    'maxLength',
  ],
};

export const userEmailField: FieldDefinition = {
  name: 'userEmail',
  type: 'string',
  description: 'Canonical User email address field.',
  validation: {
    required: false,
    maxLength: 320,
    pattern:
      '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
  },
  normalization: {
    trim: true,
    lowercase: true,
  },
  overrideMode: 'EXTENDABLE',
  overridableValidation: [
    'required',
    'maxLength',
  ],
};

export const userMobileField: FieldDefinition = {
  name: 'userMobile',
  type: 'string',
  description: 'Canonical User mobile/contact field.',
  validation: {
    required: false,
    maxLength: 50,
  },
  normalization: {
    trim: true,
    lowercase: true,
  },
  overrideMode: 'EXTENDABLE',
  overridableValidation: [
    'required',
    'maxLength',
  ],
};

export const userPreferredLanguageField: FieldDefinition = {
  name: 'userPreferredLanguage',
  type: 'string',
  description: 'Canonical User preferred language field.',
  validation: {
    required: false,
    maxLength: 20,
  },
  normalization: {
    trim: true,
  },
};

export const userProfileCompletionField: FieldDefinition = {
  name: 'userProfileCompletion',
  type: 'number',
  description: 'Canonical User profile completion percentage.',
  validation: {
    required: false,
    min: 0,
    max: 100,
  },
};

export const USER_FIELD_DEFINITIONS = [
  userNameField,
  userEmailField,
  userMobileField,
  userPreferredLanguageField,
  userProfileCompletionField,
];

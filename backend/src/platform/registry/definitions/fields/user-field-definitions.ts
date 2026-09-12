import { FieldDefinition } from '../../field-definition.interface';

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

export const userPasswordField: FieldDefinition = {
  name: 'userPassword',
  type: 'string',
  description: 'Canonical User password policy.',
  validation: {
    required: true,
    minLength: 8,
  },
  overrideMode: 'FIXED',
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

// ============================================================
// USER ENUM / SYSTEM FIELD DEFINITIONS
// ============================================================

export const userRoleField: FieldDefinition = {
  name: 'userRole',
  type: 'enum',
  description: 'Canonical User role policy.',
  validation: {
    required: true,
    enumValues: [
      'SUPER_ADMIN',
      'ADMIN',
      'FARMER',
      'FARM_WORKER',
      'AGRONOMIST',
      'VETERINARIAN',
      'BUYER',
      'MERCHANT',
      'FPO',
      'PARTNER',
      'FIELD_OFFICER',
      'DISTRICT_ADMIN',
      'STATE_ADMIN',
      'GOVERNMENT',
      'NGO',
      'BANK',
      'LOGISTICS',
      'AI_AGENT',
    ],
  },
  overrideMode: 'FIXED',
};

export const userStatusField: FieldDefinition = {
  name: 'userStatus',
  type: 'enum',
  description: 'Canonical User status policy.',
  validation: {
    required: true,
    enumValues: [
      'PENDING',
      'ACTIVE',
      'SUSPENDED',
      'BLOCKED',
      'PENDING_DELETE',
      'DELETED',
    ],
  },
  overrideMode: 'FIXED',
};

export const userPreferredInputMethodField: FieldDefinition = {
  name: 'userPreferredInputMethod',
  type: 'enum',
  description: 'Canonical User preferred input method policy.',
  validation: {
    required: false,
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

export const userVerifiedField: FieldDefinition = {
  name: 'userVerified',
  type: 'boolean',
  description: 'Canonical User verification flag policy.',
  validation: {
    required: true,
  },
  overrideMode: 'FIXED',
};

export const userProfileCompletionField: FieldDefinition = {
  name: 'userProfileCompletion',
  type: 'number',
  description: 'Canonical User profile completion percentage.',
  validation: {
    required: false,
    integer: true,
    min: 0,
    max: 100,
  },
  overrideMode: 'FIXED',
};

export const USER_FIELD_DEFINITIONS = [
  userPasswordField,
  userNameField,
  userEmailField,
  userMobileField,
  userPreferredLanguageField,
  userProfileCompletionField,
  userRoleField,
  userStatusField,
  userPreferredInputMethodField,
  userVerifiedField,
];



import { FieldDefinition } from '../../field-definition.interface';

export const FARM_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  {
    name: 'farmName',
    type: 'string',
    description: 'Canonical Farm name.',
    validation: {
      required: true,
      minLength: 1,
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
  },

  {
    name: 'farmType',
    type: 'string',
    description: 'Farm type or classification.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
      'minLength',
      'maxLength',
      'pattern',
    ],
  },

  {
    name: 'farmDescription',
    type: 'string',
    description: 'Farm description.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
      'minLength',
      'maxLength',
      'pattern',
    ],
  },

  {
    name: 'farmLocation',
    type: 'string',
    description: 'Farm location description.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
      'minLength',
      'maxLength',
      'pattern',
    ],
  },

  {
    name: 'farmLatitude',
    type: 'number',
    description: 'Farm latitude.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
      'min',
      'max',
    ],
  },

  {
    name: 'farmLongitude',
    type: 'number',
    description: 'Farm longitude.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
      'min',
      'max',
    ],
  },

  {
    name: 'farmArea',
    type: 'number',
    description: 'Farm area measurement.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
      'min',
      'max',
    ],
  },

  {
    name: 'farmUnit',
    type: 'string',
    description: 'Farm area unit.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
      'minLength',
      'maxLength',
      'pattern',
    ],
  },
];

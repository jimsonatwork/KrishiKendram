import { FieldDefinition } from '../../field-definition.interface';

export const FARM_ASSET_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  {
    name: 'farmAssetType',
    type: 'string',
    description: 'Canonical Farm Asset type.',
    validation: {
      required: true,
    },
    normalization: {
      trim: true,
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
    name: 'farmAssetName',
    type: 'string',
    description: 'Canonical Farm Asset name.',
    validation: {
      required: false,
      maxLength: 100,
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
    name: 'farmAssetQuantity',
    type: 'number',
    description: 'Farm Asset quantity.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
      'min',
      'max',
      'integer',
    ],
  },

  {
    name: 'farmAssetUnit',
    type: 'string',
    description: 'Farm Asset quantity unit.',
    validation: {
      required: false,
    },
    normalization: {
      trim: true,
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
    name: 'farmAssetMetadata',
    type: 'object',
    description: 'Farm Asset metadata.',
    validation: {
      required: false,
    },
    overrideMode: 'EXTENDABLE',
    overridableValidation: [
      'required',
    ],
  },
];
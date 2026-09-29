import { FieldDefinition } from '../../field-definition.interface';

const stringField = (name: string, description: string): FieldDefinition => ({
  name,
  type: 'string',
  description,
  validation: { required: false, maxLength: 200 },
  normalization: { trim: true },
  overrideMode: 'EXTENDABLE',
  overridableValidation: ['required', 'minLength', 'maxLength', 'pattern'],
});

export const LIVESTOCK_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  stringField('livestockSpecies', 'Livestock species.'),
  stringField('livestockName', 'Livestock display name.'),
  stringField('livestockTag', 'Livestock tag or identifier.'),
  stringField('livestockBreed', 'Livestock breed.'),
  stringField('livestockSex', 'Livestock sex.'),
  stringField('livestockStatus', 'Livestock lifecycle status.'),
  stringField('livestockNotes', 'Livestock notes.'),
  {
    name: 'livestockCount',
    type: 'number',
    description: 'Number of animals represented by the record.',
    validation: { required: false, min: 1, integer: true },
    overrideMode: 'EXTENDABLE',
    overridableValidation: ['required', 'min', 'max', 'integer'],
  },
  {
    name: 'livestockAcquiredAt',
    type: 'string',
    description: 'Livestock acquisition timestamp.',
    validation: { required: false },
    normalization: { trim: true },
    overrideMode: 'EXTENDABLE',
    overridableValidation: ['required', 'minLength', 'maxLength', 'pattern'],
  },
];
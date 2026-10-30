import { CropSeason, CropStatus } from '@prisma/client';
import { FieldDefinition } from '../../field-definition.interface';

export const CROP_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  {
    name: 'cropSeason',
    type: 'enum',
    description: 'Canonical crop season values.',
    validation: { required: false, enumValues: Object.values(CropSeason) },
    overrideMode: 'FIXED',
  },
  {
    name: 'cropStatus',
    type: 'enum',
    description: 'Canonical crop lifecycle stages.',
    validation: { required: false, enumValues: Object.values(CropStatus) },
    overrideMode: 'FIXED',
  },
];

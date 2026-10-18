import { FieldDefinition } from '../../field-definition.interface';

export const REPORT_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  { name: 'reportFarmId', type: 'string', description: 'Farm identifier used to scope an operational report.', validation: { required: false, maxLength: 100 }, normalization: { trim: true }, overrideMode: 'FIXED' },
  { name: 'reportFromDate', type: 'date', description: 'Inclusive report start date.', validation: { required: false }, overrideMode: 'FIXED' },
  { name: 'reportToDate', type: 'date', description: 'Inclusive report end date.', validation: { required: false }, overrideMode: 'FIXED' },
];

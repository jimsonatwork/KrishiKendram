import { FieldDefinition } from '../../field-definition.interface';

export const NOTIFICATION_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  { name: 'notificationType', type: 'string', description: 'Notification event type.', validation: { required: true, maxLength: 40 }, normalization: { trim: true }, overrideMode: 'FIXED' },
  { name: 'notificationTitle', type: 'string', description: 'Short notification title.', validation: { required: true, maxLength: 160 }, normalization: { trim: true }, overrideMode: 'FIXED' },
  { name: 'notificationMessage', type: 'string', description: 'Notification message body.', validation: { required: true, maxLength: 2000 }, normalization: { trim: true }, overrideMode: 'FIXED' },
  { name: 'notificationHref', type: 'string', description: 'Internal application route associated with a notification.', validation: { required: false, maxLength: 500, pattern: '^/app/' }, normalization: { trim: true }, overrideMode: 'FIXED' },
  { name: 'notificationSeverity', type: 'enum', description: 'Notification severity.', validation: { required: true, enumValues: ['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'] }, normalization: { trim: true, }, overrideMode: 'FIXED' },
  { name: 'notificationSource', type: 'string', description: 'Module that produced the notification.', validation: { required: false, maxLength: 40 }, normalization: { trim: true, lowercase: true }, overrideMode: 'FIXED' },
  { name: 'notificationDedupeKey', type: 'string', description: 'Stable event key used to prevent duplicate notifications per user.', validation: { required: false, maxLength: 200 }, normalization: { trim: true }, overrideMode: 'FIXED' },
  { name: 'notificationExpiresAt', type: 'datetime', description: 'Timestamp after which the notification is hidden from user inboxes.', validation: { required: false }, overrideMode: 'FIXED' },
  { name: 'notificationReadAt', type: 'datetime', description: 'Timestamp when the user marked the notification as read.', validation: { required: false }, overrideMode: 'FIXED' },
  { name: 'notificationFilterUnreadOnly', type: 'boolean', description: 'Filter notifications to unread items.', validation: { required: false }, overrideMode: 'FIXED' },
  { name: 'notificationFilterLimit', type: 'number', description: 'Maximum number of notifications returned in one list request.', validation: { required: false, min: 1, max: 100, integer: true }, overrideMode: 'FIXED' },
];

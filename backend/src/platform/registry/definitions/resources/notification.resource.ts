import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

export const notificationResource: ResourceDefinition = {
  name: 'notification',
  module: 'notifications',
  model: 'Notification',
  ownerField: 'userId',
  fields: {
    type: { definition: 'notificationType' },
    title: { definition: 'notificationTitle' },
    message: { definition: 'notificationMessage' },
    href: { definition: 'notificationHref' },
    severity: { definition: 'notificationSeverity' },
    source: { definition: 'notificationSource' },
    dedupeKey: { definition: 'notificationDedupeKey' },
    expiresAt: { definition: 'notificationExpiresAt' },
    readAt: { definition: 'notificationReadAt' },
    unreadOnly: { definition: 'notificationFilterUnreadOnly' },
    limit: { definition: 'notificationFilterLimit' },
  },
  searchableFields: ['type', 'title', 'message'],
  sortableFields: ['createdAt', 'severity'],
  defaultSort: 'createdAt:desc',
  capabilities: [
    { action: AuthorizationAction.READ, scopes: [AuthorizationScope.OWN] },
    { action: AuthorizationAction.UPDATE, scopes: [AuthorizationScope.OWN] },
  ],
  permissions: ['READ', 'UPDATE'],
  scopes: ['OWN'],
  features: ['severity', 'deduplication', 'logical-retention', 'safe-internal-links', 'read-unread-state', 'filtering'],
  softDelete: false,
};

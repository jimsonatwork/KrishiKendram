import { Module } from '@nestjs/common';
import { RegistryModule } from '../platform/registry/registry.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MessagingIntegrationsController } from './messaging-integrations.controller';
import { MessagingIntegrationService } from './messaging-integration.service';

@Module({ imports: [RegistryModule], controllers: [NotificationsController, MessagingIntegrationsController], providers: [NotificationsService, MessagingIntegrationService], exports: [NotificationsService, MessagingIntegrationService] })
export class NotificationsModule {}

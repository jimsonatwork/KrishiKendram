import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingIntegrationService } from './messaging-integration.service';

@Controller('notifications/messaging-integrations')
@UseGuards(JwtAuthGuard)
export class MessagingIntegrationsController {
  constructor(private readonly messaging: MessagingIntegrationService) {}

  @Get() list(@Req() req: any) { return this.messaging.listConnections(req.user.userId); }
  @Post('arattai/connect') connectArattai(@Req() req: any, @Body() body: { accessToken: string; displayName?: string }) { return this.messaging.connectArattai(req.user.userId, body); }
  @Delete(':provider') disconnect(@Req() req: any, @Param('provider') provider: string) { return this.messaging.disconnect(req.user.userId, provider); }
  @Get('arattai/consents') listConsents(@Req() req: any) { return this.messaging.listConsents(req.user.userId); }
  @Post('arattai/consents') recordConsent(@Req() req: any, @Body() body: { phoneNumber: string; confirmed: boolean; source: string; purpose?: string; note?: string }) { return this.messaging.recordPromotionalConsent(req.user.userId, body); }
  @Delete('arattai/consents/:id') revokeConsent(@Req() req: any, @Param('id') id: string) { return this.messaging.revokeConsent(req.user.userId, id); }
  @Post('arattai/test-promotion') testPromotion(@Req() req: any, @Body() body: { phoneNumber: string; templateId: string; language?: string; variables?: Record<string, string> }) { return this.messaging.sendTestPromotion(req.user.userId, body); }
  @Post('arattai/transactional') sendTransactional(@Req() req: any, @Body() body: { consentId: string; templateId: string; language?: string; variables?: Record<string, string>; authenticationCode?: string }) { return this.messaging.sendTransactionalMessage(req.user.userId, body); }
  @Post('arattai/promotional') sendPromotion(@Req() req: any, @Body() body: { consentId: string; templateId: string; language?: string; variables?: Record<string, string>; authenticationCode?: string }) { return this.messaging.sendPromotionalMessage(req.user.userId, body); }
}

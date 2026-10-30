import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDecisionDto } from './dto/order-decision.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { QuoteOrderDto } from './dto/quote-order.dto';
import { UpdateCommercePolicyDto } from './dto/update-commerce-policy.dto';
import { CreateTrustCaseDto } from './dto/create-trust-case.dto';
import { ResolveTrustCaseDto } from './dto/resolve-trust-case.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { CreateSandboxPaymentIntentDto } from './dto/create-sandbox-payment-intent.dto';
import { SandboxPaymentWebhookDto } from './dto/sandbox-payment-webhook.dto';
import { CreateSandboxRefundDto } from './dto/create-sandbox-refund.dto';
import { SandboxRefundWebhookDto } from './dto/sandbox-refund-webhook.dto';
import { CreateSandboxChargebackDto } from './dto/create-sandbox-chargeback.dto';
import { SandboxChargebackWebhookDto } from './dto/sandbox-chargeback-webhook.dto';
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto';
import { ApproveTaxProfileDto } from './dto/approve-tax-profile.dto';
import { RetireTaxProfileDto } from './dto/retire-tax-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { SendMarketplaceMessageDto } from './dto/send-marketplace-message.dto';
import { CreateMarketplaceListingQuestionDto } from './dto/create-marketplace-listing-question.dto';
import { CreateMarketplaceRfqDto } from './dto/create-marketplace-rfq.dto';
import { RespondMarketplaceRfqDto } from './dto/respond-marketplace-rfq.dto';
import { DecideMarketplaceRfqResponseDto } from './dto/decide-marketplace-rfq-response.dto';

import { MarketplaceService } from './marketplace.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}
  @Post('media/images') @UseGuards(JwtAuthGuard) @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({ destination: (_req, _file, cb) => { const dir = join(process.env.KK_MARKETPLACE_MEDIA_DIR || join(process.cwd(), 'uploads', 'marketplace'), '..', '.marketplace-tmp'); mkdirSync(dir, { recursive: true }); cb(null, dir); }, filename: (_req, _file, cb) => cb(null, randomUUID()) }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype) ? cb(null, true) : cb(new BadRequestException('Upload a JPEG, PNG, WebP or AVIF image.'), false),
  })) uploadMarketplaceImage(@Req() req: any, @UploadedFile() file: any) { return this.marketplace.saveMediaUpload(req.user.userId, req.user.role, file, 'image'); }
  @Post('media/videos') @UseGuards(JwtAuthGuard) @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({ destination: (_req, _file, cb) => { const dir = join(process.env.KK_MARKETPLACE_MEDIA_DIR || join(process.cwd(), 'uploads', 'marketplace'), '..', '.marketplace-tmp'); mkdirSync(dir, { recursive: true }); cb(null, dir); }, filename: (_req, _file, cb) => cb(null, randomUUID()) }),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => ['video/mp4', 'video/webm'].includes(file.mimetype) ? cb(null, true) : cb(new BadRequestException('Upload an MP4 or WebM video.'), false),
  })) uploadMarketplaceVideo(@Req() req: any, @UploadedFile() file: any) { return this.marketplace.saveMediaUpload(req.user.userId, req.user.role, file, 'video'); }
  @Get('buyer-profile/mine') @UseGuards(JwtAuthGuard) getBuyerProfile(@Req() req: any) { return this.marketplace.getBuyerProfile(req.user.userId); }
  @Get('buyer-profile/context/:module') @UseGuards(JwtAuthGuard) getBuyerProfileContext(@Req() req: any, @Param('module') module: string) { return this.marketplace.getBuyerProfileContext(req.user.userId, module); }
  @Patch('buyer-profile/mine') @UseGuards(JwtAuthGuard) saveBuyerProfile(@Req() req: any, @Body() body: any) { return this.marketplace.saveBuyerProfile(req.user.userId, body); }
  @Post('buyer-profile/mine/revoke-cross-module-consent') @UseGuards(JwtAuthGuard) revokeBuyerProfileCrossModuleConsent(@Req() req: any) { return this.marketplace.revokeBuyerProfileCrossModuleConsent(req.user.userId); }
  @Get('views/last-hour') getListingViewCounts() { return this.marketplace.getListingViewCounts(); }
  @Post('listings/:id/views') recordListingView(@Param('id') id: string, @Body('sessionKey') sessionKey: string) { return this.marketplace.recordListingView(id, sessionKey); }
  @Get('listings/:id/views') getListingViewCount(@Param('id') id: string) { return this.marketplace.getListingViewCount(id); }
  @Get('commerce-policy') getCommercePolicy() { return this.marketplace.getCommercePolicy(); }
  @Get('features/public') getPublicFeatureFlags() { return this.marketplace.getPublicFeatureFlags(); }
  @Get('offering-types') getOfferingTypes() { return this.marketplace.getOfferingTypes(); }
    @Get('features') @UseGuards(JwtAuthGuard) getFeatureFlags(@Req() req: any) { return this.marketplace.getFeatureFlags(req.user.userId, req.user.role, req.user.authorityTier); }
  @Patch('features/:key') @UseGuards(JwtAuthGuard) updateFeatureFlag(@Req() req: any, @Param('key') key: string, @Body() dto: UpdateFeatureFlagDto) { return this.marketplace.updateFeatureFlag(req.user.userId, req.user.role, key, dto, req.user.authorityTier); }
  @Get('tax-profiles') @UseGuards(JwtAuthGuard) listTaxProfiles(@Req() req: any) { return this.marketplace.listTaxProfiles(req.user.role); }
  @Post('tax-profiles') @UseGuards(JwtAuthGuard) createTaxProfile(@Req() req: any, @Body() dto: CreateTaxProfileDto) { return this.marketplace.createTaxProfile(req.user.userId, req.user.role, dto); }
  @Patch('tax-profiles/:id/approve') @UseGuards(JwtAuthGuard) approveTaxProfile(@Req() req: any, @Param('id') id: string, @Body() dto: ApproveTaxProfileDto) { return this.marketplace.approveTaxProfile(req.user.userId, req.user.role, id, dto.reviewReference); }
  @Patch('tax-profiles/:id/retire') @UseGuards(JwtAuthGuard) retireTaxProfile(@Req() req: any, @Param('id') id: string, @Body() dto: RetireTaxProfileDto) { return this.marketplace.retireTaxProfile(req.user.userId, req.user.role, id, dto.reason); }
  @Patch('commerce-policy') @UseGuards(JwtAuthGuard) updateCommercePolicy(@Req() req: any, @Body() dto: UpdateCommercePolicyDto) { return this.marketplace.updateCommercePolicy(req.user.userId, req.user.role, dto); }
  @Post('listings/:id/quote') @UseGuards(JwtAuthGuard) quoteOrder(@Req() req: any, @Param('id') id: string, @Body() dto: QuoteOrderDto) { return this.marketplace.quoteOrder(req.user.userId, req.user.role, id, dto); }
  @Get('context-policies/:key') getContextPolicy(@Param('key') key: string) { return this.marketplace.getContextPolicy(key); }
  @Get('categories') getCategories() { return this.marketplace.getCategories(); }
  @Get('listings') findPublished(@Query('period') period?: string, @Query('category') category?: string) { return this.marketplace.findPublished(period, category); }
  @Get('listings/:id/questions') listListingQuestions(@Param('id') id: string) { return this.marketplace.listListingQuestions(id); }
  @Get('listings/:id/questions/mine') @UseGuards(JwtAuthGuard) listMyListingQuestions(@Req() req: any, @Param('id') id: string) { return this.marketplace.listListingQuestions(id, req.user.userId); }
  @Post('listings/:id/questions') @UseGuards(JwtAuthGuard) createListingQuestion(@Req() req: any, @Param('id') id: string, @Body() dto: CreateMarketplaceListingQuestionDto) { return this.marketplace.createListingQuestion(req.user.userId, req.user.role, id, dto); }
  @Patch('listings/:listingId/questions/:questionId/answer') @UseGuards(JwtAuthGuard) answerListingQuestion(@Req() req: any, @Param('listingId') listingId: string, @Param('questionId') questionId: string, @Body('answer') answer: string) { return this.marketplace.answerListingQuestion(req.user.userId, req.user.role, listingId, questionId, answer); }
  @Get('listings/mine') @UseGuards(JwtAuthGuard) findMine(@Req() req: any) { return this.marketplace.findMine(req.user.userId, req.user.role); }
  @Get('orders/mine') @UseGuards(JwtAuthGuard) findMyOrders(@Req() req: any) { return this.marketplace.findMyOrders(req.user.userId, req.user.role); }
  @Get('history/mine') @UseGuards(JwtAuthGuard) getCommerceHistory(@Req() req: any) { return this.marketplace.getCommerceHistory(req.user.userId, req.user.role); }
  @Get('seller-profile-visibility') @UseGuards(JwtAuthGuard) getSellerProfileVisibilityPolicy(@Req() req:any) { return this.marketplace.getSellerProfileVisibilityPolicy(req.user.userId); }
  @Patch('seller-profile-visibility') @UseGuards(JwtAuthGuard) updateSellerProfileVisibilityPolicy(@Req() req:any,@Body() body:any) { return this.marketplace.updateSellerProfileVisibilityPolicy(req.user.userId,body); }
  @Get('profile/mine') @UseGuards(JwtAuthGuard) getMySellerProfile(@Req() req:any) { return this.marketplace.getSellerProfile(req.user.userId, 'marketplace', undefined, true); }
  @Patch('profile/mine') @UseGuards(JwtAuthGuard) updateMySellerProfile(@Req() req:any,@Body() dto:UpdateSellerProfileDto) { return this.marketplace.updateSellerProfile(req.user.userId,req.user.role,dto); }
  @Get('sellers/:id/profile') getSellerProfile(@Param('id') id:string,@Query('module') module?:string,@Query('category') category?:string) { return this.marketplace.getSellerProfile(id,module,category); }
  @Get('favorites/mine') @UseGuards(JwtAuthGuard) listFavorites(@Req() req:any) { return this.marketplace.listFavorites(req.user.userId); }
  @Post('listings/:id/favorite') @UseGuards(JwtAuthGuard) addFavorite(@Req() req:any,@Param('id') id:string) { return this.marketplace.addFavorite(req.user.userId,req.user.role,id); }
  @Delete('listings/:id/favorite') @UseGuards(JwtAuthGuard) removeFavorite(@Req() req:any,@Param('id') id:string) { return this.marketplace.removeFavorite(req.user.userId,id); }
  @Get('messages/mine') @UseGuards(JwtAuthGuard) listMessages(@Req() req:any) { return this.marketplace.listMessages(req.user.userId); }
  @Post('messages') @UseGuards(JwtAuthGuard) sendMessage(@Req() req:any,@Body() dto:SendMarketplaceMessageDto) { return this.marketplace.sendMessage(req.user.userId,req.user.role,dto); }
  @Patch('messages/:id/read') @UseGuards(JwtAuthGuard) markMessageRead(@Req() req:any,@Param('id') id:string) { return this.marketplace.markMessageRead(req.user.userId,id); }
  @Get('rfqs/open') @UseGuards(JwtAuthGuard) listOpenRFQs() { return this.marketplace.listOpenRFQs(); }
  @Get('rfqs/mine') @UseGuards(JwtAuthGuard) listMyRFQs(@Req() req:any) { return this.marketplace.listMyRFQs(req.user.userId); }
  @Post('rfqs') @UseGuards(JwtAuthGuard) createRFQ(@Req() req:any,@Body() dto:CreateMarketplaceRfqDto) { return this.marketplace.createRFQ(req.user.userId,req.user.role,dto); }
  @Post('rfqs/:id/responses') @UseGuards(JwtAuthGuard) respondToRFQ(@Req() req:any,@Param('id') id:string,@Body() dto:RespondMarketplaceRfqDto) { return this.marketplace.respondToRFQ(req.user.userId,req.user.role,id,dto); }
  @Patch('rfqs/:id/responses/:responseId/decision') @UseGuards(JwtAuthGuard) decideRFQResponse(@Req() req:any,@Param('id') id:string,@Param('responseId') responseId:string,@Body() dto:DecideMarketplaceRfqResponseDto) { return this.marketplace.decideRFQResponse(req.user.userId,req.user.role,id,responseId,dto); }
  @Patch('rfqs/:id/cancel') @UseGuards(JwtAuthGuard) cancelRFQ(@Req() req:any,@Param('id') id:string,@Body('reason') reason:string) { return this.marketplace.cancelRFQ(req.user.userId,id,reason); }
  @Get('settlements/mine') @UseGuards(JwtAuthGuard) getSellerSettlementStatement(@Req() req: any) { return this.marketplace.getSellerSettlementStatement(req.user.userId, req.user.role); }
  @Get('settlements/holds') @UseGuards(JwtAuthGuard) listPayoutHolds(@Req() req: any) { return this.marketplace.listPayoutHolds(req.user.role); }
  @Post('settlements/orders/:orderId/holds') @UseGuards(JwtAuthGuard) createPayoutHold(@Req() req: any,@Param('orderId') orderId:string,@Body() body:{reason:string;expiresAt?:string}) { return this.marketplace.createPayoutHold(req.user.userId,req.user.role,orderId,body.reason,body.expiresAt); }
  @Patch('settlements/holds/:id/release') @UseGuards(JwtAuthGuard) releasePayoutHold(@Req() req:any,@Param('id') id:string,@Body('reason') reason:string) { return this.marketplace.releasePayoutHold(req.user.userId,req.user.role,id,reason); }
  @Post('settlements/reconciliation/run') @UseGuards(JwtAuthGuard) runMarketplaceReconciliation(@Req() req:any) { return this.marketplace.runMarketplaceReconciliation(req.user.userId,req.user.role); }
  @Get('settlements/reconciliation') @UseGuards(JwtAuthGuard) getMarketplaceReconciliationRuns(@Req() req:any) { return this.marketplace.getMarketplaceReconciliationRuns(req.user.role); }
  @Get('trust/cases') @UseGuards(JwtAuthGuard) listTrustCases(@Req() req: any) { return this.marketplace.listTrustCases(req.user.userId, req.user.role); }
  @Post('trust/cases') @UseGuards(JwtAuthGuard) createTrustCase(@Req() req: any, @Body() dto: CreateTrustCaseDto) { return this.marketplace.createTrustCase(req.user.userId, req.user.role, dto); }
  @Patch('trust/cases/:id/resolve') @UseGuards(JwtAuthGuard) resolveTrustCase(@Req() req: any, @Param('id') id: string, @Body() dto: ResolveTrustCaseDto) { return this.marketplace.resolveTrustCase(req.user.userId, req.user.role, id, dto); }
  @Get('trust/restrictions') @UseGuards(JwtAuthGuard) listRestrictions(@Req() req: any) { return this.marketplace.listRestrictions(req.user.role); }
  @Patch('trust/restrictions/:id/revoke') @UseGuards(JwtAuthGuard) revokeRestriction(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string) { return this.marketplace.revokeRestriction(req.user.userId, req.user.role, id, reason); }
  @Get('reviews/moderation/queue') @UseGuards(JwtAuthGuard) listReviewsForModeration(@Req() req: any) { return this.marketplace.listReviewsForModeration(req.user.role); }
  @Patch('reviews/:id/response') @UseGuards(JwtAuthGuard) respondToReview(@Req() req: any, @Param('id') id: string, @Body() dto: RespondReviewDto) { return this.marketplace.respondToReview(req.user.userId, req.user.role, id, dto); }
  @Patch('reviews/:id/moderate') @UseGuards(JwtAuthGuard) moderateReview(@Req() req: any, @Param('id') id: string, @Body() dto: ModerateReviewDto) { return this.marketplace.moderateReview(req.user.userId, req.user.role, id, dto); }
  @Get('reviews/user/:id') getPublicReviews(@Param('id') id: string) { return this.marketplace.getPublicReviews(id); }
  @Post('orders/:id/reviews') @UseGuards(JwtAuthGuard) createReview(@Req() req: any, @Param('id') id: string, @Body() dto: CreateReviewDto) { return this.marketplace.createReview(req.user.userId, req.user.role, id, dto); }
  @Post('listings/:id/orders') @UseGuards(JwtAuthGuard) createOrder(@Req() req: any, @Param('id') id: string, @Body() dto: CreateOrderDto) { return this.marketplace.createOrder(req.user.userId, req.user.role, id, dto); }
  @Post('orders/:id/payments/sandbox-intent') @UseGuards(JwtAuthGuard) createSandboxPaymentIntent(@Req() req: any, @Param('id') id: string, @Body() dto: CreateSandboxPaymentIntentDto) { return this.marketplace.createSandboxPaymentIntent(req.user.userId, req.user.role, id, dto.idempotencyKey); }
  @Post('orders/:id/chargebacks/sandbox') @UseGuards(JwtAuthGuard) createSandboxChargeback(@Req() req: any, @Param('id') id: string, @Body() dto: CreateSandboxChargebackDto) { return this.marketplace.createSandboxChargeback(req.user.userId, req.user.role, id, dto); }
  @Patch('chargebacks/sandbox/:id/evidence') @UseGuards(JwtAuthGuard) submitSandboxChargebackEvidence(@Req() req: any, @Param('id') id: string, @Body('evidenceUrls') evidenceUrls: string[]) { return this.marketplace.submitSandboxChargebackEvidence(req.user.userId, req.user.role, id, evidenceUrls); }
  @Post('orders/:id/payments/sandbox-refunds') @UseGuards(JwtAuthGuard) createSandboxRefundRequest(@Req() req: any, @Param('id') id: string, @Body() dto: CreateSandboxRefundDto) { return this.marketplace.createSandboxRefundRequest(req.user.userId, req.user.role, id, dto); }
  @Post('payments/sandbox/chargebacks/webhook') handleSandboxChargebackWebhook(@Req() req: any, @Headers('x-kk-sandbox-signature') signature: string | undefined, @Body() dto: SandboxChargebackWebhookDto) { return this.marketplace.handleSandboxChargebackWebhook(req.rawBody, signature, dto); }
  @Post('payments/sandbox/refunds/webhook') handleSandboxRefundWebhook(@Req() req: any, @Headers('x-kk-sandbox-signature') signature: string | undefined, @Body() dto: SandboxRefundWebhookDto) { return this.marketplace.handleSandboxRefundWebhook(req.rawBody, signature, dto); }
  @Post('payments/sandbox/webhook') handleSandboxPaymentWebhook(@Req() req: any, @Headers('x-kk-sandbox-signature') signature: string | undefined, @Body() dto: SandboxPaymentWebhookDto) { return this.marketplace.handleSandboxPaymentWebhook(req.rawBody, signature, dto); }
  @Patch('orders/:id/delivery') @UseGuards(JwtAuthGuard) updateDelivery(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateDeliveryDto) { return this.marketplace.updateDelivery(req.user.userId, req.user.role, id, dto); }
  @Post('orders/:id/confirm-delivery') @UseGuards(JwtAuthGuard) confirmDelivery(@Req() req: any, @Param('id') id: string) { return this.marketplace.confirmDelivery(req.user.userId, req.user.role, id); }
  @Post('orders/:id/counter-offer') @UseGuards(JwtAuthGuard) counterOffer(@Req() req: any, @Param('id') id: string, @Body() dto: CounterOfferDto) { return this.marketplace.counterOffer(req.user.userId, req.user.role, id, dto); }
  @Post('orders/:id/confirm-price') @UseGuards(JwtAuthGuard) confirmOrderPrice(@Req() req: any, @Param('id') id: string) { return this.marketplace.confirmOrderPrice(req.user.userId, req.user.role, id); }
  @Post('orders/:id/accept') @UseGuards(JwtAuthGuard) acceptOrder(@Req() req: any, @Param('id') id: string, @Body() dto: OrderDecisionDto) { return this.marketplace.acceptOrder(req.user.userId, req.user.role, id, dto); }
  @Post('orders/:id/reject') @UseGuards(JwtAuthGuard) rejectOrder(@Req() req: any, @Param('id') id: string, @Body() dto: OrderDecisionDto) { return this.marketplace.rejectOrder(req.user.userId, req.user.role, id, dto); }
  @Post('orders/:id/cancel') @UseGuards(JwtAuthGuard) cancelOrder(@Req() req: any, @Param('id') id: string, @Body() dto: OrderDecisionDto) { return this.marketplace.cancelOrder(req.user.userId, req.user.role, id, dto); }
  @Post('orders/:id/complete') @UseGuards(JwtAuthGuard) completeOrder(@Req() req: any, @Param('id') id: string, @Body() dto: OrderDecisionDto) { return this.marketplace.completeOrder(req.user.userId, req.user.role, id, dto); }
  @Post('listings') @UseGuards(JwtAuthGuard) create(@Req() req: any, @Body() dto: CreateListingDto) { return this.marketplace.create(req.user.userId, req.user.role, dto); }
  @Patch('listings/:id') @UseGuards(JwtAuthGuard) update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateListingDto) { return this.marketplace.update(req.user.userId, req.user.role, id, dto); }
  @Post('listings/:id/publish') @UseGuards(JwtAuthGuard) publish(@Req() req: any, @Param('id') id: string) { return this.marketplace.publish(req.user.userId, req.user.role, id); }
  @Delete('listings/:id') @UseGuards(JwtAuthGuard) archive(@Req() req: any, @Param('id') id: string) { return this.marketplace.archive(req.user.userId, req.user.role, id); }
}
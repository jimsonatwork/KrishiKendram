import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InventoryTransactionType, Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../platform/audit/audit.service';
import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from '../platform/registry/registry.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { SendMarketplaceMessageDto } from './dto/send-marketplace-message.dto';
import { CreateMarketplaceRfqDto } from './dto/create-marketplace-rfq.dto';
import { RespondMarketplaceRfqDto } from './dto/respond-marketplace-rfq.dto';
import { DecideMarketplaceRfqResponseDto } from './dto/decide-marketplace-rfq-response.dto';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDecisionDto } from './dto/order-decision.dto';
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
import { mkdirSync, openSync, readSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const RESOURCE_TYPES = ['farmAsset', 'crop', 'livestock', 'inventoryItem'] as const;
const LISTING_PERIODS = ['today', 'yesterday', 'day-before-yesterday', 'week', 'active'] as const;

const MARKETPLACE_FEATURES: Array<{ key: string; title: string; description: string; enabled: boolean; riskLevel: string; dependencies: string[] }> = [
  { key: 'marketplace.listings', title: 'Marketplace listings', description: 'Create, browse and publish listings.', enabled: true, riskLevel: 'MEDIUM', dependencies: [] },
  { key: 'marketplace.media_uploads', title: 'Persistent media uploads', description: 'Upload validated Marketplace photos and short videos to local durable storage.', enabled: true, riskLevel: 'HIGH', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.wholesale_pricing', title: 'Wholesale price tiers', description: 'Quantity-based unit prices for bulk agricultural orders.', enabled: true, riskLevel: 'MEDIUM', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.offers', title: 'Buyer offers and revised prices', description: 'Offers, seller counter-prices and buyer confirmation.', enabled: true, riskLevel: 'MEDIUM', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.buyer_fees', title: 'Buyer platform fee', description: 'Show configured buyer fee in quote breakdowns.', enabled: false, riskLevel: 'HIGH', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.seller_commission', title: 'Seller commission', description: 'Show configured seller commission and net estimate.', enabled: false, riskLevel: 'HIGH', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.tax_display', title: 'Reviewed tax calculation', description: 'Use only legally reviewed tax configuration.', enabled: false, riskLevel: 'CRITICAL', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.tax_profiles', title: 'Jurisdiction-aware tax profiles', description: 'Apply only approved, dated, reviewed seller/buyer jurisdiction and category tax profiles.', enabled: false, riskLevel: 'CRITICAL', dependencies: ['marketplace.tax_display'] },
  { key: 'marketplace.reviews', title: 'Verified reviews', description: 'Transaction-backed ratings and moderated comments.', enabled: true, riskLevel: 'MEDIUM', dependencies: ['marketplace.orders'] },
  { key: 'marketplace.trust_reports', title: 'Trust reports and appeals', description: 'Private case intake, evidence and review workflow.', enabled: true, riskLevel: 'HIGH', dependencies: ['marketplace.orders'] },
  { key: 'marketplace.restrictions', title: 'Caution and temporary restrictions', description: 'Evidence-backed, scoped and expiring restrictions.', enabled: true, riskLevel: 'CRITICAL', dependencies: ['marketplace.trust_reports'] },
  { key: 'marketplace.history', title: 'Buyer and seller history', description: 'Scoped purchase and sales history.', enabled: true, riskLevel: 'MEDIUM', dependencies: ['marketplace.orders'] },
  { key: 'marketplace.favorites', title: 'Saved listings', description: 'Private favorites and buyer shortlist.', enabled: true, riskLevel: 'LOW', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.messaging', title: 'Buyer and seller messaging', description: 'Authenticated, participant-scoped Marketplace messages.', enabled: true, riskLevel: 'MEDIUM', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.rfq', title: 'Bulk RFQ and quotations', description: 'Buyer requests and seller quantity/price responses.', enabled: true, riskLevel: 'MEDIUM', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.orders', title: 'Order workflow', description: 'Buyer requests, seller decisions and fulfilment states.', enabled: true, riskLevel: 'HIGH', dependencies: ['marketplace.listings'] },
  { key: 'marketplace.delivery', title: 'Delivery and tracking', description: 'Seller tracking updates and buyer delivery confirmation.', enabled: true, riskLevel: 'HIGH', dependencies: ['marketplace.orders'] },
  { key: 'marketplace.payment_sandbox', title: 'Sandbox payment simulation', description: 'Signed, replay-protected simulated payment events; never moves money.', enabled: false, riskLevel: 'CRITICAL', dependencies: ['marketplace.orders'] },
  { key: 'marketplace.payments', title: 'Provider-backed payments', description: 'Disabled until provider, webhook, ledger and reconciliation review passes.', enabled: false, riskLevel: 'CRITICAL', dependencies: ['marketplace.orders'] },
  { key: 'marketplace.refunds_sandbox', title: 'Sandbox refund simulation', description: 'Signed, idempotent simulated refunds with balanced ledger reversals; never moves money.', enabled: false, riskLevel: 'CRITICAL', dependencies: ['marketplace.payment_sandbox'] },
  { key: 'marketplace.refunds', title: 'Refunds and chargebacks', description: 'Provider-backed full/partial refunds and disputes.', enabled: false, riskLevel: 'CRITICAL', dependencies: ['marketplace.payments'] },
  { key: 'marketplace.settlement', title: 'Seller settlement and payouts', description: 'Reconciled seller net, payout holds and settlement.', enabled: false, riskLevel: 'CRITICAL', dependencies: ['marketplace.payments'] },
];

type MarketplaceValidatedFields = {
  title?: string;
  category?: string;
  description?: string | null;
  quantity?: number | null;
  minOrderQuantity?: number | null;
  sellerJurisdictionCode?: string | null;
  unit?: string | null;
  price?: number | null;
  currency?: string;
};

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
    private readonly registry: RegistryService,
  ) {}

  async getPublicFeatureFlags() {
    const stored = await this.prisma.marketplaceFeatureFlag.findMany({ select: { key: true, enabled: true } });
    const state = new Map((stored || []).map((item: any) => [item.key, item.enabled]));
    return MARKETPLACE_FEATURES.map((feature) => ({ key: feature.key, enabled: state.has(feature.key) ? state.get(feature.key) : feature.enabled }));
  }

  async getFeatureFlags(userId: string, role: UserRole) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Marketplace feature settings require Admin, Super Admin, or God Mode authority.');
    await this.prisma.marketplaceFeatureFlag.createMany({ data: MARKETPLACE_FEATURES.map((f) => ({ ...f, dependencies: [...f.dependencies] })), skipDuplicates: true });
    return this.prisma.marketplaceFeatureFlag.findMany({ orderBy: [{ riskLevel: 'desc' }, { key: 'asc' }] });
  }

  async updateFeatureFlag(userId: string, role: UserRole, key: string, dto: UpdateFeatureFlagDto) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Marketplace feature settings require Admin, Super Admin, or God Mode authority.');
    const definition = MARKETPLACE_FEATURES.find((f) => f.key === key);
    if (!definition) throw new NotFoundException('Marketplace feature flag not found.');
    const enabledValidation = this.registry.validateResourceField('marketplaceFeatureFlag', 'enabled', dto.enabled); if (!enabledValidation.valid) throw new BadRequestException({ message: 'Invalid Marketplace feature state.', errors: enabledValidation.errors });
    if (!dto.reason?.trim()) throw new BadRequestException('A reason is required for every feature toggle.');
    if (definition.riskLevel === 'CRITICAL' && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Critical Marketplace features require Super Admin or God Mode authority.');
    const current = await this.prisma.marketplaceFeatureFlag.findUnique({ where: { key } });
    const nextEnabled = dto.enabled;
    if (!nextEnabled) {
      const dependents = MARKETPLACE_FEATURES.filter((f) => f.dependencies.includes(key));
      for (const dependent of dependents) {
        const state = await this.prisma.marketplaceFeatureFlag.findUnique({ where: { key: dependent.key } });
        if (state?.enabled ?? dependent.enabled) throw new BadRequestException('Disable dependent feature first: ' + dependent.title + '.');
      }
      if (key === 'marketplace.orders') {
        const inFlight = await this.prisma.marketplaceOrder.count({ where: { status: { in: ['PENDING', 'PRICE_CONFIRMATION_REQUIRED', 'ACCEPTED'] } } });
        if (inFlight > 0) throw new BadRequestException('Cannot disable orders while active transactions exist. Resolve or safely drain them first.');
      }
    }
    const saved = await this.prisma.$transaction(async (tx) => {
      const flag = await tx.marketplaceFeatureFlag.upsert({ where: { key }, create: { ...definition, enabled: nextEnabled, version: 1, updatedById: userId }, update: { enabled: nextEnabled, version: (current?.version || 0) + 1, updatedById: userId } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'TOGGLE_MARKETPLACE_FEATURE', resourceType: 'marketplaceFeatureFlag', resourceId: key, description: 'Marketplace feature toggle changed', metadata: { previousEnabled: current?.enabled ?? definition.enabled, enabled: nextEnabled, version: flag.version, riskLevel: definition.riskLevel, reason: dto.reason.trim(), dependencies: [...definition.dependencies] } });
      return flag;
    });
    return saved;
  }

  private async isFeatureEnabled(key: string): Promise<boolean> {
    const stored = await this.prisma.marketplaceFeatureFlag.findUnique({ where: { key }, select: { enabled: true } });
    if (stored) return stored.enabled;
    return MARKETPLACE_FEATURES.find((feature) => feature.key === key)?.enabled ?? false;
  }

  private async assertFeatureEnabled(key: string) {
    if (!(await this.isFeatureEnabled(key))) throw new BadRequestException('Marketplace feature is currently disabled: ' + key + '.');
  }

  private async assertSellerNotMarketplaceRestricted(sellerId: string) {
    const now = new Date();
    const restriction = await this.prisma.marketplaceRestriction.findFirst({ where: { userId: sellerId, scope: 'MARKETPLACE_ALL', status: 'ACTIVE', startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true } });
    if (restriction) throw new NotFoundException('Marketplace listing not found.');
  }

  private async assertNotRestricted(userId: string, scope: 'LISTING_CREATE' | 'ORDER_CREATE') {
    const now = new Date();
    const restriction = await this.prisma.marketplaceRestriction.findFirst({ where: { userId, status: 'ACTIVE', startsAt: { lte: now }, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, { OR: [{ scope: 'MARKETPLACE_ALL' }, { scope }] }] }, select: { id: true, scope: true, reason: true, expiresAt: true } });
    if (restriction) throw new UnauthorizedException({ message: 'Marketplace action is restricted pending review.', restriction: { scope: restriction.scope, reason: restriction.reason, expiresAt: restriction.expiresAt } });
  }

  async createTrustCase(userId: string, role: UserRole, dto: CreateTrustCaseDto) {
    if (dto.type !== 'APPEAL') await this.assertFeatureEnabled('marketplace.trust_reports');
    for (const [field, value] of [['type', dto.type || 'REPORT'], ['category', dto.category]] as const) { const validation = this.registry.validateResourceField('marketplaceTrustCase', field, value); if (!validation.valid) throw new BadRequestException({ message: 'Invalid Marketplace trust case ' + field + '.', errors: validation.errors }); }
    if (!dto.description?.trim()) throw new BadRequestException('Provide a short description of the concern.');
    if (dto.type === 'DISPUTE' && !dto.orderId) throw new BadRequestException('An order dispute must reference the related Marketplace order.');
    let targetUserId: string | null = null;
    if (dto.type === 'APPEAL') {
      if (!dto.appealOfCaseId) throw new BadRequestException('Select the case you are appealing.');
      const appealed = await this.prisma.marketplaceTrustCase.findUnique({ where: { id: dto.appealOfCaseId } });
      if (!appealed || (appealed.reporterId !== userId && appealed.targetUserId !== userId)) throw new NotFoundException('Marketplace case not found.');
      if (appealed.status !== 'RESOLVED' && appealed.status !== 'DISMISSED') throw new BadRequestException('Only a decided case can be appealed.');
      targetUserId = appealed.resolvedById || appealed.assignedToId || null;
    }
    if (dto.orderId) {
      const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: dto.orderId } });
      if (!order || (order.buyerId !== userId && order.sellerId !== userId)) throw new NotFoundException('Marketplace order not found.');
      if (dto.type === 'DISPUTE' && !['ACCEPTED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status)) throw new BadRequestException('An order dispute can be opened after the seller has acted on the order.');
      if (dto.type !== 'APPEAL') targetUserId = order.buyerId === userId ? order.sellerId : order.buyerId;
      if (dto.listingId && dto.listingId !== order.listingId) throw new BadRequestException('Listing does not match the supplied order.');
    }
    if (dto.listingId) {
      const listing = await this.prisma.marketplaceListing.findFirst({ where: { id: dto.listingId, deletedAt: null }, select: { id: true, sellerId: true } });
      if (!listing) throw new NotFoundException('Marketplace listing not found.');
      if (dto.type !== 'APPEAL' && listing.sellerId !== userId) targetUserId = listing.sellerId;
    }
    if (targetUserId === userId) targetUserId = null;
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.marketplaceTrustCase.create({ data: { reporterId: userId, targetUserId, parentCaseId: dto.type === 'APPEAL' ? dto.appealOfCaseId : null, listingId: dto.listingId || null, orderId: dto.orderId || null, type: dto.type || 'REPORT', category: dto.category, description: dto.description.trim(), evidenceUrls: (dto.evidenceUrls || []).slice(0, 10), status: 'OPEN' } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE_TRUST_CASE', resourceType: 'marketplaceTrustCase', resourceId: item.id, description: dto.type === 'DISPUTE' ? 'Marketplace order dispute submitted for review' : 'Marketplace trust report or appeal submitted', metadata: { type: dto.type || 'REPORT', category: item.category, orderId: item.orderId, listingId: item.listingId, targetUserId } });
      return item;
    });
  }

  async listTrustCases(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return this.prisma.marketplaceTrustCase.findMany({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } }, include: { reporter: { select: { id: true, name: true } }, target: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } });
    const [reported, decidedAgainstUser] = await Promise.all([
      this.prisma.marketplaceTrustCase.findMany({ where: { reporterId: userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.marketplaceTrustCase.findMany({ where: { targetUserId: userId, status: { in: ['RESOLVED', 'DISMISSED'] } }, select: { id: true, caseNumber: true, parentCaseId: true, type: true, category: true, status: true, resolvedAt: true, createdAt: true, updatedAt: true } }),
    ]);
    const visible = new Set(reported.map((item: any) => item.id));
    return [...reported, ...decidedAgainstUser.filter((item: any) => !visible.has(item.id)).map((item: any) => ({ ...item, reporterId: undefined, targetUserId: userId, description: 'A Marketplace case concerning your account has been decided. You may appeal this decision.', evidenceUrls: [] }))].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async resolveTrustCase(actorId: string, role: UserRole, caseId: string, dto: ResolveTrustCaseDto) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Trust case decisions require Admin, Super Admin, or God Mode authority.');
    const existing = await this.prisma.marketplaceTrustCase.findUnique({ where: { id: caseId } });
    if (!existing) throw new NotFoundException('Marketplace trust case not found.');
    if (existing.type === 'APPEAL' && existing.parentCaseId) { const parent = await this.prisma.marketplaceTrustCase.findUnique({ where: { id: existing.parentCaseId }, select: { resolvedById: true } }); if (parent?.resolvedById === actorId) throw new UnauthorizedException('An appeal must be decided by someone other than the original decision-maker.'); }
    if (dto.status === 'RESOLVED' && dto.restrictionUserId && dto.restrictionUserId !== existing.targetUserId) throw new BadRequestException('Restrictions must apply to the case target.');
    if (dto.status === 'RESOLVED' && dto.restrictionUserId && !dto.restrictionScope) throw new BadRequestException('Choose a restriction scope.');
    if (dto.status === 'RESOLVED' && dto.restrictionUserId && dto.restrictionDays !== undefined && (!Number.isInteger(dto.restrictionDays) || dto.restrictionDays < 1 || dto.restrictionDays > 365)) throw new BadRequestException('Temporary Marketplace restrictions must be between 1 and 365 days.');
    if (dto.status === 'RESOLVED' && dto.restrictionUserId && dto.restrictionDays === undefined && dto.restrictionScope !== 'MARKETPLACE_ALL') throw new BadRequestException('Only a Marketplace-wide blacklist may be permanent; choose 1 to 365 days for other restrictions.');
    if (dto.restrictionScope === 'CAUTION' && !dto.cautionRating) throw new BadRequestException('A caution rating from 1 to 5 is required.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceTrustCase.update({ where: { id: caseId }, data: { status: dto.status, resolution: dto.resolution.trim(), assignedToId: actorId, ...(dto.status === 'RESOLVED' || dto.status === 'DISMISSED' ? { resolvedById: actorId, resolvedAt: new Date() } : {}) } });
      let restriction: any = null;
      if (dto.status === 'RESOLVED' && dto.restrictionUserId && dto.restrictionScope) {
        const scope = dto.restrictionScope;
        restriction = await tx.marketplaceRestriction.create({ data: { userId: dto.restrictionUserId, scope, status: 'ACTIVE', reason: dto.resolution.trim(), evidence: { caseId, evidenceUrls: existing.evidenceUrls }, cautionRating: scope === 'CAUTION' ? dto.cautionRating : null, createdById: actorId, sourceCaseId: caseId, ...(dto.restrictionDays ? { expiresAt: new Date(Date.now() + dto.restrictionDays * 86400000) } : {}) } });
      }
      await this.audit.createInTransaction(tx, { actorId, action: 'RESOLVE_TRUST_CASE', resourceType: 'marketplaceTrustCase', resourceId: caseId, description: 'Marketplace trust case decision recorded', metadata: { previousStatus: existing.status, status: dto.status, restrictionId: restriction?.id || null, restrictionScope: restriction?.scope || null, restrictionDays: dto.restrictionDays || null } });
      return { case: updated, restriction };
    });
  }

  async listRestrictions(role: UserRole) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Marketplace restriction review requires Admin, Super Admin, or God Mode authority.');
    const now = new Date();
    return this.prisma.marketplaceRestriction.findMany({ where: { status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async revokeRestriction(actorId: string, role: UserRole, restrictionId: string, reason: string) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Marketplace restriction changes require Admin, Super Admin, or God Mode authority.');
    if (!reason?.trim()) throw new BadRequestException('A reason is required to revoke a restriction.');
    const existing = await this.prisma.marketplaceRestriction.findUnique({ where: { id: restrictionId } });
    if (!existing || existing.status !== 'ACTIVE') throw new NotFoundException('Active Marketplace restriction not found.');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.marketplaceRestriction.update({ where: { id: restrictionId }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actorId, reason: existing.reason + '\nRevocation: ' + reason.trim() } });
      await this.audit.createInTransaction(tx, { actorId, action: 'REVOKE_MARKETPLACE_RESTRICTION', resourceType: 'marketplaceRestriction', resourceId: restrictionId, description: 'Marketplace caution/restriction revoked', metadata: { previousStatus: existing.status, scope: existing.scope, reason: reason.trim() } });
      return item;
    });
  }

  async getSellerProfile(userId:string) {
    const profile=await this.prisma.marketplaceSellerProfile.findUnique({where:{userId},include:{user:{select:{id:true,name:true,isVerified:true,userType:true,deletedAt:true}}}});
    if(!profile){const user=await this.prisma.user.findUnique({where:{id:userId},select:{id:true,name:true,isVerified:true,userType:true,deletedAt:true}});if(!user||user.deletedAt)throw new NotFoundException('Marketplace seller not found.');const {deletedAt,...publicUser}=user;return {user:publicUser,profile:null,publicPhone:null};}
    if(!profile.user||profile.user.deletedAt)throw new NotFoundException('Marketplace seller not found.');const {deletedAt,...publicUser}=profile.user;return {user:publicUser,profile:{...profile,publicPhone:profile.showPhone?profile.publicPhone:null},publicPhone:profile.showPhone?profile.publicPhone:null};
  }
  async updateSellerProfile(userId:string,role:UserRole,dto:UpdateSellerProfileDto){
    await this.authorization.assertCan({user:{userId,role},module:'marketplace',resource:'marketplaceSellerProfile',action:AuthorizationAction.UPDATE,ownerId:userId});
    const data:any={};
    for(const key of ['displayName','bio','regionLabel','contactPreference','publicPhone','showPhone'] as const) if(dto[key]!==undefined) data[key]=typeof dto[key]==='string'?dto[key]!.trim():dto[key];
    for(const [field,value] of Object.entries(data)) { const validation=this.registry.validateResourceField('marketplaceSellerProfile',field,value); if(!validation.valid) throw new BadRequestException('Invalid seller profile field: '+field); data[field]=validation.value; }
    if(data.showPhone===true&&!data.publicPhone){const current=await this.prisma.marketplaceSellerProfile.findUnique({where:{userId}});if(!current?.publicPhone&&!dto.publicPhone)throw new BadRequestException('Add a public contact phone before enabling phone visibility.');}
    return this.prisma.$transaction(async(tx)=>{
      const profile=await tx.marketplaceSellerProfile.upsert({where:{userId},create:{userId,...data},update:data});
      await this.audit.createInTransaction(tx,{actorId:userId,action:'UPDATE_MARKETPLACE_SELLER_PROFILE',resourceType:'marketplaceSellerProfile',resourceId:profile.id,description:'Marketplace seller profile updated',metadata:{showPhone:profile.showPhone,contactPreference:profile.contactPreference,regionLabel:profile.regionLabel}});
      return {...profile,publicPhone:profile.showPhone?profile.publicPhone:null};
    });
  }
  async listFavorites(userId:string){
    await this.assertFeatureEnabled('marketplace.favorites');
    return this.prisma.marketplaceFavorite.findMany({where:{userId,status:'ACTIVE',listing:{status:'PUBLISHED',deletedAt:null}},include:{listing:{include:{seller:{select:{id:true,name:true,isVerified:true,userType:true}}}}},orderBy:{updatedAt:'desc'},take:200});
  }
  async addFavorite(userId:string,role:UserRole,listingId:string){
    await this.assertFeatureEnabled('marketplace.favorites');
    const listing=await this.prisma.marketplaceListing.findFirst({where:{id:listingId,status:'PUBLISHED',deletedAt:null},select:{id:true,sellerId:true}});
    if(!listing)throw new NotFoundException('Published Marketplace listing not found.');
    if(listing.sellerId===userId)throw new BadRequestException('You cannot save your own listing.');
    await this.authorization.assertCan({user:{userId,role},module:'marketplace',resource:'marketplaceFavorite',action:AuthorizationAction.CREATE,ownerId:userId});
    return this.prisma.$transaction(async(tx)=>{
      const item=await tx.marketplaceFavorite.upsert({where:{userId_listingId:{userId,listingId}},create:{userId,listingId,status:'ACTIVE'},update:{status:'ACTIVE'}});
      await this.audit.createInTransaction(tx,{actorId:userId,action:'SAVE_MARKETPLACE_FAVORITE',resourceType:'marketplaceFavorite',resourceId:item.id,description:'Marketplace listing saved to private favorites',metadata:{listingId}});
      return item;
    });
  }
  async removeFavorite(userId:string,listingId:string){
    await this.assertFeatureEnabled('marketplace.favorites');
    const item=await this.prisma.marketplaceFavorite.findUnique({where:{userId_listingId:{userId,listingId}}});
    if(!item||item.status!=='ACTIVE')return {removed:false};
    return this.prisma.$transaction(async(tx)=>{
      const saved=await tx.marketplaceFavorite.update({where:{id:item.id},data:{status:'REMOVED'}});
      await this.audit.createInTransaction(tx,{actorId:userId,action:'REMOVE_MARKETPLACE_FAVORITE',resourceType:'marketplaceFavorite',resourceId:item.id,description:'Marketplace favorite removed without deleting history',metadata:{listingId}});
      return {removed:true,favorite:saved};
    });
  }
  async listMessages(userId:string){
    await this.assertFeatureEnabled('marketplace.messaging');
    return this.prisma.marketplaceMessage.findMany({where:{OR:[{senderId:userId},{recipientId:userId}]},include:{sender:{select:{id:true,name:true}},recipient:{select:{id:true,name:true}},listing:{select:{id:true,title:true}},order:{select:{id:true,status:true}}},orderBy:{createdAt:'desc'},take:200});
  }
  async sendMessage(userId:string,role:UserRole,dto:SendMarketplaceMessageDto){
    await this.assertFeatureEnabled('marketplace.messaging');
    const body=dto.body?.trim();
    if(!body||body.length>4000)throw new BadRequestException('Message must contain 1 to 4000 characters.');
    const bodyValidation=this.registry.validateResourceField('marketplaceMessage','body',body); if(!bodyValidation.valid)throw new BadRequestException('Message body failed Registry validation.');
    if(dto.recipientId===userId)throw new BadRequestException('You cannot message yourself.');
    if(!dto.listingId&&!dto.orderId)throw new BadRequestException('Link a message to a listing or order.');
    let listing:any=null,order:any=null;
    if(dto.orderId){order=await this.prisma.marketplaceOrder.findUnique({where:{id:dto.orderId}});if(!order||(order.buyerId!==userId&&order.sellerId!==userId))throw new NotFoundException('Marketplace order not found.');const other=order.buyerId===userId?order.sellerId:order.buyerId;if(dto.recipientId!==other)throw new BadRequestException('Order messages must go to the other transaction participant.');if(dto.listingId&&dto.listingId!==order.listingId)throw new BadRequestException('Listing does not match this order.');}
    if(dto.listingId){listing=await this.prisma.marketplaceListing.findFirst({where:{id:dto.listingId,deletedAt:null},select:{id:true,sellerId:true,status:true}});if(!listing)throw new NotFoundException('Marketplace listing not found.');if(!order){if(userId!==listing.sellerId){if(dto.recipientId!==listing.sellerId||listing.status!=='PUBLISHED')throw new BadRequestException('Listing inquiries must be sent to the published listing seller.');}else{const prior=await this.prisma.marketplaceMessage.findFirst({where:{listingId:listing.id,senderId:dto.recipientId,recipientId:userId}});if(!prior)throw new UnauthorizedException('A seller can reply only to an existing buyer inquiry for this listing.');}}}
    await this.authorization.assertCan({user:{userId,role},module:'marketplace',resource:'marketplaceMessage',action:AuthorizationAction.CREATE,ownerId:userId});
    return this.prisma.$transaction(async(tx)=>{
      const message=await tx.marketplaceMessage.create({data:{senderId:userId,recipientId:dto.recipientId,listingId:dto.listingId||null,orderId:dto.orderId||null,body}});
      await this.audit.createInTransaction(tx,{actorId:userId,action:'SEND_MARKETPLACE_MESSAGE',resourceType:'marketplaceMessage',resourceId:message.id,description:'Participant-scoped Marketplace message sent',metadata:{listingId:message.listingId,orderId:message.orderId,recipientId:message.recipientId}});
      return message;
    });
  }
  async markMessageRead(userId:string,messageId:string){
    await this.assertFeatureEnabled('marketplace.messaging');
    const message=await this.prisma.marketplaceMessage.findUnique({where:{id:messageId}});
    if(!message||message.recipientId!==userId)throw new NotFoundException('Marketplace message not found.');
    if(message.readAt)return message;
    return this.prisma.$transaction(async(tx)=>{
      const updated=await tx.marketplaceMessage.update({where:{id:messageId},data:{readAt:new Date()}});
      await this.audit.createInTransaction(tx,{actorId:userId,action:'READ_MARKETPLACE_MESSAGE',resourceType:'marketplaceMessage',resourceId:messageId,description:'Marketplace message marked read',metadata:{senderId:message.senderId}});
      return updated;
    });
  }
  async createRFQ(userId:string,role:UserRole,dto:CreateMarketplaceRfqDto){
    await this.assertFeatureEnabled('marketplace.rfq');
    if(!dto.title?.trim()||!dto.description?.trim()||!dto.unit?.trim()||!Number.isFinite(dto.quantity)||dto.quantity<=0)throw new BadRequestException('RFQ title, description, unit and positive quantity are required.');
    for(const [field,value] of Object.entries({title:dto.title.trim(),category:dto.category,description:dto.description.trim(),quantity:dto.quantity,unit:dto.unit.trim(),deliveryRegion:dto.deliveryRegion||'',targetUnitPrice:dto.targetUnitPrice,currency:(dto.currency||'INR').toUpperCase(),neededBy:dto.neededBy||''})){if(value===undefined)continue;const validation=this.registry.validateResourceField('marketplaceRFQ',field,value);if(!validation.valid)throw new BadRequestException('Invalid Marketplace RFQ field: '+field);}
    if(!this.getCategories().includes(dto.category))throw new BadRequestException('Choose a Marketplace Registry category.');
    const neededBy=dto.neededBy?new Date(dto.neededBy):null;if(neededBy&&(!Number.isFinite(neededBy.getTime())||neededBy<=new Date()))throw new BadRequestException('Needed-by date must be in the future.');
    await this.authorization.assertCan({user:{userId,role},module:'marketplace',resource:'marketplaceRFQ',action:AuthorizationAction.CREATE,ownerId:userId});
    return this.prisma.$transaction(async(tx)=>{
      const rfq=await tx.marketplaceRFQ.create({data:{buyerId:userId,title:dto.title.trim(),category:dto.category,description:dto.description.trim(),quantity:dto.quantity,unit:dto.unit.trim(),targetUnitPrice:dto.targetUnitPrice===undefined?null:new Prisma.Decimal(dto.targetUnitPrice.toFixed(2)),currency:(dto.currency||'INR').toUpperCase(),deliveryRegion:dto.deliveryRegion?.trim()||null,neededBy,status:'OPEN'}});
      await this.audit.createInTransaction(tx,{actorId:userId,action:'CREATE_MARKETPLACE_RFQ',resourceType:'marketplaceRFQ',resourceId:rfq.id,description:'Bulk buyer request for quotation created',metadata:{category:rfq.category,quantity:rfq.quantity,unit:rfq.unit,currency:rfq.currency}});
      return rfq;
    });
  }
  async listOpenRFQs(){
    await this.assertFeatureEnabled('marketplace.rfq');
    return this.prisma.marketplaceRFQ.findMany({where:{status:'OPEN'},include:{buyer:{select:{id:true,name:true,isVerified:true}},_count:{select:{responses:true}}},orderBy:{createdAt:'desc'},take:100});
  }
  async listMyRFQs(userId:string){
    await this.assertFeatureEnabled('marketplace.rfq');
    const rfqs=await this.prisma.marketplaceRFQ.findMany({where:{OR:[{buyerId:userId},{responses:{some:{sellerId:userId}}}]},include:{buyer:{select:{id:true,name:true}},responses:{include:{seller:{select:{id:true,name:true}}},orderBy:{createdAt:'desc'}}},orderBy:{updatedAt:'desc'},take:200});
    return rfqs.map((rfq:any)=>rfq.buyerId===userId?rfq:{...rfq,responses:rfq.responses.filter((r:any)=>r.sellerId===userId)});
  }
  async respondToRFQ(userId:string,role:UserRole,rfqId:string,dto:RespondMarketplaceRfqDto){
    await this.assertFeatureEnabled('marketplace.rfq');
    const rfq=await this.prisma.marketplaceRFQ.findUnique({where:{id:rfqId}});
    if(!rfq||rfq.status!=='OPEN')throw new NotFoundException('Open Marketplace RFQ not found.');
    if(rfq.buyerId===userId)throw new BadRequestException('The RFQ owner cannot respond as a seller.');
    if(!Number.isFinite(dto.unitPrice)||dto.unitPrice<0||!Number.isFinite(dto.availableQuantity)||dto.availableQuantity<=0)throw new BadRequestException('Enter a non-negative unit price and positive available quantity.');
    for(const [field,value] of Object.entries({unitPrice:dto.unitPrice,availableQuantity:dto.availableQuantity,note:dto.note||''})){const validation=this.registry.validateResourceField('marketplaceRFQResponse',field,value);if(!validation.valid)throw new BadRequestException('Invalid RFQ quotation field: '+field);}
    const validUntil=dto.validUntil?new Date(dto.validUntil):null;if(validUntil&&(!Number.isFinite(validUntil.getTime())||validUntil<=new Date()))throw new BadRequestException('Quotation expiry must be in the future.');
    await this.authorization.assertCan({user:{userId,role},module:'marketplace',resource:'marketplaceRFQResponse',action:AuthorizationAction.CREATE,ownerId:userId});
    return this.prisma.$transaction(async(tx)=>{
      const response=await tx.marketplaceRFQResponse.upsert({where:{rfqId_sellerId:{rfqId,sellerId:userId}},create:{rfqId,sellerId:userId,unitPrice:new Prisma.Decimal(dto.unitPrice.toFixed(2)),availableQuantity:dto.availableQuantity,note:dto.note?.trim()||null,validUntil,status:'SUBMITTED'},update:{unitPrice:new Prisma.Decimal(dto.unitPrice.toFixed(2)),availableQuantity:dto.availableQuantity,note:dto.note?.trim()||null,validUntil,status:'SUBMITTED'}});
      await this.audit.createInTransaction(tx,{actorId:userId,action:'RESPOND_MARKETPLACE_RFQ',resourceType:'marketplaceRFQResponse',resourceId:response.id,description:'Seller quotation submitted for bulk RFQ',metadata:{rfqId,unitPrice:dto.unitPrice,availableQuantity:dto.availableQuantity,validUntil}});
      return response;
    });
  }
  async decideRFQResponse(userId:string,role:UserRole,rfqId:string,responseId:string,dto:DecideMarketplaceRfqResponseDto){
    await this.assertFeatureEnabled('marketplace.rfq');
    if(!dto.reason?.trim())throw new BadRequestException('A decision reason is required.');
    const response=await this.prisma.marketplaceRFQResponse.findUnique({where:{id:responseId},include:{rfq:true}});
    if(!response||response.rfqId!==rfqId||response.rfq.buyerId!==userId)throw new NotFoundException('RFQ quotation not found.');
    if(response.rfq.status!=='OPEN'||response.status!=='SUBMITTED')throw new BadRequestException('Only a submitted quotation on an open RFQ can be decided.');
    if(response.validUntil&&new Date(response.validUntil)<=new Date())throw new BadRequestException('The seller quotation has expired and cannot be accepted or rejected as current.');
    return this.prisma.$transaction(async(tx)=>{
      const saved=await tx.marketplaceRFQResponse.update({where:{id:responseId},data:{status:dto.status}});
      if(dto.status==='ACCEPTED'){await tx.marketplaceRFQ.update({where:{id:rfqId},data:{status:'AWARDED'}});await tx.marketplaceRFQResponse.updateMany({where:{rfqId,id:{not:responseId},status:'SUBMITTED'},data:{status:'REJECTED'}});}
      await this.audit.createInTransaction(tx,{actorId:userId,action:'DECIDE_MARKETPLACE_RFQ_RESPONSE',resourceType:'marketplaceRFQResponse',resourceId:responseId,description:'Buyer recorded RFQ quotation decision',metadata:{rfqId,status:dto.status,reason:dto.reason.trim()}});
      return {response:saved,rfqStatus:dto.status==='ACCEPTED'?'AWARDED':'OPEN',notice:'RFQ award records a negotiated quotation only; it does not create an order or move money.'};
    });
  }
  async cancelRFQ(userId:string,rfqId:string,reason:string){
    await this.assertFeatureEnabled('marketplace.rfq');
    const rfq=await this.prisma.marketplaceRFQ.findUnique({where:{id:rfqId}});
    if(!rfq||rfq.buyerId!==userId)throw new NotFoundException('Marketplace RFQ not found.');
    if(rfq.status!=='OPEN')throw new BadRequestException('Only an open RFQ can be cancelled.');
    if(!reason?.trim())throw new BadRequestException('A cancellation reason is required.');
    return this.prisma.$transaction(async(tx)=>{
      const saved=await tx.marketplaceRFQ.update({where:{id:rfqId},data:{status:'CANCELLED'}});
      await this.audit.createInTransaction(tx,{actorId:userId,action:'CANCEL_MARKETPLACE_RFQ',resourceType:'marketplaceRFQ',resourceId:rfqId,description:'Buyer cancelled bulk RFQ',metadata:{reason:reason.trim()}});
      return saved;
    });
  }

  async getSellerSettlementStatement(userId: string, role: UserRole) {
    await this.assertFeatureEnabled('marketplace.history');
    const [orders, holds] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({ where: { sellerId: userId }, include: { listing: { select: { title: true, category: true } }, payments: true, refunds: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
      this.prisma.marketplacePayoutHold.findMany({ where: { sellerId: userId, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: 'desc' } }),
    ]);
    const lines = orders.map((o: any) => {
      const captured = (o.payments || []).filter((p: any) => p.status === 'CAPTURED').reduce((n: number,p: any) => n + Number(p.amount), 0);
      const refunded = (o.refunds || []).filter((r: any) => r.status === 'SUCCEEDED').reduce((n: number,r: any) => n + Number(r.amount), 0);
      const hold = holds.filter((h: any) => h.orderId === o.id).reduce((n: number,h: any) => n + Number(h.amount), 0);
      return { orderId:o.id, listingTitle:o.listing?.title || 'Marketplace order', category:o.listing?.category || 'OTHER', status:o.status, createdAt:o.createdAt, completedAt:o.completedAt, currency:o.currency || 'INR', gross:Number(o.subtotal ?? o.buyerTotal ?? 0).toFixed(2), commission:Number(o.sellerCommissionAmount ?? 0).toFixed(2), sellerNetEstimate:Number(o.sellerNet ?? 0).toFixed(2), capturedSimulation:captured.toFixed(2), refundedSimulation:refunded.toFixed(2), activeHold:hold.toFixed(2), settlementStatus:'NOT_PAID_OUT' };
    });
    const total=(key:string)=>lines.reduce((n:number,l:any)=>n+Number(l[key] || 0),0).toFixed(2);
    return { mode:'STATEMENT_ONLY', moneyMovementEnabled:false, currency:'INR', generatedAt:new Date().toISOString(), lineCount:lines.length, totals:{gross:total('gross'),commission:total('commission'),sellerNetEstimate:total('sellerNetEstimate'),capturedSimulation:total('capturedSimulation'),refundedSimulation:total('refundedSimulation'),activePayoutHolds:total('activeHold')},lines,activeHolds:holds,notice:'Operational statement only. Simulated captures/refunds are not real funds; no payout is enabled.' };
  }

  async createPayoutHold(actorId:string, role:UserRole, orderId:string, reason:string, expiresAt?:string) {
    if (role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Payout holds require Super Admin or God Mode authority.');
    if (!reason?.trim() || reason.trim().length < 5 || reason.length > 1000) throw new BadRequestException('Provide a clear payout-hold reason.');
    const order=await this.prisma.marketplaceOrder.findUnique({where:{id:orderId},include:{payments:true}});
    if (!order) throw new NotFoundException('Marketplace order not found.');
    const captured=(order.payments || []).filter((p:any)=>p.status==='CAPTURED').reduce((n:number,p:any)=>n+Number(p.amount),0);
    if (captured<=0) throw new BadRequestException('A hold requires a captured payment record.');
    let expiry:Date|null=null;
    if(expiresAt){expiry=new Date(expiresAt);if(!Number.isFinite(expiry.getTime())||expiry<=new Date()||expiry.getTime()>Date.now()+365*86400000) throw new BadRequestException('Hold expiry must be within the next 365 days.');}
    const existingHolds=await this.prisma.marketplacePayoutHold.findMany({where:{orderId,status:'ACTIVE',OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}});
    const alreadyHeld=(existingHolds||[]).reduce((n:number,h:any)=>n+Number(h.amount),0);
    const available=Math.max(0,Math.min(captured,Number(order.sellerNet ?? order.buyerTotal ?? captured))-alreadyHeld);
    if(available<=0) throw new BadRequestException('The available seller net amount is already covered by active payout holds.');
    return this.prisma.$transaction(async(tx)=>{
      const amount=available;
      const hold=await tx.marketplacePayoutHold.create({data:{sellerId:order.sellerId,orderId,amount:new Prisma.Decimal(amount.toFixed(2)),currency:order.currency||'INR',reason:reason.trim(),expiresAt:expiry,createdById:actorId}});
      await this.audit.createInTransaction(tx,{actorId,action:'CREATE_MARKETPLACE_PAYOUT_HOLD',resourceType:'marketplacePayoutHold',resourceId:hold.id,description:'Payout hold recorded; no money movement enabled',metadata:{orderId,sellerId:order.sellerId,amount:amount.toFixed(2),reason:reason.trim(),expiresAt:expiry}});
      return {...hold,moneyMovementEnabled:false};
    });
  }
  async releasePayoutHold(actorId:string,role:UserRole,id:string,reason:string){
    if(role!==UserRole.SUPER_ADMIN) throw new UnauthorizedException('Releasing payout holds requires Super Admin or God Mode authority.');
    if(!reason?.trim()||reason.trim().length<5) throw new BadRequestException('A release reason is required.');
    const existing=await this.prisma.marketplacePayoutHold.findUnique({where:{id}});
    if(!existing||existing.status!=='ACTIVE') throw new NotFoundException('Active payout hold not found.');
    return this.prisma.$transaction(async(tx)=>{
      const hold=await tx.marketplacePayoutHold.update({where:{id},data:{status:'RELEASED',releasedById:actorId,releasedAt:new Date(),releaseReason:reason.trim()}});
      await this.audit.createInTransaction(tx,{actorId,action:'RELEASE_MARKETPLACE_PAYOUT_HOLD',resourceType:'marketplacePayoutHold',resourceId:id,description:'Payout hold released in governance ledger; no payout initiated',metadata:{orderId:existing.orderId,reason:reason.trim()}});
      return {...hold,moneyMovementEnabled:false};
    });
  }
  async listPayoutHolds(role:UserRole){
    if(role!==UserRole.ADMIN&&role!==UserRole.SUPER_ADMIN) throw new UnauthorizedException('Payout hold review requires Admin or Super Admin authority.');
    return this.prisma.marketplacePayoutHold.findMany({where:{status:'ACTIVE',OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},orderBy:{createdAt:'desc'},take:500});
  }
  async runMarketplaceReconciliation(actorId:string,role:UserRole){
    if(role!==UserRole.SUPER_ADMIN) throw new UnauthorizedException('Reconciliation requires Super Admin or God Mode authority.');
    const [entries,payments,refunds]=await Promise.all([
      this.prisma.marketplaceLedgerEntry.findMany({orderBy:{createdAt:'asc'},take:10000}),
      this.prisma.marketplacePayment.findMany({include:{ledgerEntries:true},take:5000}),
      this.prisma.marketplaceRefund.findMany({include:{ledgerEntries:true},take:5000}),
    ]);
    const exceptions:Array<Record<string,unknown>>=[];
    const byCurrency=new Map<string,{debit:number;credit:number;count:number}>();
    for(const e of entries as any[]){const c=e.currency||'INR',v=byCurrency.get(c)||{debit:0,credit:0,count:0},a=Math.round(Number(e.amount)*100);if(!Number.isFinite(a)||a<0)exceptions.push({type:'INVALID_LEDGER_AMOUNT',entryId:e.id});if(e.direction==='DEBIT')v.debit+=a;else if(e.direction==='CREDIT')v.credit+=a;else exceptions.push({type:'INVALID_LEDGER_DIRECTION',entryId:e.id});v.count++;byCurrency.set(c,v);}
    for(const p of payments as any[])if(p.status==='CAPTURED'&&(p.ledgerEntries||[]).filter((e:any)=>e.entryType==='SANDBOX_PAYMENT_CAPTURE').length<2)exceptions.push({type:'CAPTURE_MISSING_LEDGER_PAIR',paymentId:p.id,orderId:p.orderId});
    for(const r of refunds as any[])if(r.status==='SUCCEEDED'&&(r.ledgerEntries||[]).filter((e:any)=>e.entryType==='SANDBOX_REFUND').length<2)exceptions.push({type:'REFUND_MISSING_LEDGER_PAIR',refundId:r.id,orderId:r.orderId});
    const currencyTotals=[...byCurrency.entries()].map(([currency,v])=>({currency,debit:(v.debit/100).toFixed(2),credit:(v.credit/100).toFixed(2),entryCount:v.count,balanced:v.debit===v.credit}));
    for(const t of currencyTotals)if(!t.balanced)exceptions.push({type:'UNBALANCED_CURRENCY',...t});
    const debit=[...byCurrency.values()].reduce((n,v)=>n+v.debit,0),credit=[...byCurrency.values()].reduce((n,v)=>n+v.credit,0),balanced=exceptions.length===0&&currencyTotals.every(t=>t.balanced);
    return this.prisma.$transaction(async(tx)=>{
      const summary={currencyTotals,exceptions,paymentCount:payments.length,refundCount:refunds.length,ledgerEntryCount:entries.length,simulationOnly:true};
      const run=await tx.marketplaceReconciliationRun.create({data:{createdById:actorId,status:balanced?'BALANCED':'EXCEPTIONS_FOUND',currency:currencyTotals.length===1?currencyTotals[0].currency:'MULTI',debitTotal:new Prisma.Decimal((debit/100).toFixed(2)),creditTotal:new Prisma.Decimal((credit/100).toFixed(2)),balanced,exceptionCount:exceptions.length,summary: summary as Prisma.InputJsonValue}});
      await this.audit.createInTransaction(tx,{actorId,action:'RUN_MARKETPLACE_RECONCILIATION',resourceType:'marketplaceReconciliationRun',resourceId:run.id,description:'Ledger reconciliation report generated; no money movement',metadata:{balanced,exceptionCount:exceptions.length,ledgerEntryCount:entries.length}});
      return {...run,summary,moneyMovementEnabled:false};
    });
  }
  async getMarketplaceReconciliationRuns(role:UserRole){
    if(role!==UserRole.ADMIN&&role!==UserRole.SUPER_ADMIN) throw new UnauthorizedException('Reconciliation history requires Admin or Super Admin authority.');
    return this.prisma.marketplaceReconciliationRun.findMany({orderBy:{completedAt:'desc'},take:50});
  }

  async getCommerceHistory(userId: string, role: UserRole) {
    if (!(await this.isFeatureEnabled('marketplace.history'))) return { enabled: false, purchases: null, sales: null, notice: 'Marketplace history display is currently disabled by platform policy; records are retained.' };
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.READ, ownerId: userId });
    const [purchases, sales] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({ where: { buyerId: userId }, include: { listing: { select: { id: true, title: true, category: true } }, seller: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.marketplaceOrder.findMany({ where: { sellerId: userId }, include: { listing: { select: { id: true, title: true, category: true } }, buyer: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    const sum = (rows: any[], field: string) => rows.filter((x) => x.status === 'COMPLETED').reduce((total, x) => total + Number(x[field] ?? 0), 0).toFixed(2);
    return { enabled: true, purchases: { count: purchases.length, completedCount: purchases.filter((x) => x.status === 'COMPLETED').length, completedBuyerTotal: sum(purchases, 'buyerTotal'), orders: purchases }, sales: { count: sales.length, completedCount: sales.filter((x) => x.status === 'COMPLETED').length, completedGross: sum(sales, 'subtotal'), completedSellerNetEstimate: sum(sales, 'sellerNet'), orders: sales }, notice: 'Historical totals reflect saved deal quotes; seller net is an estimate until payment, fees, taxes and settlement are integrated and reconciled.' };
  }

  private async resourceOwner(resourceType: string, resourceId: string) {
    if (!RESOURCE_TYPES.includes(resourceType as typeof RESOURCE_TYPES[number])) throw new BadRequestException('Unsupported marketplace resource.');
    if (resourceType === 'inventoryItem') {
      const item = await this.prisma.inventoryItem.findFirst({ where: { id: resourceId, deletedAt: null }, select: { farm: { select: { ownerId: true } } } });
      return item?.farm.ownerId;
    }
    const relationship = await this.prisma.resourceRelationship.findFirst({ where: { resourceType, resourceId, relationshipType: 'OWNER', endedAt: null }, select: { userId: true } });
    if (relationship) return relationship.userId;
    if (resourceType === 'farmAsset') {
      const r = await this.prisma.farmAsset.findUnique({ where: { id: resourceId }, select: { farm: { select: { ownerId: true } } } });
      return r?.farm.ownerId;
    }
    if (resourceType === 'crop') {
      const r = await this.prisma.crop.findUnique({ where: { id: resourceId }, select: { farm: { select: { ownerId: true } } } });
      return r?.farm.ownerId;
    }
    const r = await this.prisma.livestock.findUnique({ where: { id: resourceId }, select: { farm: { select: { ownerId: true } } } });
    return r?.farm.ownerId;
  }

  private async assertListing(userId: string, role: UserRole, id: string, action: AuthorizationAction) {
    const listing = await this.prisma.marketplaceListing.findFirst({ where: { id, deletedAt: null }, select: { id: true, sellerId: true } });
    if (!listing) throw new NotFoundException('Marketplace listing not found.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceListing', action, resourceId: id, ownerId: listing.sellerId });
    return listing;
  }

  private validateFields(input: Record<string, unknown>): MarketplaceValidatedFields {
    const data: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(input)) {
      if (value === undefined) continue;
      const validation = this.registry.validateResourceField('marketplaceListing', field, value);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Invalid marketplace listing ' + field + '.',
          errors: validation.errors,
        });
      }
      data[field] = validation.value;
    }
    return data;
  }

  private validatePriceTiers(input?: Array<{ minQuantity: number; unitPrice: number }>) {
    if (input === undefined) return undefined;
    if (!Array.isArray(input) || input.length > 12) throw new BadRequestException('Provide at most 12 wholesale price tiers.');
    const tiers = input.map((tier) => {
      if (!tier || !Number.isFinite(tier.minQuantity) || !Number.isFinite(tier.unitPrice)) throw new BadRequestException('Each price tier needs a valid minimum quantity and unit price.');
      const min = this.registry.validateResourceField('marketplaceListing', 'priceTierMinQuantity', tier.minQuantity);
      const price = this.registry.validateResourceField('marketplaceListing', 'priceTierUnitPrice', tier.unitPrice);
      if (!min.valid || !price.valid) throw new BadRequestException({ message: 'Invalid Marketplace wholesale price tier.', errors: [...(min.errors || []), ...(price.errors || [])] });
      return { minQuantity: Number(min.value), unitPrice: Number(price.value) };
    }).sort((a, b) => a.minQuantity - b.minQuantity);
    for (let i=1; i<tiers.length; i++) if (tiers[i].minQuantity <= tiers[i-1].minQuantity) throw new BadRequestException('Wholesale tier minimum quantities must be unique and increasing.');
    return tiers;
  }

  private tierPrice(listing: { price?: number | null; priceTiers?: unknown }, quantity: number): number | undefined {
    if (!Array.isArray(listing.priceTiers)) return listing.price ?? undefined;
    const tiers = (listing.priceTiers as Array<{ minQuantity?: unknown; unitPrice?: unknown }>).filter(t => typeof t.minQuantity === 'number' && typeof t.unitPrice === 'number').sort((a,b) => Number(a.minQuantity)-Number(b.minQuantity));
    const matching = tiers.filter(t => quantity >= Number(t.minQuantity)).at(-1);
    return matching ? Number(matching.unitPrice) : listing.price ?? undefined;
  }

  async create(
    userId: string,
    role: UserRole,
    dto: CreateListingDto,
    transaction?: Prisma.TransactionClient,
  ) {
    await this.assertFeatureEnabled('marketplace.listings');
    await this.assertNotRestricted(userId, 'LISTING_CREATE');
    const validated = this.validateFields({
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      category: dto.category || 'OTHER',
      title: dto.title,
      description: dto.description,
      quantity: dto.quantity,
      minOrderQuantity: dto.minOrderQuantity,
      sellerJurisdictionCode: dto.sellerJurisdictionCode?.trim().toUpperCase(),
      unit: dto.unit,
      price: dto.price,
      currency: dto.currency,
    });
    if (dto.priceTiers?.length) await this.assertFeatureEnabled('marketplace.wholesale_pricing');
    const priceTiers = this.validatePriceTiers(dto.priceTiers);
    const imageUrls = (dto.imageUrls ?? []).map((url) => this.validateMediaUrl('marketplaceListingImageUrl', url, 'image'));
    const videoUrls = (dto.videoUrls ?? []).map((url) => this.validateMediaUrl('marketplaceListingVideoUrl', url, 'video'));
    const externalLinks = (dto.externalLinks ?? []).map((url) => this.validateMediaUrl('marketplaceListingExternalLink', url, 'external'));
    const linkedResource = Boolean(dto.resourceType || dto.resourceId);
    if (linkedResource && (!dto.resourceType || !dto.resourceId)) throw new BadRequestException('Choose both resource type and resource, or leave both empty for a generic listing.');
    const ownerId = linkedResource ? await this.resourceOwner(dto.resourceType!, dto.resourceId!) : userId;
    if (!ownerId) throw new NotFoundException('Marketplace resource not found.');
    if (linkedResource && dto.resourceType === 'farmAsset') {
      const asset = await this.prisma.farmAsset.findFirst({ where: { id: dto.resourceId }, select: { id: true } });
      if (!asset) throw new NotFoundException('Marketplace resource not found.');
    } else if (linkedResource && dto.resourceType === 'crop') {
      const crop = await this.prisma.crop.findFirst({ where: { id: dto.resourceId }, select: { id: true } });
      if (!crop) throw new NotFoundException('Marketplace resource not found.');
    } else if (linkedResource && dto.resourceType === 'inventoryItem') {
      const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.resourceId, deletedAt: null }, select: { id: true, quantityOnHand: true, farm: { select: { ownerId: true } } } });
      if (!item) throw new NotFoundException('Marketplace inventory item not found.');
      if (item.farm.ownerId !== userId) throw new NotFoundException('Marketplace resource not found.');
      if (dto.quantity !== undefined && dto.quantity > item.quantityOnHand) throw new BadRequestException('Listing quantity cannot exceed available inventory stock.');
    } else if (linkedResource) {
      const livestock = await this.prisma.livestock.findFirst({ where: { id: dto.resourceId }, select: { id: true } });
      if (!livestock) throw new NotFoundException('Marketplace resource not found.');
    }
    await this.authorization.assertCan({
      user: { userId, role },
      module: 'marketplace',
      resource: 'marketplaceListing',
      action: AuthorizationAction.CREATE,
      ownerId,
    });
    const createInTransaction = async (tx: Prisma.TransactionClient) => {
      const listing = await tx.marketplaceListing.create({ data: { sellerId: userId, resourceType: dto.resourceType || null, resourceId: dto.resourceId || null, category: String(validated.category || 'OTHER'), imageUrls, videoUrls, externalLinks, title: validated.title!, description: validated.description, quantity: validated.quantity, minOrderQuantity: validated.minOrderQuantity, sellerJurisdictionCode: validated.sellerJurisdictionCode || null, ...(priceTiers !== undefined ? { priceTiers: priceTiers as Prisma.InputJsonValue } : {}), unit: validated.unit, price: validated.price, currency: String(validated.currency || 'INR').toUpperCase() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE', resourceType: 'marketplaceListing', resourceId: listing.id, description: 'Marketplace listing created' });
      return listing;
    };
    return transaction ? createInTransaction(transaction) : this.prisma.$transaction(createInTransaction);
  }

  async saveMediaUpload(userId: string, role: UserRole, file: any, mediaType: 'image' | 'video') {
    const tempPath = String(file?.path || '');
    try {
    await this.assertFeatureEnabled('marketplace.media_uploads');
    await this.assertNotRestricted(userId, 'LISTING_CREATE');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceListing', action: AuthorizationAction.CREATE, ownerId: userId });
    if (!file?.path || !file?.size || !file?.mimetype) throw new BadRequestException('Select a media file to upload.');
    const storageDir = process.env.KK_MARKETPLACE_MEDIA_DIR || join(process.cwd(), 'uploads', 'marketplace');
    const fail = (message: string): never => { try { unlinkSync(tempPath); } catch {} throw new BadRequestException(message); };
    const fd = openSync(tempPath, 'r');
    const header = Buffer.alloc(16);
    let read = 0;
    try { read = readSync(fd, header, 0, header.length, 0); } finally { closeSync(fd); }
    const bytes = header.subarray(0, read);
    const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp = bytes.length >= 12 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
    const isFtyp = bytes.length >= 12 && bytes.toString('ascii',4,8) === 'ftyp';
    const isAvif = isFtyp && ['avif','avis'].includes(bytes.toString('ascii',8,12));
    const isMp4 = isFtyp && !isAvif;
    const isWebm = bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    let detected: string | null = null;
    if (isPng) detected = 'image/png';
    else if (isJpeg) detected = 'image/jpeg';
    else if (isWebp) detected = 'image/webp';
    else if (isAvif) detected = 'image/avif';
    else if (isMp4) detected = 'video/mp4';
    else if (isWebm) detected = 'video/webm';
    const allowed = mediaType === 'image' ? ['image/png','image/jpeg','image/webp','image/avif'] : ['video/mp4','video/webm'];
    if (!detected || !allowed.includes(detected) || (file.mimetype !== detected && !(file.mimetype === 'image/jpg' && detected === 'image/jpeg'))) return fail('The uploaded file content does not match a supported ' + mediaType + ' format.');
    const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'video/mp4': '.mp4', 'video/webm': '.webm' } as Record<string,string>)[detected];
    mkdirSync(storageDir, { recursive: true });
    const id = randomUUID();
    const finalPath = join(storageDir, id + ext);
    renameSync(tempPath, finalPath);
    const relativeUrl = '/uploads/marketplace/' + id + ext;
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.audit.createInTransaction(tx, { actorId: userId, action: 'UPLOAD_MARKETPLACE_MEDIA', resourceType: 'marketplaceMedia', resourceId: id, description: 'Marketplace media uploaded and content signature validated', metadata: { mediaType, mimeType: detected, sizeBytes: file.size, relativeUrl } });
      });
    } catch (error) {
      try { unlinkSync(finalPath); } catch {}
      throw error;
    }
    return { id, mediaType, mimeType: detected, sizeBytes: file.size, url: relativeUrl };
    } catch (error) {
      try { if (tempPath) unlinkSync(tempPath); } catch {}
      throw error;
    }
  }

  private validateMediaUrl(field: string, url: string, label: string): string {
    const result = this.registry.validateField(field, url);
    if (!result.valid) throw new BadRequestException({ message: 'Invalid marketplace ' + label + ' URL.', errors: result.errors });
    return String(result.value);
  }

  getCategories(): string[] {
    return [...(this.registry.getField('marketplaceListingCategory')?.validation?.enumValues ?? [])];
  }

  async findPublished(period?: string, category?: string) {
    if (!(await this.isFeatureEnabled('marketplace.listings'))) return [];
    const now = new Date();
    const activeMarketplaceWide = await this.prisma.marketplaceRestriction.findMany({ where: { scope: 'MARKETPLACE_ALL', status: 'ACTIVE', startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { userId: true } });
    const blockedSellerIds = activeMarketplaceWide.map((item: any) => item.userId);
    const where: Prisma.MarketplaceListingWhereInput = { status: 'PUBLISHED', deletedAt: null, publishedAt: { not: null } };
    if (blockedSellerIds.length) where.sellerId = { notIn: blockedSellerIds };
    if (category && category !== 'ALL') {
      const result = this.registry.validateResourceField('marketplaceListing', 'category', category);
      if (!result.valid) throw new BadRequestException({ message: 'Invalid marketplace category.', errors: result.errors });
      where.category = String(result.value);
    }
    if (period) {
      if (!LISTING_PERIODS.includes(period as typeof LISTING_PERIODS[number])) throw new BadRequestException('Unsupported marketplace period.');
      if (period !== 'active') {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const part = (type: string) => parts.find((x) => x.type === type)?.value || '';
        const today = new Date(part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00+05:30');
        let start = new Date(today); let end = new Date(today.getTime() + 86400000);
        if (period === 'yesterday') { start = new Date(today.getTime() - 86400000); end = new Date(today); }
        if (period === 'day-before-yesterday') { start = new Date(today.getTime() - 172800000); end = new Date(today.getTime() - 86400000); }
        if (period === 'week') { const weekday = new Date(part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00Z').getUTCDay(); const sinceMonday = (weekday + 6) % 7; start = new Date(today.getTime() - sinceMonday * 86400000); end = new Date(start.getTime() + 7 * 86400000); }
        where.publishedAt = { gte: start, lt: end };
      }
    }
    const listings = await this.prisma.marketplaceListing.findMany({ where, include: { seller: { select: { id: true, name: true, isVerified: true, userType: true, marketplaceSellerProfile: { select: { displayName: true, bio: true, regionLabel: true, contactPreference: true, publicPhone: true, showPhone: true } }, marketplaceRestrictions: { where: { scope: 'CAUTION', status: 'ACTIVE', startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { cautionRating: true, expiresAt: true }, orderBy: { createdAt: 'desc' }, take: 1 } } } }, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }] });
    return listings.map((listing: any) => {
      if (!listing.seller) return listing;
      const { marketplaceRestrictions, marketplaceSellerProfile, ...seller } = listing.seller;
      const caution = marketplaceRestrictions?.[0];
      const publicProfile = marketplaceSellerProfile ? { ...marketplaceSellerProfile, publicPhone: marketplaceSellerProfile.showPhone ? marketplaceSellerProfile.publicPhone : null } : null;
      return { ...listing, seller: { ...seller, displayName: publicProfile?.displayName || seller.name, profile: publicProfile, cautionRating: caution?.cautionRating ?? null, cautionExpiresAt: caution?.expiresAt ?? null } };
    });
  }

  async findMine(userId: string, role: UserRole) {
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceListing', action: AuthorizationAction.READ, ownerId: userId });
    return this.prisma.marketplaceListing.findMany({ where: { sellerId: userId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async listTaxProfiles(role: UserRole) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Tax profile review requires Admin, Super Admin, or God Mode authority.');
    return this.prisma.marketplaceTaxProfile.findMany({ orderBy: [{ status: 'asc' }, { effectiveFrom: 'desc' }] });
  }

  async createTaxProfile(userId: string, role: UserRole, dto: import('./dto/create-tax-profile.dto').CreateTaxProfileDto) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Tax profile drafts require Admin, Super Admin, or God Mode authority.');
    const sellerJurisdictionCode = dto.sellerJurisdictionCode.trim().toUpperCase();
    const buyerJurisdictionCode = dto.buyerJurisdictionCode.trim().toUpperCase();
    const checks = [
      ['sellerJurisdictionCode', sellerJurisdictionCode],
      ['buyerJurisdictionCode', buyerJurisdictionCode],
      ['category', dto.category],
      ['taxCode', dto.taxCode],
      ['taxName', dto.taxName],
      ['taxBase', dto.taxBase],
      ['basisPoints', Math.round(dto.taxPercent * 100)],
    ] as const;
    for (const [field, value] of checks) {
      const validation = this.registry.validateResourceField('marketplaceTaxProfile', field, value);
      if (!validation.valid) throw new BadRequestException({ message: 'Invalid Marketplace tax profile ' + field + '.', errors: validation.errors });
    }
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (!Number.isFinite(effectiveFrom.getTime()) || (effectiveTo && (!Number.isFinite(effectiveTo.getTime()) || effectiveTo <= effectiveFrom))) throw new BadRequestException('Tax profile effective end must be later than its effective start.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceTaxProfile', action: AuthorizationAction.CREATE, ownerId: userId });
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.marketplaceTaxProfile.create({ data: { sellerJurisdictionCode, buyerJurisdictionCode, category: String(dto.category), taxCode: String(dto.taxCode).trim().toUpperCase(), taxName: String(dto.taxName).trim(), taxBase: dto.taxBase, basisPoints: Math.round(dto.taxPercent * 100), effectiveFrom, effectiveTo, reviewReference: null, status: 'DRAFT', version: 1, createdById: userId } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE_MARKETPLACE_TAX_PROFILE', resourceType: 'marketplaceTaxProfile', resourceId: created.id, description: 'Marketplace tax profile created as draft pending qualified review', metadata: { sellerJurisdictionCode, buyerJurisdictionCode, category: created.category, taxCode: created.taxCode, taxBase: created.taxBase, basisPoints: created.basisPoints, effectiveFrom, effectiveTo } });
      return created;
    });
  }

  async approveTaxProfile(actorId: string, role: UserRole, id: string, reviewReference: string) {
    if (role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Approving a tax profile requires Super Admin or God Mode authority.');
    if (!reviewReference?.trim() || reviewReference.trim().length < 5 || reviewReference.trim().length > 256) throw new BadRequestException('A qualified tax/legal review reference is required before approval.');
    const existing = await this.prisma.marketplaceTaxProfile.findUnique({ where: { id } });
    if (!existing || existing.status !== 'DRAFT') throw new NotFoundException('Draft Marketplace tax profile not found.');
    const overlap = await this.prisma.marketplaceTaxProfile.findFirst({ where: { id: { not: id }, status: 'APPROVED', sellerJurisdictionCode: existing.sellerJurisdictionCode, buyerJurisdictionCode: existing.buyerJurisdictionCode, category: existing.category, effectiveFrom: { lt: existing.effectiveTo ?? new Date('9999-12-31T00:00:00.000Z') }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: existing.effectiveFrom } }] }, select: { id: true } });
    if (overlap) throw new BadRequestException('Another approved tax profile overlaps this jurisdiction/category effective period. End or retire the existing profile first.');
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceTaxProfile.update({ where: { id }, data: { status: 'APPROVED', reviewReference: reviewReference.trim(), approvedById: actorId, approvedAt: now, version: existing.version + 1 } });
      await this.audit.createInTransaction(tx, { actorId, action: 'APPROVE_MARKETPLACE_TAX_PROFILE', resourceType: 'marketplaceTaxProfile', resourceId: id, description: 'Marketplace tax profile approved with qualified review reference', metadata: { version: updated.version, reviewReference: updated.reviewReference, effectiveFrom: updated.effectiveFrom, effectiveTo: updated.effectiveTo } });
      return updated;
    });
  }

  async retireTaxProfile(actorId: string, role: UserRole, id: string, reason: string) {
    if (role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Retiring a tax profile requires Super Admin or God Mode authority.');
    if (!reason?.trim() || reason.trim().length < 5) throw new BadRequestException('A reason is required to retire a tax profile.');
    const existing = await this.prisma.marketplaceTaxProfile.findUnique({ where: { id } });
    if (!existing || existing.status === 'RETIRED') throw new NotFoundException('Active Marketplace tax profile not found.');
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceTaxProfile.update({ where: { id }, data: { status: 'RETIRED', retiredAt: now, effectiveTo: existing.effectiveTo && existing.effectiveTo < now ? existing.effectiveTo : now, version: existing.version + 1 } });
      await this.audit.createInTransaction(tx, { actorId, action: 'RETIRE_MARKETPLACE_TAX_PROFILE', resourceType: 'marketplaceTaxProfile', resourceId: id, description: 'Marketplace tax profile retired', metadata: { previousStatus: existing.status, reason: reason.trim(), version: updated.version } });
      return updated;
    });
  }

  private async commercePolicy() {
    const policy = await this.prisma.marketplaceCommercePolicy.findUnique({ where: { id: 'default' } });
    return policy ?? { id: 'default', version: 0, feesEnabled: false, buyerFeeBasisPoints: 0, sellerCommissionBasisPoints: 0, taxEnabled: false, taxBasisPoints: 0, taxReviewReference: null, currency: 'INR' };
  }

  async getCommercePolicy() {
    const p = await this.commercePolicy();
    return { version: p.version, feesEnabled: p.feesEnabled, buyerFeePercent: p.buyerFeeBasisPoints / 100, sellerCommissionPercent: p.sellerCommissionBasisPoints / 100, taxEnabled: p.taxEnabled && Boolean(p.taxReviewReference), taxPercent: p.taxBasisPoints / 100, taxReviewRequired: !(p.taxEnabled && p.taxReviewReference), taxReviewReference: p.taxReviewReference, currency: p.currency };
  }

  async updateCommercePolicy(userId: string, role: UserRole, dto: UpdateCommercePolicyDto) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Commerce policy changes require Admin, Super Admin, or God Mode authority.');
    const current = await this.commercePolicy();
    const requestedTaxReference = dto.taxReviewReference === undefined ? current.taxReviewReference : dto.taxReviewReference.trim() || null;
    const requestedTaxBasisPoints = dto.taxPercent === undefined ? current.taxBasisPoints : Math.round(dto.taxPercent * 100);
    const requestedTaxEnabled = dto.taxEnabled ?? current.taxEnabled;
    const taxConfigurationChanged = requestedTaxReference !== current.taxReviewReference || requestedTaxBasisPoints !== current.taxBasisPoints || requestedTaxEnabled !== current.taxEnabled;
    if (role === UserRole.ADMIN && taxConfigurationChanged) throw new UnauthorizedException('Tax policy changes require Super Admin or God Mode authority.');
    const buyerFeeBasisPoints = dto.buyerFeePercent === undefined ? current.buyerFeeBasisPoints : Math.round(dto.buyerFeePercent * 100);
    const sellerCommissionBasisPoints = dto.sellerCommissionPercent === undefined ? current.sellerCommissionBasisPoints : Math.round(dto.sellerCommissionPercent * 100);
    const taxBasisPoints = requestedTaxBasisPoints;
    const taxReviewReference = requestedTaxReference;
    const taxEnabled = requestedTaxEnabled;
    if (taxEnabled && !taxReviewReference) throw new BadRequestException('Tax cannot be enabled without a tax-policy review reference.');
    if (buyerFeeBasisPoints > 10000 || sellerCommissionBasisPoints > 10000 || taxBasisPoints > 10000) throw new BadRequestException('Percentage values must not exceed 100%.');
    return this.prisma.$transaction(async (tx) => {
      const policy = await tx.marketplaceCommercePolicy.upsert({ where: { id: 'default' }, create: { id: 'default', version: 1, feesEnabled: dto.feesEnabled ?? false, buyerFeeBasisPoints, sellerCommissionBasisPoints, taxEnabled, taxBasisPoints, taxReviewReference, currency: 'INR', updatedById: userId }, update: { version: current.version + 1, feesEnabled: dto.feesEnabled ?? current.feesEnabled, buyerFeeBasisPoints, sellerCommissionBasisPoints, taxEnabled, taxBasisPoints, taxReviewReference, updatedById: userId } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'UPDATE_COMMERCE_POLICY', resourceType: 'marketplaceCommercePolicy', resourceId: 'default', description: 'Marketplace fees and tax policy updated', metadata: { version: policy.version, feesEnabled: policy.feesEnabled, buyerFeeBasisPoints, sellerCommissionBasisPoints, taxEnabled: policy.taxEnabled, taxBasisPoints, taxReviewReference: policy.taxReviewReference } });
      return { version: policy.version, feesEnabled: policy.feesEnabled, buyerFeePercent: policy.buyerFeeBasisPoints / 100, sellerCommissionPercent: policy.sellerCommissionBasisPoints / 100, taxEnabled: policy.taxEnabled && Boolean(policy.taxReviewReference), taxPercent: policy.taxBasisPoints / 100, taxReviewRequired: !(policy.taxEnabled && policy.taxReviewReference), taxReviewReference: policy.taxReviewReference, currency: policy.currency };
    });
  }

  private money(cents: number) { return (cents / 100).toFixed(2); }

  private async calculateQuote(listing: { price: number | null; currency: string | null; category?: string | null; sellerJurisdictionCode?: string | null }, quantity: number, unitPrice?: number | null, buyerJurisdictionCode?: string | null) {
    const price = unitPrice ?? listing.price;
    if (price === null || price === undefined || !Number.isFinite(price) || price < 0) throw new BadRequestException('A valid listing or agreed unit price is required for a quote.');
    const policy = await this.commercePolicy();
    const subtotalCents = Math.round(quantity * price * 100);
    const buyerFeeEnabled = policy.feesEnabled && await this.isFeatureEnabled('marketplace.buyer_fees');
    const sellerCommissionEnabled = policy.feesEnabled && await this.isFeatureEnabled('marketplace.seller_commission');
    const taxDisplayEnabled = await this.isFeatureEnabled('marketplace.tax_display');
    const taxProfilesEnabled = await this.isFeatureEnabled('marketplace.tax_profiles');
    let taxProfile: any = null;
    if (taxProfilesEnabled && taxDisplayEnabled && listing.sellerJurisdictionCode && buyerJurisdictionCode && listing.category) {
      const now = new Date();
      taxProfile = await this.prisma.marketplaceTaxProfile.findFirst({ where: { sellerJurisdictionCode: listing.sellerJurisdictionCode, buyerJurisdictionCode, category: listing.category, status: 'APPROVED', effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, orderBy: { effectiveFrom: 'desc' } });
    }
    const legacyTaxConfigured = !taxProfilesEnabled && policy.taxEnabled && Boolean(policy.taxReviewReference) && taxDisplayEnabled;
    const taxConfigured = taxProfilesEnabled ? Boolean(taxProfile) : legacyTaxConfigured;
    const buyerFeeCents = buyerFeeEnabled ? Math.round(subtotalCents * policy.buyerFeeBasisPoints / 10000) : 0;
    const sellerCommissionCents = sellerCommissionEnabled ? Math.round(subtotalCents * policy.sellerCommissionBasisPoints / 10000) : 0;
    const taxBasisPoints = taxProfile?.basisPoints ?? policy.taxBasisPoints;
    const taxBase = taxProfile?.taxBase ?? 'SUBTOTAL';
    const taxBaseCents = taxBase === 'SUBTOTAL_PLUS_BUYER_FEE' ? subtotalCents + buyerFeeCents : taxBase === 'BUYER_FEE' ? buyerFeeCents : taxBase === 'SELLER_COMMISSION' ? sellerCommissionCents : subtotalCents;
    const taxCents = taxConfigured ? Math.round(taxBaseCents * taxBasisPoints / 10000) : 0;
    const buyerTotalCents = subtotalCents + buyerFeeCents + taxCents;
    const sellerNetCents = subtotalCents - sellerCommissionCents;
    const taxStatus = taxConfigured ? 'CONFIGURED_BY_REVIEW_REFERENCE' : taxProfilesEnabled ? (!listing.sellerJurisdictionCode || !buyerJurisdictionCode ? 'JURISDICTION_REQUIRED' : 'PROFILE_NOT_FOUND') : 'REVIEW_REQUIRED';
    const taxReviewReference = taxProfile?.reviewReference ?? (legacyTaxConfigured ? policy.taxReviewReference : null);
    const snapshot = { policyVersion: policy.version, feesEnabled: policy.feesEnabled, buyerFeeEnabled, sellerCommissionEnabled, buyerFeeBasisPoints: policy.buyerFeeBasisPoints, sellerCommissionBasisPoints: policy.sellerCommissionBasisPoints, taxEnabled: taxConfigured, taxBasisPoints: taxConfigured ? taxBasisPoints : null, taxProfileId: taxProfile?.id ?? null, taxCode: taxProfile?.taxCode ?? null, taxName: taxProfile?.taxName ?? null, taxBase: taxConfigured ? taxBase : null, taxReviewReference, sellerJurisdictionCode: listing.sellerJurisdictionCode ?? null, buyerJurisdictionCode: buyerJurisdictionCode ?? null, category: listing.category ?? null, currency: listing.currency || 'INR', quantity, unitPrice: Number(price), subtotal: this.money(subtotalCents), buyerFeeAmount: this.money(buyerFeeCents), sellerCommissionAmount: this.money(sellerCommissionCents), taxAmount: this.money(taxCents), buyerTotal: this.money(buyerTotalCents), sellerNet: this.money(sellerNetCents), taxStatus };
    return { unitPrice: Number(price), quantity, currency: listing.currency || 'INR', subtotal: this.money(subtotalCents), buyerFeeAmount: this.money(buyerFeeCents), sellerCommissionAmount: this.money(sellerCommissionCents), taxAmount: this.money(taxCents), buyerTotal: this.money(buyerTotalCents), sellerNet: this.money(sellerNetCents), pricingPolicyVersion: policy.version, taxStatus, taxProfile: taxProfile ? { id: taxProfile.id, taxCode: taxProfile.taxCode, taxName: taxProfile.taxName, taxBase: taxProfile.taxBase, reviewReference: taxProfile.reviewReference, effectiveFrom: taxProfile.effectiveFrom, effectiveTo: taxProfile.effectiveTo } : null, feesStatus: buyerFeeEnabled || sellerCommissionEnabled ? 'ENABLED' : 'DISABLED', pricingSnapshot: snapshot };
  }

  async quoteOrder(userId: string, role: UserRole, listingId: string, dto: QuoteOrderDto) {
    await this.assertFeatureEnabled('marketplace.orders');
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) throw new BadRequestException('Order quantity must be greater than zero.');
    const listing = await this.prisma.marketplaceListing.findFirst({ where: { id: listingId, status: 'PUBLISHED', deletedAt: null, publishedAt: { not: null } } });
    if (!listing) throw new NotFoundException('Published marketplace listing not found.');
    await this.assertSellerNotMarketplaceRestricted(listing.sellerId);
    if (listing.sellerId === userId) throw new BadRequestException('You cannot quote your own listing.');
    if (listing.minOrderQuantity != null && dto.quantity < listing.minOrderQuantity) throw new BadRequestException('Order quantity is below the seller minimum of ' + listing.minOrderQuantity + ' ' + (listing.unit || 'units') + '.');
    if (listing.quantity != null && dto.quantity > listing.quantity) throw new BadRequestException('Requested quantity exceeds the listed quantity.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.CREATE, ownerId: userId });
    let offerPrice: number | undefined;
    if (dto.offerPrice !== undefined) {
      const validation = this.registry.validateResourceField('marketplaceOrder', 'offerPrice', dto.offerPrice);
      if (!validation.valid) throw new BadRequestException({ message: 'Invalid marketplace offer price.', errors: validation.errors });
      offerPrice = Number(validation.value);
    }
    const tierPrice = await this.isFeatureEnabled('marketplace.wholesale_pricing') ? this.tierPrice(listing, dto.quantity) : listing.price ?? undefined;
    const quote = await this.calculateQuote(listing, dto.quantity, offerPrice ?? tierPrice, dto.buyerJurisdictionCode);
    return { ...quote, notice: quote.taxStatus !== 'CONFIGURED_BY_REVIEW_REFERENCE' ? 'Tax configuration or jurisdiction review is required. This is a provisional quote, not a tax determination or payment request.' : 'Tax line uses a dated, approved profile and review reference; confirm jurisdiction and applicability with a qualified adviser before live collection. No payment or deduction has been made.' };
  }

  async createOrder(userId: string, role: UserRole, listingId: string, dto: CreateOrderDto) {
    await this.assertFeatureEnabled('marketplace.orders');
    if (dto.offerPrice !== undefined) await this.assertFeatureEnabled('marketplace.offers');
    await this.assertNotRestricted(userId, 'ORDER_CREATE');
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) throw new BadRequestException('Order quantity must be greater than zero.');
    const listing = await this.prisma.marketplaceListing.findFirst({ where: { id: listingId, status: 'PUBLISHED', deletedAt: null, publishedAt: { not: null } } });
    if (!listing) throw new NotFoundException('Published marketplace listing not found.');
    await this.assertSellerNotMarketplaceRestricted(listing.sellerId);
    if (listing.sellerId === userId) throw new BadRequestException('You cannot place an order on your own listing.');
    if (listing.minOrderQuantity != null && dto.quantity < listing.minOrderQuantity) throw new BadRequestException('Order quantity is below the seller minimum of ' + listing.minOrderQuantity + ' ' + (listing.unit || 'units') + '.');
    if (listing.quantity != null && dto.quantity > listing.quantity) throw new BadRequestException('Requested quantity exceeds the listed quantity.');
    let offerPrice: number | undefined;
    if (dto.offerPrice !== undefined) {
      const validation = this.registry.validateResourceField('marketplaceOrder', 'offerPrice', dto.offerPrice);
      if (!validation.valid) throw new BadRequestException({ message: 'Invalid marketplace offer price.', errors: validation.errors });
      offerPrice = Number(validation.value);
    }
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.CREATE, ownerId: userId });
    const listedUnitPrice = await this.isFeatureEnabled('marketplace.wholesale_pricing') ? this.tierPrice(listing, dto.quantity) : listing.price ?? undefined;
    const quote = await this.calculateQuote(listing, dto.quantity, offerPrice ?? listedUnitPrice, dto.buyerJurisdictionCode);
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.marketplaceOrder.create({ data: { listingId, buyerId: userId, sellerId: listing.sellerId, quantity: dto.quantity, unitPrice: listedUnitPrice ?? quote.unitPrice, buyerJurisdictionCode: dto.buyerJurisdictionCode || null, ...(offerPrice !== undefined ? { offerPrice } : {}), currency: listing.currency || 'INR', subtotal: quote.subtotal, buyerFeeAmount: quote.buyerFeeAmount, sellerCommissionAmount: quote.sellerCommissionAmount, taxAmount: quote.taxAmount, buyerTotal: quote.buyerTotal, sellerNet: quote.sellerNet, pricingPolicyVersion: quote.pricingPolicyVersion, pricingSnapshot: quote.pricingSnapshot, note: dto.note?.trim() || null, status: 'PENDING' } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE', resourceType: 'marketplaceOrder', resourceId: order.id, description: 'Marketplace order request created' });
      await tx.notification.create({ data: { userId: listing.sellerId, type: 'MARKETPLACE_ORDER', title: 'New marketplace order', message: 'A buyer requested ' + dto.quantity + ' ' + (listing.unit || 'units') + ' of ' + listing.title + '.', href: '/app/marketplace' } });
      return order;
    });
  }

  async findMyOrders(userId: string, role: UserRole) {
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.READ, ownerId: userId });
    return this.prisma.marketplaceOrder.findMany({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] }, include: { listing: { select: { id: true, title: true, resourceType: true, resourceId: true } }, buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } }, reviews: { where: { OR: [{ reviewerId: userId }, { revieweeId: userId }] }, select: { id: true, rating: true, status: true, comment: true, sellerResponse: true, reviewerId: true, revieweeId: true } }, payments: { select: { id: true, provider: true, status: true, amount: true, currency: true, createdAt: true, refunds: { select: { id: true, status: true, amount: true, currency: true, reason: true, createdAt: true } } } } }, orderBy: { createdAt: 'desc' } });
  }

  async createReview(userId: string, role: UserRole, orderId: string, dto: CreateReviewDto) {
    await this.assertFeatureEnabled('marketplace.reviews');
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Review rating must be an integer from 1 to 5.');
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'COMPLETED') throw new BadRequestException('Reviews are available only for completed transactions.');
    const revieweeId = order.buyerId === userId ? order.sellerId : order.sellerId === userId ? order.buyerId : null;
    if (!revieweeId) throw new NotFoundException('Marketplace order not found.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.READ, ownerId: userId, resourceId: orderId });
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.marketplaceReview.create({ data: { orderId, reviewerId: userId, revieweeId, rating: dto.rating, comment: dto.comment?.trim() || null, status: 'PENDING' } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE_REVIEW', resourceType: 'marketplaceReview', resourceId: review.id, description: 'Verified-transaction review submitted for moderation', metadata: { orderId, revieweeId, rating: dto.rating } });
      return review;
    });
  }

  async moderateReview(actorId: string, role: UserRole, reviewId: string, dto: ModerateReviewDto) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Marketplace review moderation requires Admin, Super Admin, or God Mode authority.');
    const existing = await this.prisma.marketplaceReview.findUnique({ where: { id: reviewId }, select: { id: true, status: true } });
    if (!existing) throw new NotFoundException('Marketplace review not found.');
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.marketplaceReview.update({ where: { id: reviewId }, data: { status: dto.status, moderatedAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId, action: 'MODERATE_REVIEW', resourceType: 'marketplaceReview', resourceId: reviewId, description: 'Marketplace review moderation decision', metadata: { previousStatus: existing.status, newStatus: dto.status, note: dto.note?.trim() || null } });
      return review;
    });
  }

  async respondToReview(userId: string, role: UserRole, reviewId: string, dto: RespondReviewDto) {
    if (!(await this.isFeatureEnabled('marketplace.reviews'))) throw new BadRequestException('Marketplace reviews are currently disabled.');
    const response = dto.response?.trim();
    if (!response) throw new BadRequestException('A response is required.');
    const review = await this.prisma.marketplaceReview.findUnique({ where: { id: reviewId } });
    if (!review || review.revieweeId !== userId || review.status !== 'PUBLISHED') throw new NotFoundException('Published Marketplace review not found.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceReview', action: AuthorizationAction.UPDATE, ownerId: userId, resourceId: reviewId });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceReview.update({ where: { id: reviewId }, data: { sellerResponse: response } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'RESPOND_REVIEW', resourceType: 'marketplaceReview', resourceId: reviewId, description: 'Transaction participant responded to a published Marketplace review', metadata: { responseLength: response.length, revieweeId: review.revieweeId } });
      return updated;
    });
  }

  async listReviewsForModeration(role: UserRole) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) throw new UnauthorizedException('Marketplace review moderation requires Admin, Super Admin, or God Mode authority.');
    return this.prisma.marketplaceReview.findMany({ where: { status: 'PENDING' }, include: { reviewer: { select: { id: true, name: true } }, reviewee: { select: { id: true, name: true } }, order: { select: { id: true, completedAt: true, listing: { select: { title: true } } } } }, orderBy: { createdAt: 'asc' } });
  }

  async getPublicReviews(userId: string) {
    return this.prisma.marketplaceReview.findMany({ where: { revieweeId: userId, status: 'PUBLISHED' }, select: { id: true, rating: true, comment: true, sellerResponse: true, createdAt: true, reviewer: { select: { id: true, name: true, isVerified: true } } }, orderBy: { createdAt: 'desc' } });
  }

  private async transitionOrder(userId: string, role: UserRole, id: string, dto: OrderDecisionDto, transition: 'ACCEPT' | 'REJECT' | 'CANCEL' | 'COMPLETE') {
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Marketplace order not found.');
    const sellerAction = transition === 'ACCEPT' || transition === 'REJECT' || transition === 'COMPLETE';
    const expectedActor = sellerAction ? order.sellerId : order.buyerId;
    if (expectedActor !== userId) throw new NotFoundException('Marketplace order not found.');
    const expectedStatus = transition === 'COMPLETE' ? 'ACCEPTED' : 'PENDING';
    if (order.status !== expectedStatus) throw new BadRequestException('Order cannot transition from ' + order.status + ' to ' + transition + '.');
    if (transition === 'COMPLETE' && order.deliveryStatus && order.deliveryStatus !== 'DELIVERED') throw new BadRequestException('Buyer must confirm delivery before this tracked order can be completed.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.UPDATE, ownerId: userId });
    let agreedUnitPrice: number | undefined;
    if (transition === 'ACCEPT') {
      const proposed = dto.agreedUnitPrice ?? order.offerPrice ?? order.unitPrice;
      if (proposed !== null && proposed !== undefined) {
        const validation = this.registry.validateResourceField('marketplaceOrder', 'agreedUnitPrice', proposed);
        if (!validation.valid) throw new BadRequestException({ message: 'Invalid agreed marketplace price.', errors: validation.errors });
        agreedUnitPrice = Number(validation.value);
      }
    }
    const baselinePrice = order.offerPrice ?? order.unitPrice;
    const priceConfirmationRequired = transition === 'ACCEPT' && agreedUnitPrice !== undefined && baselinePrice !== null && baselinePrice !== undefined && Math.round(agreedUnitPrice * 100) !== Math.round(Number(baselinePrice) * 100);
    const acceptanceQuote = transition === 'ACCEPT' ? await this.calculateQuote({ price: order.unitPrice, currency: order.currency, category: (order.pricingSnapshot as any)?.category, sellerJurisdictionCode: (order.pricingSnapshot as any)?.sellerJurisdictionCode }, order.quantity, agreedUnitPrice ?? baselinePrice, order.buyerJurisdictionCode) : undefined;
    const state = {
      ACCEPT: { status: priceConfirmationRequired ? 'PRICE_CONFIRMATION_REQUIRED' : 'ACCEPTED', ...(!priceConfirmationRequired ? { acceptedAt: new Date() } : {}), ...(agreedUnitPrice !== undefined ? { agreedUnitPrice } : {}), sellerNote: dto.note?.trim() || null },
      REJECT: { status: 'REJECTED', rejectedAt: new Date(), sellerNote: dto.note?.trim() || null },
      CANCEL: { status: 'CANCELLED', cancelledAt: new Date(), note: dto.note?.trim() || order.note },
      COMPLETE: { status: 'COMPLETED', completedAt: new Date(), sellerNote: dto.note?.trim() || order.sellerNote },
    }[transition];
    return this.prisma.$transaction(async (tx) => {
      if (transition === 'COMPLETE') {
        const listing = await tx.marketplaceListing.findUnique({ where: { id: order.listingId } });
        if (listing?.resourceType === 'inventoryItem' && listing.resourceId) {
          const item = await tx.inventoryItem.findFirst({ where: { id: listing.resourceId, deletedAt: null }, select: { id: true, name: true, quantityOnHand: true, reorderLevel: true, unit: true, farm: { select: { ownerId: true } } } });
          if (!item || item.farm.ownerId !== order.sellerId) throw new BadRequestException('The linked inventory item is unavailable or no longer owned by this seller.');
          const before = item.quantityOnHand;
          if (before < order.quantity) throw new BadRequestException('Insufficient inventory stock to complete this Marketplace order.');
          const stockUpdate = await tx.inventoryItem.updateMany({ where: { id: item.id, deletedAt: null, quantityOnHand: { equals: before, gte: order.quantity } }, data: { quantityOnHand: { decrement: order.quantity } } });
          if (stockUpdate.count !== 1) throw new BadRequestException('Inventory changed concurrently. Refresh and retry order completion.');
          const after = before - order.quantity;
          await tx.inventoryTransaction.create({ data: { inventoryItemId: item.id, actorId: userId, type: InventoryTransactionType.STOCK_OUT, quantity: order.quantity, quantityBefore: before, quantityAfter: after, reference: 'marketplace-order:' + order.id, notes: 'Marketplace sale order ' + order.id } });
          await this.audit.createInTransaction(tx, { actorId: userId, action: 'STOCK_OUT', resourceType: 'inventoryItem', resourceId: item.id, description: 'Inventory stock decremented by completed Marketplace sale', metadata: { orderId: order.id, quantity: order.quantity, quantityBefore: before, quantityAfter: after, unit: item.unit } });
          if (before > item.reorderLevel && after <= item.reorderLevel) await tx.notification.create({ data: { userId: item.farm.ownerId, type: 'LOW_STOCK', title: 'Marketplace sale reached reorder level', message: item.name + ' has ' + after + ' ' + item.unit + ' remaining after order ' + order.id + '.', href: '/app/marketplace?workspace=inventory' } });
        }
        if (listing && listing.quantity !== null && listing.quantity !== undefined) {
          const stockUpdate = await tx.marketplaceListing.updateMany({
            where: { id: order.listingId, status: 'PUBLISHED', deletedAt: null, quantity: { gte: order.quantity } },
            data: { quantity: { decrement: order.quantity } },
          });
          if (stockUpdate.count !== 1) throw new BadRequestException('Insufficient available listing quantity to complete this order.');
          const remaining = await tx.marketplaceListing.findUnique({ where: { id: order.listingId }, select: { quantity: true } });
          if (remaining?.quantity !== null && remaining?.quantity !== undefined && remaining.quantity <= 0) {
            await tx.marketplaceListing.update({ where: { id: order.listingId }, data: { status: 'SOLD' } });
          }
        }
      }
      const updated = await tx.marketplaceOrder.update({ where: { id }, data: { ...state, ...(acceptanceQuote ? { subtotal: acceptanceQuote.subtotal, buyerFeeAmount: acceptanceQuote.buyerFeeAmount, sellerCommissionAmount: acceptanceQuote.sellerCommissionAmount, taxAmount: acceptanceQuote.taxAmount, buyerTotal: acceptanceQuote.buyerTotal, sellerNet: acceptanceQuote.sellerNet, pricingPolicyVersion: acceptanceQuote.pricingPolicyVersion, pricingSnapshot: acceptanceQuote.pricingSnapshot } : {}) } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: transition, resourceType: 'marketplaceOrder', resourceId: id, description: 'Marketplace order ' + transition.toLowerCase() + ' transition' });
      const notifyUserId = sellerAction ? order.buyerId : order.sellerId;
      await tx.notification.create({ data: { userId: notifyUserId, type: 'MARKETPLACE_ORDER', title: 'Marketplace order ' + transition.toLowerCase(), message: 'Your marketplace order is now ' + updated.status + '.', href: '/app/marketplace' } });
      return updated;
    });
  }

  private sandboxPaymentEnabled() {
    if (process.env.KK_MARKETPLACE_PAYMENT_MODE !== 'sandbox') throw new BadRequestException('Marketplace payment simulation is disabled. Set KK_MARKETPLACE_PAYMENT_MODE=sandbox only in a non-production test environment.');
    if (!process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET || process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET.length < 32) throw new BadRequestException('A sandbox webhook secret of at least 32 characters must be configured.');
  }

  private sandboxPaymentView(payment: any) {
    return { id: payment.id, orderId: payment.orderId, provider: payment.provider, providerPaymentId: payment.providerPaymentId, status: payment.status, amount: payment.amount?.toString?.() ?? String(payment.amount), currency: payment.currency, createdAt: payment.createdAt, simulationOnly: true, notice: 'Sandbox simulation only. No money is collected, transferred, or settled.' };
  }

  async createSandboxPaymentIntent(userId: string, role: UserRole, orderId: string, idempotencyKey: string) {
    await this.assertFeatureEnabled('marketplace.payment_sandbox');
    this.sandboxPaymentEnabled();
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey || '')) throw new BadRequestException('Provide a valid payment idempotency key (8-128 safe characters).');
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== userId) throw new NotFoundException('Marketplace order not found.');
    if (order.status !== 'ACCEPTED') throw new BadRequestException('A sandbox payment intent can only be created for an accepted order.');
    const buyerTotal = order.buyerTotal;
    if (buyerTotal === null || buyerTotal === undefined || !order.currency) throw new BadRequestException('This order has no saved buyer quote.');
    const paymentAmount = new Prisma.Decimal(buyerTotal);
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.READ, ownerId: userId, resourceId: orderId });
    const existing = await this.prisma.marketplacePayment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.orderId !== orderId || !new Prisma.Decimal(existing.amount).equals(paymentAmount)) throw new BadRequestException('That idempotency key is already bound to a different payment request.');
      return this.sandboxPaymentView(existing);
    }
    const providerPaymentId = 'sandbox_' + randomUUID();
    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.marketplacePayment.create({ data: { orderId, provider: 'sandbox', providerPaymentId, idempotencyKey, status: 'CREATED', amount: paymentAmount, currency: order.currency, quoteSnapshot: (order.pricingSnapshot || {}) as Prisma.InputJsonValue } });
        await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE_MARKETPLACE_SANDBOX_PAYMENT', resourceType: 'marketplacePayment', resourceId: created.id, description: 'Sandbox-only payment intent created without collecting funds', metadata: { orderId, provider: 'sandbox', amount: created.amount.toString(), currency: created.currency, idempotencyKey, simulationOnly: true } });
        return created;
      });
      return this.sandboxPaymentView(payment);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const raced = await this.prisma.marketplacePayment.findUnique({ where: { idempotencyKey } });
        if (raced && raced.orderId === orderId && order.buyerTotal !== null && order.buyerTotal !== undefined && new Prisma.Decimal(raced.amount).equals(new Prisma.Decimal(order.buyerTotal))) return this.sandboxPaymentView(raced);
      }
      throw error;
    }
  }

  async handleSandboxPaymentWebhook(rawBody: Buffer | undefined, signature: string | undefined, event: { eventId: string; providerPaymentId: string; status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED'; amount: string; currency: string }) {
    await this.assertFeatureEnabled('marketplace.payment_sandbox');
    this.sandboxPaymentEnabled();
    const secret = process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET!;
    if (!rawBody?.length || !signature) throw new UnauthorizedException('A signed sandbox webhook is required.');
    const supplied = signature.replace(/^sha256=/i, '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(supplied)) throw new UnauthorizedException('Invalid sandbox webhook signature.');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))) throw new UnauthorizedException('Invalid sandbox webhook signature.');
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const payment = await this.prisma.marketplacePayment.findFirst({ where: { provider: 'sandbox', providerPaymentId: event.providerPaymentId } });
    if (!payment) throw new NotFoundException('Sandbox payment not found.');
    if (!new Prisma.Decimal(event.amount).equals(new Prisma.Decimal(payment.amount)) || event.currency !== payment.currency) throw new BadRequestException('Sandbox event amount or currency does not match the immutable payment intent.');
    const uniqueEvent = { provider_externalEventId: { provider: 'sandbox', externalEventId: event.eventId } };
    const prior = await this.prisma.marketplacePaymentEvent.findUnique({ where: uniqueEvent });
    if (prior) {
      if (prior.paymentId !== payment.id || prior.payloadHash !== payloadHash) throw new BadRequestException('Sandbox event identifier was reused with a different payload.');
      return { accepted: true, replayed: true, paymentStatus: payment.status, simulationOnly: true };
    }
    const transitions: Record<string, string[]> = { CREATED: ['AUTHORIZED', 'FAILED'], AUTHORIZED: ['CAPTURED', 'FAILED'], CAPTURED: [], FAILED: [] };
    if (!(transitions[payment.status] || []).includes(event.status)) throw new BadRequestException('Invalid sandbox payment transition from ' + payment.status + ' to ' + event.status + '.');
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: payment.orderId } });
    if (event.status === 'CAPTURED' && order?.status !== 'ACCEPTED') throw new BadRequestException('Sandbox capture is permitted only while the order remains accepted.');
    return this.prisma.$transaction(async (tx) => {
      const concurrentReplay = await tx.marketplacePaymentEvent.findUnique({ where: uniqueEvent });
      if (concurrentReplay) {
        if (concurrentReplay.paymentId !== payment.id || concurrentReplay.payloadHash !== payloadHash) throw new BadRequestException('Sandbox event identifier was reused with a different payload.');
        return { accepted: true, replayed: true, paymentStatus: payment.status, simulationOnly: true };
      }
      const now = new Date();
      const updated = await tx.marketplacePayment.update({ where: { id: payment.id }, data: { status: event.status, externalEventId: event.eventId, ...(event.status === 'AUTHORIZED' ? { authorizedAt: now } : {}), ...(event.status === 'CAPTURED' ? { capturedAt: now } : {}), ...(event.status === 'FAILED' ? { failedAt: now } : {}) } });
      await tx.marketplacePaymentEvent.create({ data: { paymentId: payment.id, provider: 'sandbox', externalEventId: event.eventId, status: event.status, payloadHash } });
      if (event.status === 'CAPTURED') {
        const amount = payment.amount;
        await tx.marketplaceLedgerEntry.create({ data: { orderId: payment.orderId, paymentId: payment.id, entryKey: payment.id + ':capture:debit', accountCode: 'PAYMENT_CLEARING', direction: 'DEBIT', amount, currency: payment.currency, entryType: 'SANDBOX_PAYMENT_CAPTURE', metadata: { provider: 'sandbox', eventId: event.eventId, simulationOnly: true } } });
        await tx.marketplaceLedgerEntry.create({ data: { orderId: payment.orderId, paymentId: payment.id, entryKey: payment.id + ':capture:credit', accountCode: 'BUYER_FUNDS_HELD', direction: 'CREDIT', amount, currency: payment.currency, entryType: 'SANDBOX_PAYMENT_CAPTURE', metadata: { provider: 'sandbox', eventId: event.eventId, simulationOnly: true } } });
      }
      await this.audit.createInTransaction(tx, { actorId: null, action: 'PROCESS_MARKETPLACE_SANDBOX_PAYMENT_EVENT', resourceType: 'marketplacePayment', resourceId: payment.id, description: 'Signed sandbox payment event processed; no funds moved', metadata: { provider: 'sandbox', eventId: event.eventId, status: event.status, payloadHash, ledgerBalanced: event.status === 'CAPTURED', simulationOnly: true } });
      return { accepted: true, replayed: false, paymentStatus: updated.status, simulationOnly: true, ledgerEntriesCreated: event.status === 'CAPTURED' ? 2 : 0, notice: 'Sandbox simulation only. No money has moved.' };
    });
  }

  async createSandboxRefundRequest(userId: string, role: UserRole, orderId: string, dto: { idempotencyKey: string; amount: string; reason: string }) {
    await this.assertFeatureEnabled('marketplace.refunds_sandbox');
    this.sandboxPaymentEnabled();
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(dto.idempotencyKey || '')) throw new BadRequestException('Provide a valid refund idempotency key.');
    if (!dto.reason?.trim() || dto.reason.trim().length < 5 || dto.reason.trim().length > 1000) throw new BadRequestException('Provide a refund reason between 5 and 1000 characters.');
    const amount = new Prisma.Decimal(dto.amount);
    if (!amount.isFinite() || amount.lte(0)) throw new BadRequestException('Refund amount must be greater than zero.');
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== userId) throw new NotFoundException('Marketplace order not found.');
    if (order.status !== 'ACCEPTED' && order.status !== 'COMPLETED') throw new BadRequestException('A sandbox refund can only be requested for an accepted or completed order.');
    const existing = await this.prisma.marketplaceRefund.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) {
      if (existing.orderId !== orderId || !new Prisma.Decimal(existing.amount).equals(amount)) throw new BadRequestException('That refund idempotency key is already bound to a different request.');
      return { id: existing.id, orderId: existing.orderId, status: existing.status, amount: existing.amount.toString(), currency: existing.currency, providerRefundId: existing.providerRefundId, simulationOnly: true, notice: 'Sandbox refund simulation only. No money is moved.' };
    }
    const payment = await this.prisma.marketplacePayment.findFirst({ where: { orderId, provider: 'sandbox', status: 'CAPTURED' }, orderBy: { capturedAt: 'desc' } });
    if (!payment) throw new BadRequestException('No captured sandbox payment exists for this order.');
    const reserved = await this.prisma.marketplaceRefund.aggregate({ where: { paymentId: payment.id, status: { in: ['REQUESTED', 'SUCCEEDED'] } }, _sum: { amount: true } });
    const alreadyRefunded = new Prisma.Decimal(reserved._sum.amount ?? 0);
    if (alreadyRefunded.plus(amount).gt(payment.amount)) throw new BadRequestException('Requested refund exceeds the remaining captured amount.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceRefund', action: AuthorizationAction.CREATE, ownerId: userId, resourceId: orderId });
    const providerRefundId = 'sandbox_refund_' + randomUUID();
    try {
      const refund = await this.prisma.$transaction(async (tx) => {
        const created = await tx.marketplaceRefund.create({ data: { paymentId: payment.id, orderId, createdById: userId, idempotencyKey: dto.idempotencyKey, providerRefundId, status: 'REQUESTED', amount, currency: payment.currency, reason: dto.reason.trim() } });
        await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE_MARKETPLACE_SANDBOX_REFUND', resourceType: 'marketplaceRefund', resourceId: created.id, description: 'Sandbox refund requested without moving funds', metadata: { orderId, paymentId: payment.id, amount: amount.toString(), currency: payment.currency, reason: dto.reason.trim(), simulationOnly: true } });
        return created;
      });
      return { id: refund.id, orderId: refund.orderId, status: refund.status, amount: refund.amount.toString(), currency: refund.currency, providerRefundId: refund.providerRefundId, simulationOnly: true, notice: 'Sandbox refund simulation only. No money is moved.' };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const raced = await this.prisma.marketplaceRefund.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
        if (raced && raced.orderId === orderId && new Prisma.Decimal(raced.amount).equals(amount)) return { id: raced.id, orderId: raced.orderId, status: raced.status, amount: raced.amount.toString(), currency: raced.currency, providerRefundId: raced.providerRefundId, simulationOnly: true, notice: 'Sandbox refund simulation only. No money is moved.' };
      }
      throw error;
    }
  }

  async handleSandboxRefundWebhook(rawBody: Buffer | undefined, signature: string | undefined, event: { eventId: string; providerRefundId: string; status: 'SUCCEEDED' | 'FAILED'; amount: string; currency: string }) {
    await this.assertFeatureEnabled('marketplace.refunds_sandbox');
    this.sandboxPaymentEnabled();
    const secret = process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET!;
    if (!rawBody?.length || !signature) throw new UnauthorizedException('A signed sandbox refund webhook is required.');
    const supplied = signature.replace(/^sha256=/i, '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(supplied)) throw new UnauthorizedException('Invalid sandbox refund webhook signature.');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))) throw new UnauthorizedException('Invalid sandbox refund webhook signature.');
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const refund = await this.prisma.marketplaceRefund.findFirst({ where: { providerRefundId: event.providerRefundId }, include: { payment: true } });
    if (!refund || refund.payment.provider !== 'sandbox') throw new NotFoundException('Sandbox refund not found.');
    if (!new Prisma.Decimal(event.amount).equals(new Prisma.Decimal(refund.amount)) || event.currency !== refund.currency) throw new BadRequestException('Sandbox refund event amount or currency does not match the immutable refund request.');
    const uniqueEvent = { provider_externalEventId: { provider: 'sandbox', externalEventId: event.eventId } };
    const eventStatus = 'REFUND_' + event.status;
    const prior = await this.prisma.marketplacePaymentEvent.findUnique({ where: uniqueEvent });
    if (prior) {
      if (prior.paymentId !== refund.paymentId || prior.payloadHash !== payloadHash) throw new BadRequestException('Sandbox event identifier was reused with a different payload.');
      return { accepted: true, replayed: true, refundStatus: refund.status, simulationOnly: true };
    }
    if (refund.status !== 'REQUESTED') throw new BadRequestException('Only a requested sandbox refund can transition to a terminal result.');
    return this.prisma.$transaction(async (tx) => {
      const concurrentReplay = await tx.marketplacePaymentEvent.findUnique({ where: uniqueEvent });
      if (concurrentReplay) {
        if (concurrentReplay.paymentId !== refund.paymentId || concurrentReplay.payloadHash !== payloadHash) throw new BadRequestException('Sandbox event identifier was reused with a different payload.');
        return { accepted: true, replayed: true, refundStatus: refund.status, simulationOnly: true };
      }
      const updated = await tx.marketplaceRefund.update({ where: { id: refund.id }, data: { status: event.status, externalEventId: event.eventId } });
      await tx.marketplacePaymentEvent.create({ data: { paymentId: refund.paymentId, provider: 'sandbox', externalEventId: event.eventId, status: eventStatus, payloadHash } });
      if (event.status === 'SUCCEEDED') {
        await tx.marketplaceLedgerEntry.create({ data: { orderId: refund.orderId, paymentId: refund.paymentId, refundId: refund.id, entryKey: refund.id + ':refund:debit', accountCode: 'BUYER_FUNDS_HELD', direction: 'DEBIT', amount: refund.amount, currency: refund.currency, entryType: 'SANDBOX_REFUND', metadata: { provider: 'sandbox', eventId: event.eventId, simulationOnly: true } } });
        await tx.marketplaceLedgerEntry.create({ data: { orderId: refund.orderId, paymentId: refund.paymentId, refundId: refund.id, entryKey: refund.id + ':refund:credit', accountCode: 'PAYMENT_CLEARING', direction: 'CREDIT', amount: refund.amount, currency: refund.currency, entryType: 'SANDBOX_REFUND', metadata: { provider: 'sandbox', eventId: event.eventId, simulationOnly: true } } });
      }
      await this.audit.createInTransaction(tx, { actorId: null, action: 'PROCESS_MARKETPLACE_SANDBOX_REFUND_EVENT', resourceType: 'marketplaceRefund', resourceId: refund.id, description: 'Signed sandbox refund event processed; no funds moved', metadata: { provider: 'sandbox', eventId: event.eventId, status: event.status, payloadHash, ledgerBalanced: event.status === 'SUCCEEDED', simulationOnly: true } });
      return { accepted: true, replayed: false, refundStatus: updated.status, simulationOnly: true, ledgerEntriesCreated: event.status === 'SUCCEEDED' ? 2 : 0, notice: 'Sandbox refund simulation only. No money has moved.' };
    });
  }

  async updateDelivery(userId: string, role: UserRole, id: string, dto: UpdateDeliveryDto) {
    await this.assertFeatureEnabled('marketplace.delivery');
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id } });
    if (!order || order.sellerId !== userId) throw new NotFoundException('Marketplace order not found.');
    if (order.status !== 'ACCEPTED') throw new BadRequestException('Delivery tracking can be updated only for an accepted order.');
    if (order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'RETURNED') throw new BadRequestException('Delivery tracking is terminal and cannot be changed.');
    if (!dto.status && !dto.carrier && !dto.trackingNumber && !dto.trackingUrl && !dto.estimatedDeliveryAt) throw new BadRequestException('Provide at least one delivery tracking update.');
    const transitions: Record<string, string[]> = {
      '': ['PREPARING'], PREPARING: ['PREPARING', 'DISPATCHED', 'FAILED'],
      DISPATCHED: ['DISPATCHED', 'IN_TRANSIT', 'FAILED'],
      IN_TRANSIT: ['IN_TRANSIT', 'FAILED', 'RETURNED'],
      FAILED: ['PREPARING', 'FAILED'],
    };
    const current = order.deliveryStatus || '';
    if (dto.status && !(transitions[current] || []).includes(dto.status)) throw new BadRequestException('Invalid delivery transition from ' + (current || 'NOT_STARTED') + ' to ' + dto.status + '.');
    const data: Record<string, unknown> = {};
    if (dto.status) {
      const statusCheck = this.registry.validateResourceField('marketplaceOrder', 'deliveryStatus', dto.status);
      if (!statusCheck.valid) throw new BadRequestException({ message: 'Invalid delivery status.', errors: statusCheck.errors });
      data.deliveryStatus = statusCheck.value;
      if (dto.status === 'DISPATCHED' && !order.dispatchedAt) data.dispatchedAt = new Date();
    }
    for (const [key, value, registryField] of [
      ['deliveryCarrier', dto.carrier, 'deliveryCarrier'],
      ['deliveryTrackingNumber', dto.trackingNumber, 'deliveryTrackingNumber'],
    ] as const) {
      if (value !== undefined) {
        const checked = this.registry.validateResourceField('marketplaceOrder', key, value);
        if (!checked.valid) throw new BadRequestException({ message: 'Invalid ' + registryField + '.', errors: checked.errors });
        data[key] = checked.value;
      }
    }
    if (dto.trackingUrl !== undefined) {
      if (!dto.trackingUrl.startsWith('https://')) throw new BadRequestException('Tracking links must use HTTPS.');
      const checked = this.registry.validateField('marketplaceShipmentTrackingUrl', dto.trackingUrl);
      if (!checked.valid) throw new BadRequestException({ message: 'Invalid tracking URL.', errors: checked.errors });
      data.deliveryTrackingUrl = checked.value;
    }
    if (dto.estimatedDeliveryAt !== undefined) data.estimatedDeliveryAt = new Date(dto.estimatedDeliveryAt);
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.UPDATE, ownerId: userId, resourceId: id });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceOrder.update({ where: { id }, data });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'UPDATE_DELIVERY_TRACKING', resourceType: 'marketplaceOrder', resourceId: id, description: 'Seller updated Marketplace delivery tracking', metadata: { previousStatus: current || null, status: dto.status || current || null, carrier: dto.carrier || order.deliveryCarrier || null, trackingNumberChanged: dto.trackingNumber !== undefined, trackingUrlChanged: dto.trackingUrl !== undefined, estimatedDeliveryAt: dto.estimatedDeliveryAt || null } });
      await tx.notification.create({ data: { userId: order.buyerId, type: 'MARKETPLACE_ORDER', title: 'Delivery tracking updated', message: 'The seller updated delivery information for your order.', href: '/app/marketplace' } });
      return updated;
    });
  }

  async confirmDelivery(userId: string, role: UserRole, id: string) {
    await this.assertFeatureEnabled('marketplace.delivery');
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id } });
    if (!order || order.buyerId !== userId) throw new NotFoundException('Marketplace order not found.');
    if (!['DISPATCHED', 'IN_TRANSIT'].includes(order.deliveryStatus || '')) throw new BadRequestException('Delivery can be confirmed only after dispatch.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.UPDATE, ownerId: userId, resourceId: id });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceOrder.update({ where: { id }, data: { deliveryStatus: 'DELIVERED', deliveredAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CONFIRM_DELIVERY', resourceType: 'marketplaceOrder', resourceId: id, description: 'Buyer confirmed receipt of Marketplace order', metadata: { previousDeliveryStatus: order.deliveryStatus } });
      await tx.notification.create({ data: { userId: order.sellerId, type: 'MARKETPLACE_ORDER', title: 'Buyer confirmed delivery', message: 'The buyer confirmed receipt. You may close the order.', href: '/app/marketplace' } });
      return updated;
    });
  }

  async counterOffer(userId: string, role: UserRole, id: string, dto: CounterOfferDto) {
    await this.assertFeatureEnabled('marketplace.offers');
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id } });
    if (!order || order.buyerId !== userId) throw new NotFoundException('Marketplace order not found.');
    if (order.status !== 'PRICE_CONFIRMATION_REQUIRED') throw new BadRequestException('A buyer counter-offer is available only after the seller proposes a revised price.');
    const validation = this.registry.validateResourceField('marketplaceOrder', 'offerPrice', dto.counterOfferPrice);
    if (!validation.valid) throw new BadRequestException({ message: 'Invalid buyer counter-offer price.', errors: validation.errors });
    const price = Number(validation.value);
    const quote = await this.calculateQuote({ price: order.unitPrice, currency: order.currency, category: (order.pricingSnapshot as any)?.category, sellerJurisdictionCode: (order.pricingSnapshot as any)?.sellerJurisdictionCode }, order.quantity, price, order.buyerJurisdictionCode);
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.UPDATE, ownerId: userId, resourceId: id });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceOrder.update({ where: { id }, data: {
        status: 'PENDING', offerPrice: price, agreedUnitPrice: null, acceptedAt: null,
        note: dto.note?.trim() ? [order.note, 'Buyer counter-offer: ' + dto.note.trim()].filter(Boolean).join('\n') : order.note,
        subtotal: quote.subtotal, buyerFeeAmount: quote.buyerFeeAmount, sellerCommissionAmount: quote.sellerCommissionAmount,
        taxAmount: quote.taxAmount, buyerTotal: quote.buyerTotal, sellerNet: quote.sellerNet,
        pricingPolicyVersion: quote.pricingPolicyVersion, pricingSnapshot: quote.pricingSnapshot,
      } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'COUNTER_OFFER', resourceType: 'marketplaceOrder', resourceId: id, description: 'Buyer counter-offer returned the order to seller negotiation', metadata: { previousStatus: order.status, previousOfferPrice: order.offerPrice, previousAgreedUnitPrice: order.agreedUnitPrice, counterOfferPrice: price, quantity: order.quantity, currency: order.currency, pricingPolicyVersion: quote.pricingPolicyVersion, pricingSnapshot: quote.pricingSnapshot } });
      await tx.notification.create({ data: { userId: order.sellerId, type: 'MARKETPLACE_ORDER', title: 'Buyer sent a counter-offer', message: 'The buyer proposed ' + order.currency + ' ' + price + ' per unit. Review the order in Marketplace.', href: '/app/marketplace' } });
      return updated;
    });
  }

  async confirmOrderPrice(userId: string, role: UserRole, id: string) {
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id } });
    if (!order || order.buyerId !== userId) throw new NotFoundException('Marketplace order not found.');
    if (order.status !== 'PRICE_CONFIRMATION_REQUIRED') throw new BadRequestException('This order does not require buyer price confirmation.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceOrder', action: AuthorizationAction.UPDATE, ownerId: userId, resourceId: id });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceOrder.update({ where: { id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CONFIRM_PRICE', resourceType: 'marketplaceOrder', resourceId: id, description: 'Buyer confirmed revised marketplace price and quote' });
      await tx.notification.create({ data: { userId: order.sellerId, type: 'MARKETPLACE_ORDER', title: 'Buyer confirmed revised price', message: 'The buyer confirmed the revised deal price. You may proceed with fulfilment.', href: '/app/marketplace' } });
      return updated;
    });
  }

  acceptOrder(userId: string, role: UserRole, id: string, dto: OrderDecisionDto) { return this.transitionOrder(userId, role, id, dto, 'ACCEPT'); }
  rejectOrder(userId: string, role: UserRole, id: string, dto: OrderDecisionDto) { return this.transitionOrder(userId, role, id, dto, 'REJECT'); }
  cancelOrder(userId: string, role: UserRole, id: string, dto: OrderDecisionDto) { return this.transitionOrder(userId, role, id, dto, 'CANCEL'); }
  completeOrder(userId: string, role: UserRole, id: string, dto: OrderDecisionDto) { return this.transitionOrder(userId, role, id, dto, 'COMPLETE'); }

  async update(userId: string, role: UserRole, id: string, dto: UpdateListingDto, transaction?: Prisma.TransactionClient) {
    await this.assertListing(userId, role, id, AuthorizationAction.UPDATE);
    const validated = this.validateFields({
      category: dto.category,
      title: dto.title,
      description: dto.description,
      quantity: dto.quantity,
      minOrderQuantity: dto.minOrderQuantity,
      sellerJurisdictionCode: dto.sellerJurisdictionCode?.trim().toUpperCase(),
      unit: dto.unit,
      price: dto.price,
      currency: dto.currency,
    });
    if (dto.priceTiers?.length) await this.assertFeatureEnabled('marketplace.wholesale_pricing');
    const priceTiers = this.validatePriceTiers(dto.priceTiers);
    const imageUrls = dto.imageUrls?.map((url) => this.validateMediaUrl('marketplaceListingImageUrl', url, 'image'));
    const videoUrls = dto.videoUrls?.map((url) => this.validateMediaUrl('marketplaceListingVideoUrl', url, 'video'));
    const externalLinks = dto.externalLinks?.map((url) => this.validateMediaUrl('marketplaceListingExternalLink', url, 'external'));
    const performUpdate = async (tx: Prisma.TransactionClient) => {
      const listing = await tx.marketplaceListing.update({ where: { id }, data: { category: validated.category as string | undefined, title: validated.title, description: validated.description, quantity: validated.quantity, minOrderQuantity: validated.minOrderQuantity, sellerJurisdictionCode: validated.sellerJurisdictionCode, ...(priceTiers !== undefined ? { priceTiers: priceTiers as Prisma.InputJsonValue } : {}), unit: validated.unit, price: validated.price, currency: validated.currency, ...(imageUrls ? { imageUrls } : {}), ...(videoUrls ? { videoUrls } : {}), ...(externalLinks ? { externalLinks } : {}) } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'UPDATE', resourceType: 'marketplaceListing', resourceId: id, description: 'Marketplace listing updated' });
      return listing;
    };
    return transaction ? performUpdate(transaction) : this.prisma.$transaction(performUpdate);
  }

  async publish(userId: string, role: UserRole, id: string) {
    await this.assertFeatureEnabled('marketplace.listings');
    await this.assertNotRestricted(userId, 'LISTING_CREATE');
    await this.assertListing(userId, role, id, AuthorizationAction.UPDATE);
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'PUBLISH', resourceType: 'marketplaceListing', resourceId: id, description: 'Marketplace listing published' });
      return listing;
    });
  }

  async archive(userId: string, role: UserRole, id: string) {
    await this.assertListing(userId, role, id, AuthorizationAction.DELETE);
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'DELETE', resourceType: 'marketplaceListing', resourceId: id, description: 'Marketplace listing archived' });
      return listing;
    });
  }
}

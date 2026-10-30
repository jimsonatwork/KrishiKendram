import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

describe('Marketplace shopping profile and visitor analytics', () => {
  const prisma: any = {
    marketplaceFeatureFlag: { findUnique: jest.fn().mockResolvedValue({ enabled: true }) },
    marketplaceBuyerProfile: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    marketplaceListing: { findFirst: jest.fn() },
    marketplaceListingViewEvent: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  };
  const audit: any = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  let service: MarketplaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketplaceService(prisma, {} as any, audit, {} as any, {} as any);
  });

  it('saves a buyer persona and only allows selected modules when consent is explicit', async () => {
    prisma.marketplaceBuyerProfile.findUnique.mockResolvedValue(null);
    prisma.marketplaceBuyerProfile.upsert.mockImplementation(({ create }: any) => ({ id: 'profile-1', ...create }));
    const result = await service.saveBuyerProfile('buyer-1', {
      buyerType: 'COMMISSION_AGENT', purchasePurpose: 'COMMISSION',
      cropInterests: ['paddy', 'paddy', ' cotton '],
      crossModuleConsent: true, moduleTargets: ['crops', 'finance', 'external'],
    });
    expect(result.profile).toMatchObject({
      buyerType: 'COMMISSION_AGENT', purchasePurpose: 'COMMISSION',
      cropInterests: ['paddy', 'cotton'], moduleTargets: ['crops', 'finance'],
      crossModuleConsent: true,
    });
    expect(result.profile.consentAt).toBeInstanceOf(Date);
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'buyer-1', action: 'MARKETPLACE_BUYER_PROFILE_UPDATED',
    }));
  });

  it('does not enable cross-module sharing when consent is absent', async () => {
    prisma.marketplaceBuyerProfile.findUnique.mockResolvedValue(null);
    prisma.marketplaceBuyerProfile.upsert.mockImplementation(({ create }: any) => ({ id: 'profile-2', ...create }));
    const result = await service.saveBuyerProfile('buyer-1', {
      buyerType: 'FARMER', purchasePurpose: 'FARMING',
      crossModuleConsent: false, moduleTargets: ['farms', 'finance'],
    });
    expect(result.crossModuleConsent).toBe(false);
    expect(result.profile.moduleTargets).toEqual([]);
    expect(result.profile.consentAt).toBeNull();
  });

  it('rejects invalid buyer personas and purposes', async () => {
    await expect(service.saveBuyerProfile('buyer-1', { buyerType: 'UNKNOWN', purchasePurpose: 'FARMING' }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.saveBuyerProfile('buyer-1', { buyerType: 'FARMER', purchasePurpose: 'UNKNOWN' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('only returns profile context to modules the user explicitly selected', async () => {
    prisma.marketplaceBuyerProfile.findUnique.mockResolvedValue({
      buyerType: 'BUSINESS', purchasePurpose: 'BUSINESS_USE', businessName: 'Seed Shop',
      regionLabel: 'Guntur', operationScale: 'MEDIUM', cropInterests: ['paddy'],
      moduleTargets: ['inventory'], crossModuleConsent: true,
    });
    expect(await service.getBuyerProfileContext('buyer-1', 'inventory')).toMatchObject({
      available: true, module: 'inventory', context: { buyerType: 'BUSINESS', cropInterests: ['paddy'] },
    });
    expect(await service.getBuyerProfileContext('buyer-1', 'finance')).toMatchObject({
      available: false, module: 'finance',
    });
    await expect(service.getBuyerProfileContext('buyer-1', 'external')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes cross-module sharing without deleting the Marketplace profile', async () => {
    prisma.marketplaceBuyerProfile.findUnique.mockResolvedValue({ id: 'profile-1', crossModuleConsent: true });
    prisma.marketplaceBuyerProfile.update.mockImplementation(({ data }: any) => ({ id: 'profile-1', ...data }));
    const result = await service.revokeBuyerProfileCrossModuleConsent('buyer-1');
    expect(result.crossModuleConsent).toBe(false);
    expect(result.profile.moduleTargets).toEqual([]);
    expect(result.profile.consentRevokedAt).toBeInstanceOf(Date);
    expect(prisma.marketplaceBuyerProfile.update).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'buyer-1' } }));
  });

  it('counts unique anonymous sessions in the last hour without storing the session key', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1' });
    prisma.marketplaceListingViewEvent.findFirst.mockResolvedValue(null);
    prisma.marketplaceListingViewEvent.create.mockResolvedValue({ id: 'view-1' });
    prisma.marketplaceListingViewEvent.findMany.mockResolvedValue([{ sessionHash: 'hash-a' }, { sessionHash: 'hash-b' }]);
    const result = await service.recordListingView('listing-1', 'anonymous-session-key-123456');
    expect(result).toMatchObject({ listingId: 'listing-1', visitorsLastHour: 2, windowMinutes: 60 });
    const event = prisma.marketplaceListingViewEvent.create.mock.calls[0][0].data;
    expect(event.sessionHash).not.toContain('anonymous-session-key');
    expect(event).not.toHaveProperty('ipAddress');
    expect(prisma.marketplaceListingViewEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ listingId: 'listing-1', viewedAt: expect.any(Object) }),
      distinct: ['sessionHash'],
    }));
  });

  it('returns last-hour unique visitor counts for published listings as a batch', async () => {
    prisma.marketplaceListingViewEvent.findMany.mockResolvedValue([
      { listingId: 'listing-a', sessionHash: 'hash-1' },
      { listingId: 'listing-a', sessionHash: 'hash-2' },
      { listingId: 'listing-b', sessionHash: 'hash-3' },
    ]);
    expect(await service.getListingViewCounts()).toMatchObject({
      counts: { 'listing-a': 2, 'listing-b': 1 },
      windowMinutes: 60,
    });
    expect(prisma.marketplaceListingViewEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      distinct: ['listingId', 'sessionHash'],
      where: expect.objectContaining({ listing: { status: 'PUBLISHED', deletedAt: null } }),
    }));
  });

  it('does not count views for unpublished listings', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue(null);
    await expect(service.recordListingView('draft-listing', 'anonymous-session-key-123456'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.marketplaceListingViewEvent.create).not.toHaveBeenCalled();
  });
});

import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';
import { mkdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';

describe('MarketplaceService', () => {
  const prisma: any = {
    resourceRelationship: { findFirst: jest.fn() },
    farmAsset: { findFirst: jest.fn(), findUnique: jest.fn() },
    crop: { findFirst: jest.fn(), findUnique: jest.fn() },
    livestock: { findFirst: jest.fn(), findUnique: jest.fn() },
    inventoryItem: { findFirst: jest.fn(), updateMany: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
    marketplaceListing: { findFirst: jest.fn(), findMany: jest.fn() },
    marketplaceOrder: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    marketplacePayment: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    marketplacePaymentEvent: { findUnique: jest.fn(), create: jest.fn() },
    marketplaceLedgerEntry: { create: jest.fn() },
    marketplaceReview: { findUnique: jest.fn(), findMany: jest.fn() },
    marketplaceRestriction: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    marketplaceTrustCase: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    marketplaceCommercePolicy: { findUnique: jest.fn(), upsert: jest.fn() },
    marketplaceFeatureFlag: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn(), createMany: jest.fn().mockResolvedValue({ count: 0 }), upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  const authorization: any = { assertCan: jest.fn() };
  const audit: any = { createInTransaction: jest.fn() };
  const registry: any = { validateResourceField: jest.fn(), validateField: jest.fn(), getField: jest.fn() };
  let service: MarketplaceService;
  let txLedgerEntryCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.marketplaceCommercePolicy.findUnique.mockResolvedValue(null);
    prisma.marketplaceFeatureFlag.findUnique.mockResolvedValue(null);
    service = new MarketplaceService(prisma, authorization, audit, registry);
    txLedgerEntryCreate = jest.fn().mockResolvedValue({ id: 'ledger-entry-1' });
    prisma.$transaction.mockImplementation((cb: any) => cb({
      marketplaceListing: { create: jest.fn().mockResolvedValue({ id: 'listing-1', status: 'DRAFT' }), update: jest.fn().mockResolvedValue({ id: 'listing-1' }), findUnique: jest.fn().mockResolvedValue(null), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      marketplaceOrder: { create: jest.fn().mockResolvedValue({ id: 'order-1', status: 'PENDING' }), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'ACCEPTED' }) },
      marketplacePayment: { create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'payment-1', ...data, createdAt: new Date() })), update: jest.fn().mockImplementation(({ where, data }: any) => ({ id: where.id, orderId: 'order-1', provider: 'sandbox', amount: '123.45', currency: 'INR', ...data })) },
      marketplacePaymentEvent: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'payment-event-1' }) },
      marketplaceLedgerEntry: { create: txLedgerEntryCreate },
    marketplaceReview: { create: jest.fn().mockResolvedValue({ id: 'review-1', status: 'PENDING' }), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'review-1', status: 'PUBLISHED' }) },
      marketplaceTrustCase: { create: jest.fn().mockResolvedValue({ id: 'case-1', status: 'OPEN', category: 'NON_DELIVERY', orderId: 'order-1', listingId: null }), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'case-1', status: 'RESOLVED' }) },
      marketplaceFeatureFlag: { upsert: jest.fn().mockImplementation(({ where, create, update }: any) => ({ ...create, ...update, key: where.key })) },
      marketplaceRestriction: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'restriction-1' }), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      marketplaceCommercePolicy: { upsert: jest.fn() },
      notification: { create: jest.fn().mockResolvedValue({ id: 'notification-1' }), createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'notification-1' }) },
    }));
    registry.validateResourceField.mockImplementation((_r: string, _f: string, value: any) => ({ valid: true, value }));
    registry.validateField.mockImplementation((_f: string, value: any) => ({ valid: true, value }));
    prisma.marketplaceOrder.create.mockResolvedValue({ id: 'order-1', status: 'PENDING' });
    prisma.marketplaceOrder.update.mockResolvedValue({ id: 'order-1', status: 'ACCEPTED' });
    prisma.marketplacePayment.findUnique.mockResolvedValue(null);
    prisma.marketplacePayment.findFirst.mockResolvedValue(null);
    prisma.marketplacePaymentEvent.findUnique.mockResolvedValue(null);
  });
  it('creates a listing only after resource ownership authorization', async () => {
    prisma.resourceRelationship.findFirst.mockResolvedValue({ userId: 'owner-1' });
    prisma.farmAsset.findFirst.mockResolvedValue({ id: 'asset-1' });
    const result = await service.create('owner-1', UserRole.FARMER, {
      resourceType: 'farmAsset', resourceId: 'asset-1', title: ' Seed ',
      quantity: 10, unit: 'kg', price: 50, currency: 'inr',
    });
    expect(result).toEqual({ id: 'listing-1', status: 'DRAFT' });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({
      action: 'CREATE', ownerId: 'owner-1', resource: 'marketplaceListing',
    }));
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE' }));
  });

  it('links an inventory-backed listing to farm-owned stock and rejects over-listing', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'inventory-1', quantityOnHand: 5, farm: { ownerId: 'owner-1' } });
    const result = await service.create('owner-1', UserRole.FARMER, {
      resourceType: 'inventoryItem', resourceId: 'inventory-1', title: 'Paddy seed',
      quantity: 4, unit: 'kg', price: 30, currency: 'INR',
    });
    expect(result).toEqual({ id: 'listing-1', status: 'DRAFT' });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'owner-1', resource: 'marketplaceListing', action: 'CREATE' }));

    jest.clearAllMocks();
    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'inventory-1', quantityOnHand: 5, farm: { ownerId: 'owner-1' } });
    await expect(service.create('owner-1', UserRole.FARMER, {
      resourceType: 'inventoryItem', resourceId: 'inventory-1', title: 'Too much seed',
      quantity: 6, unit: 'kg', price: 30, currency: 'INR',
    })).rejects.toThrow('Listing quantity cannot exceed available inventory stock.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a generic user-owned listing without a linked farm resource', async () => {
    const result = await service.create('seller-1', UserRole.FARMER, {
      category: 'PRODUCE', title: 'Fresh tomatoes', imageUrls: ['https://example.test/tomato.jpg'], videoUrls: ['https://youtube.com/watch?v=demo'], externalLinks: ['https://drive.google.com/file/d/demo/view'],
    } as any);
    expect(result).toEqual({ id: 'listing-1', status: 'DRAFT' });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'seller-1', action: 'CREATE' }));
    expect(registry.validateField).toHaveBeenCalledWith('marketplaceListingImageUrl', 'https://example.test/tomato.jpg');
    expect(registry.validateField).toHaveBeenCalledWith('marketplaceListingVideoUrl', 'https://youtube.com/watch?v=demo');
    expect(registry.validateField).toHaveBeenCalledWith('marketplaceListingExternalLink', 'https://drive.google.com/file/d/demo/view');
  });

  it('validates all supplied listing fields through Registry', async () => {
    prisma.resourceRelationship.findFirst.mockResolvedValue({ userId: 'owner-1' });
    prisma.crop.findFirst.mockResolvedValue({ id: 'crop-1' });
    await service.create('owner-1', UserRole.FARMER, {
      resourceType: 'crop', resourceId: 'crop-1', title: 'Crop',
      description: 'Description', quantity: 4, unit: 'kg', price: 12, currency: 'INR',
    });
    expect(registry.validateResourceField).toHaveBeenCalledTimes(9);
  });

  it('rejects invalid Registry fields before persistence', async () => {
    registry.validateResourceField.mockImplementation((_r: string, field: string) =>
      field === 'price' ? { valid: false, errors: ['min'] } : { valid: true, value: 'x' });
    await expect(service.create('u1', UserRole.FARMER, {
      resourceType: 'livestock', resourceId: 'l1', title: 'Animal', price: -1,
    })).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects a missing marketplace resource', async () => {
    prisma.resourceRelationship.findFirst.mockResolvedValue(null);
    prisma.crop.findUnique.mockResolvedValue(null);
    await expect(service.create('u1', UserRole.FARMER, {
      resourceType: 'crop', resourceId: 'missing', title: 'Crop',
    })).rejects.toThrow(NotFoundException);
  });

  it('uses the current listing seller as the authorization owner on update', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1' });
    await service.update('seller-1', UserRole.FARMER, 'listing-1', { title: 'Updated' });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({
      action: 'UPDATE', resourceId: 'listing-1', ownerId: 'seller-1',
    }));
    expect(audit.createInTransaction).toHaveBeenCalled();
  });

  it('rejects update of an archived listing', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue(null);
    await expect(service.update('seller-1', UserRole.FARMER, 'listing-1', { title: 'Updated' }))
      .rejects.toThrow('Marketplace listing not found.');
  });

  it('publishes atomically and records audit', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1' });
    await service.publish('seller-1', UserRole.FARMER, 'listing-1');
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'PUBLISH' }));
  });
  it('archives atomically and records delete audit', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1' });
    await service.archive('seller-1', UserRole.FARMER, 'listing-1');
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'DELETE' }));
  });

  it('serves category choices from the central Registry field definition', () => {
    registry.getField.mockReturnValue({ validation: { enumValues: ['PRODUCE', 'OTHER'] } });
    expect(service.getCategories()).toEqual(['PRODUCE', 'OTHER']);
    expect(registry.getField).toHaveBeenCalledWith('marketplaceListingCategory');
  });

  it('rejects browse categories that are not allowed by Registry', async () => {
    registry.validateResourceField.mockReturnValue({ valid: false, errors: ['enum'] });
    await expect(service.findPublished('active', 'UNREGISTERED')).rejects.toThrow(BadRequestException);
    expect(prisma.marketplaceListing.findMany).not.toHaveBeenCalled();
  });

  it('lists only published non-deleted listings publicly', async () => {
    prisma.marketplaceListing.findMany.mockResolvedValue([{ id: 'published-1' }]);
    await expect(service.findPublished()).resolves.toEqual([{ id: 'published-1' }]);
    expect(prisma.marketplaceListing.findMany).toHaveBeenCalledWith({
      where: { status: 'PUBLISHED', deletedAt: null, publishedAt: { not: null } },
      include: { seller: { select: { id: true, name: true, isVerified: true, userType: true, marketplaceSellerProfile: { select: { displayName: true, bio: true, regionLabel: true, contactPreference: true, publicPhone: true, showPhone: true } }, marketplaceRestrictions: { where: { scope: 'CAUTION', status: 'ACTIVE', startsAt: { lte: expect.any(Date) }, OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] }, select: { cautionRating: true, expiresAt: true }, orderBy: { createdAt: 'desc' }, take: 1 } } } },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('lists only active listings owned by the requesting user', async () => {
    prisma.marketplaceListing.findMany.mockResolvedValue([{ id: 'mine-1' }]);
    await expect(service.findMine('seller-1', UserRole.FARMER)).resolves.toEqual([{ id: 'mine-1' }]);
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({
      action: 'READ', ownerId: 'seller-1',
    }));
  });

  it('creates an order against a published listing and records audit', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 20, price: 15, currency: 'INR', status: 'PUBLISHED' });
    await expect(service.createOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 3, offerPrice: 12, note: 'Deliver after harvest' })).resolves.toEqual({ id: 'order-1', status: 'PENDING' });
    expect(registry.validateResourceField).toHaveBeenCalledWith('marketplaceOrder', 'offerPrice', 12);
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({ resource: 'marketplaceOrder', action: 'CREATE', ownerId: 'buyer-1' }));
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ resourceType: 'marketplaceOrder', action: 'CREATE' }));
  });

  it('quotes buyer fees, seller commission and reviewed tax separately', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 20, price: 50, currency: 'INR', status: 'PUBLISHED' });
    prisma.marketplaceCommercePolicy.findUnique.mockResolvedValue({ id: 'default', version: 3, feesEnabled: true, buyerFeeBasisPoints: 500, sellerCommissionBasisPoints: 1000, taxEnabled: true, taxBasisPoints: 1800, taxReviewReference: 'review-ref-2026', currency: 'INR' });
    prisma.marketplaceFeatureFlag.findUnique.mockImplementation(({ where }: any) => ({ enabled: ['marketplace.orders', 'marketplace.buyer_fees', 'marketplace.seller_commission', 'marketplace.tax_display'].includes(where.key) }));
    const quote = await service.quoteOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 2 });
    expect(quote).toMatchObject({ subtotal: '100.00', buyerFeeAmount: '5.00', sellerCommissionAmount: '10.00', taxAmount: '18.00', buyerTotal: '123.00', sellerNet: '90.00', pricingPolicyVersion: 3, taxStatus: 'CONFIGURED_BY_REVIEW_REFERENCE' });
  });

  it('uses the best eligible wholesale tier in a buyer quote', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 500, price: 100, priceTiers: [{ minQuantity: 10, unitPrice: 90 }, { minQuantity: 25, unitPrice: 80 }, { minQuantity: 100, unitPrice: 70 }], currency: 'INR', status: 'PUBLISHED' });
    const quote = await service.quoteOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 30 });
    expect(quote).toMatchObject({ unitPrice: 80, quantity: 30, subtotal: '2400.00', buyerTotal: '2400.00' });
  });

  it('applies the highest matching wholesale tier to the created order price', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 500, price: 100, priceTiers: [{ minQuantity: 10, unitPrice: 90 }, { minQuantity: 25, unitPrice: 80 }], currency: 'INR', status: 'PUBLISHED' });
    let createdData: any;
    prisma.$transaction.mockImplementation(async (cb: any) => cb({
      marketplaceListing: { create: jest.fn().mockResolvedValue({ id: 'listing-1' }) },
      marketplaceOrder: { create: jest.fn().mockImplementation(({ data }: any) => { createdData = data; return { id: 'order-1', status: 'PENDING' }; }) },
      marketplaceReview: { create: jest.fn() }, marketplaceTrustCase: { create: jest.fn() },
      marketplaceFeatureFlag: { upsert: jest.fn() }, marketplaceRestriction: { findFirst: jest.fn().mockResolvedValue(null) },
      marketplaceCommercePolicy: { findUnique: jest.fn().mockResolvedValue(null) }, notification: { create: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'notification-1' }) },
    }));
    await service.createOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 30 });
    expect(createdData.unitPrice).toBe(80);
    expect(createdData.pricingSnapshot.unitPrice).toBe(80);
  });

  it('rejects duplicate wholesale tier thresholds through Registry-backed validation', async () => {
    await expect(service.create('seller-1', UserRole.FARMER, {
      category: 'PRODUCE', title: 'Bulk tomatoes', price: 100,
      priceTiers: [{ minQuantity: 10, unitPrice: 90 }, { minQuantity: 10, unitPrice: 80 }],
    } as any)).rejects.toThrow('unique and increasing');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('marks tax as requiring review instead of silently assuming tax is zero', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 20, price: 10, currency: 'INR', status: 'PUBLISHED' });
    const quote = await service.quoteOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 2 });
    expect(quote).toMatchObject({ subtotal: '20.00', buyerTotal: '20.00', taxAmount: '0.00', taxStatus: 'REVIEW_REQUIRED' });
    expect(quote.notice).toContain('provisional quote');
  });

  it('prevents buyers from ordering from their own listing', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'buyer-1', quantity: 20, status: 'PUBLISHED' });
    await expect(service.createOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 1 })).rejects.toThrow('own listing');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses the base price when the requested quantity is below the first wholesale tier', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', price: 100, priceTiers: [{ minQuantity: 10, unitPrice: 90 }], quantity: 100, currency: 'INR', status: 'PUBLISHED' });
    const quote = await service.quoteOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 5 });
    expect(quote.unitPrice).toBe(100);
    expect(quote.subtotal).toBe('500.00');
  });

  it('does not apply wholesale tiers when the feature flag is disabled', async () => {
    prisma.marketplaceFeatureFlag.findUnique.mockImplementation(({ where }: any) => where.key === 'marketplace.wholesale_pricing' ? { key: where.key, enabled: false } : null);
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', price: 100, priceTiers: [{ minQuantity: 10, unitPrice: 90 }], quantity: 100, currency: 'INR', status: 'PUBLISHED' });
    const quote = await service.quoteOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 20 });
    expect(quote.unitPrice).toBe(100);
  });

  it('rejects order quantities below the seller minimum order quantity', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 100, minOrderQuantity: 25, unit: 'kg', price: 12, currency: 'INR', status: 'PUBLISHED' });
    await expect(service.createOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 10 })).rejects.toThrow('seller minimum of 25 kg');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows a buyer order at the seller minimum quantity', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 100, minOrderQuantity: 25, unit: 'kg', price: 12, currency: 'INR', status: 'PUBLISHED' });
    await expect(service.createOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 25 })).resolves.toEqual({ id: 'order-1', status: 'PENDING' });
  });

  it('rejects order quantities above the listing quantity', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 2, status: 'PUBLISHED' });
    await expect(service.createOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 3 })).rejects.toThrow('exceeds the listed quantity');
  });

  it('allows only the order seller to accept a pending order', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'PENDING', offerPrice: 12, unitPrice: 15 });
    await expect(service.acceptOrder('buyer-1', UserRole.FARMER, 'order-1', {})).rejects.toThrow('Marketplace order not found.');
    await expect(service.acceptOrder('seller-1', UserRole.FARMER, 'order-1', {})).resolves.toEqual({ id: 'order-1', status: 'ACCEPTED' });
    expect(registry.validateResourceField).toHaveBeenCalledWith('marketplaceOrder', 'agreedUnitPrice', 12);
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ resourceType: 'marketplaceOrder', action: 'ACCEPT' }));
  });

  it('keeps sandbox payment intent creation disabled unless the explicit sandbox environment is configured', async () => {
    const priorMode = process.env.KK_MARKETPLACE_PAYMENT_MODE;
    const priorSecret = process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET;
    delete process.env.KK_MARKETPLACE_PAYMENT_MODE;
    delete process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET;
    prisma.marketplaceFeatureFlag.findUnique.mockImplementation(({ where }: any) => where.key === 'marketplace.payment_sandbox' ? { key: where.key, enabled: true } : null);
    try {
      await expect(service.createSandboxPaymentIntent('buyer-1', UserRole.FARMER, 'order-1', 'idempotency-123')).rejects.toThrow('simulation is disabled');
    } finally {
      if (priorMode === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_MODE; else process.env.KK_MARKETPLACE_PAYMENT_MODE = priorMode;
      if (priorSecret === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET; else process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = priorSecret;
    }
  });

  it('creates an idempotent sandbox-only payment intent with a quote snapshot and audit', async () => {
    const priorMode = process.env.KK_MARKETPLACE_PAYMENT_MODE;
    const priorSecret = process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET;
    process.env.KK_MARKETPLACE_PAYMENT_MODE = 'sandbox';
    process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = 'test-sandbox-secret-at-least-32-characters';
    prisma.marketplaceFeatureFlag.findUnique.mockImplementation(({ where }: any) => where.key === 'marketplace.payment_sandbox' ? { key: where.key, enabled: true } : null);
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', status: 'ACCEPTED', buyerTotal: '123.45', currency: 'INR', pricingSnapshot: { unitPrice: '100.00' } });
    try {
      const result = await service.createSandboxPaymentIntent('buyer-1', UserRole.FARMER, 'order-1', 'idempotency-123');
      expect(result).toMatchObject({ orderId: 'order-1', provider: 'sandbox', status: 'CREATED', amount: '123.45', currency: 'INR', simulationOnly: true });
      expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE_MARKETPLACE_SANDBOX_PAYMENT' }));
    } finally {
      if (priorMode === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_MODE; else process.env.KK_MARKETPLACE_PAYMENT_MODE = priorMode;
      if (priorSecret === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET; else process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = priorSecret;
    }
  });

  it('verifies sandbox webhook HMAC before looking up a payment', async () => {
    const priorMode = process.env.KK_MARKETPLACE_PAYMENT_MODE;
    const priorSecret = process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET;
    process.env.KK_MARKETPLACE_PAYMENT_MODE = 'sandbox';
    process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = 'test-sandbox-secret-at-least-32-characters';
    prisma.marketplaceFeatureFlag.findUnique.mockImplementation(({ where }: any) => where.key === 'marketplace.payment_sandbox' ? { key: where.key, enabled: true } : null);
    const rawBody = Buffer.from('{"eventId":"event-12345678"}');
    try {
      await expect(service.handleSandboxPaymentWebhook(rawBody, 'sha256=' + 'a'.repeat(64), { eventId: 'event-12345678', providerPaymentId: 'sandbox_payment', status: 'CAPTURED', amount: '123.45', currency: 'INR' })).rejects.toThrow(UnauthorizedException);
      expect(prisma.marketplacePayment.findFirst).not.toHaveBeenCalled();
    } finally {
      if (priorMode === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_MODE; else process.env.KK_MARKETPLACE_PAYMENT_MODE = priorMode;
      if (priorSecret === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET; else process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = priorSecret;
    }
  });

  it('accepts a signed sandbox capture and writes equal debit/credit ledger entries without moving money', async () => {
    const priorMode = process.env.KK_MARKETPLACE_PAYMENT_MODE;
    const priorSecret = process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET;
    const secret = 'test-sandbox-secret-at-least-32-characters';
    process.env.KK_MARKETPLACE_PAYMENT_MODE = 'sandbox';
    process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = secret;
    prisma.marketplaceFeatureFlag.findUnique.mockImplementation(({ where }: any) => where.key === 'marketplace.payment_sandbox' ? { key: where.key, enabled: true } : null);
    const event = { eventId: 'evt-capture-12345678', providerPaymentId: 'sandbox_payment123', status: 'CAPTURED' as const, amount: '123.45', currency: 'INR' };
    const rawBody = Buffer.from(JSON.stringify(event));
    const signature = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
    prisma.marketplacePayment.findFirst.mockResolvedValue({ id: 'payment-1', orderId: 'order-1', provider: 'sandbox', providerPaymentId: event.providerPaymentId, amount: '123.45', currency: 'INR', status: 'AUTHORIZED' });
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', status: 'ACCEPTED' });
    try {
      const result = await service.handleSandboxPaymentWebhook(rawBody, signature, event);
      expect(result).toMatchObject({ accepted: true, replayed: false, paymentStatus: 'CAPTURED', simulationOnly: true, ledgerEntriesCreated: 2 });
      expect(txLedgerEntryCreate).toHaveBeenCalledTimes(2);
      const [debit, credit] = txLedgerEntryCreate.mock.calls.map((call: any[]) => call[0].data);
      expect([debit.direction, credit.direction].sort()).toEqual(['CREDIT', 'DEBIT']);
      expect(String(debit.amount)).toBe(String(credit.amount));
      expect(debit.amount).toBe('123.45');
      expect(credit.amount).toBe('123.45');
      expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'PROCESS_MARKETPLACE_SANDBOX_PAYMENT_EVENT', metadata: expect.objectContaining({ ledgerBalanced: true, simulationOnly: true }) }));
    } finally {
      if (priorMode === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_MODE; else process.env.KK_MARKETPLACE_PAYMENT_MODE = priorMode;
      if (priorSecret === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET; else process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = priorSecret;
    }
  });

  it('rejects media uploads whose file signature does not match the declared image type', async () => {
    const tempDir = join(process.cwd(), 'uploads', '.marketplace-tmp');
    mkdirSync(tempDir, { recursive: true });
    const tempPath = join(tempDir, 'marketplace-test-invalid-' + Date.now());
    writeFileSync(tempPath, Buffer.from('not an image'));
    await expect(service.saveMediaUpload('seller-1', UserRole.FARMER, { path: tempPath, size: 12, mimetype: 'image/png' }, 'image')).rejects.toThrow('content does not match');
    expect(existsSync(tempPath)).toBe(false);
  });

  it('stores a signature-validated image under a randomized public media key and audits it', async () => {
    const tempDir = join(process.cwd(), 'uploads', '.marketplace-tmp');
    mkdirSync(tempDir, { recursive: true });
    const tempPath = join(tempDir, 'marketplace-test-valid-' + Date.now());
    writeFileSync(tempPath, Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    const result = await service.saveMediaUpload('seller-1', UserRole.FARMER, { path: tempPath, size: 8, mimetype: 'image/png' }, 'image');
    expect(result).toMatchObject({ mediaType: 'image', mimeType: 'image/png', sizeBytes: 8 });
    expect(result.url).toMatch(/^\/uploads\/marketplace\/[a-f0-9-]+\.png$/);
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'UPLOAD_MARKETPLACE_MEDIA' }));
    rmSync(join(process.cwd(), 'uploads', 'marketplace', result.url.split('/').pop()!), { force: true });
  });

  it('lets only the seller update delivery tracking on an accepted order', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'ACCEPTED', deliveryStatus: null });
    await expect(service.updateDelivery('buyer-1', UserRole.FARMER, 'order-1', { status: 'PREPARING' })).rejects.toThrow('Marketplace order not found.');
    await expect(service.updateDelivery('seller-1', UserRole.FARMER, 'order-1', { status: 'PREPARING', carrier: 'Local transport' })).resolves.toMatchObject({ id: 'order-1' });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'UPDATE_DELIVERY_TRACKING' }));
  });

  it('requires buyer delivery confirmation before completing a tracked order', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'ACCEPTED', deliveryStatus: 'IN_TRANSIT' });
    await expect(service.completeOrder('seller-1', UserRole.FARMER, 'order-1', {})).rejects.toThrow('Buyer must confirm delivery');
  });

  it('allows the buyer to confirm a dispatched delivery with audit', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'ACCEPTED', deliveryStatus: 'IN_TRANSIT' });
    await expect(service.confirmDelivery('buyer-1', UserRole.FARMER, 'order-1')).resolves.toMatchObject({ id: 'order-1' });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CONFIRM_DELIVERY' }));
  });

  it('lets the buyer counter a seller revision and records the negotiation audit', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', listingId: 'listing-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'PRICE_CONFIRMATION_REQUIRED', quantity: 2, unitPrice: 15, offerPrice: 12, agreedUnitPrice: 14, currency: 'INR', note: null });
    await expect(service.counterOffer('buyer-1', UserRole.FARMER, 'order-1', { counterOfferPrice: 13, note: 'Please meet halfway' })).resolves.toMatchObject({ id: 'order-1' });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(registry.validateResourceField).toHaveBeenCalledWith('marketplaceOrder', 'offerPrice', 13);
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'COUNTER_OFFER', metadata: expect.objectContaining({ counterOfferPrice: 13 }) }));
  });

  it('does not allow a non-buyer to submit a counter-offer', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'PRICE_CONFIRMATION_REQUIRED', quantity: 1, unitPrice: 15, currency: 'INR' });
    await expect(service.counterOffer('seller-1', UserRole.FARMER, 'order-1', { counterOfferPrice: 13 })).rejects.toThrow('Marketplace order not found.');
  });

  it('requires buyer confirmation when seller changes the quoted price', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', listingId: 'listing-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'PENDING', quantity: 2, unitPrice: 15, offerPrice: 12, currency: 'INR' });
    const orderUpdate = jest.fn().mockResolvedValue({ id: 'order-1', status: 'PRICE_CONFIRMATION_REQUIRED' });
    prisma.$transaction.mockImplementationOnce((cb: any) => cb({
      marketplaceListing: {}, marketplaceOrder: { update: orderUpdate }, marketplaceCommercePolicy: { findUnique: jest.fn().mockResolvedValue(null) },
      notification: { create: jest.fn().mockResolvedValue({ id: 'notification-1' }), createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'notification-1' }) },
    }));
    const result = await service.acceptOrder('seller-1', UserRole.FARMER, 'order-1', { agreedUnitPrice: 14 });
    expect(result.status).toBe('PRICE_CONFIRMATION_REQUIRED');
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PRICE_CONFIRMATION_REQUIRED', agreedUnitPrice: 14, buyerTotal: '28.00' }) }));
  });

  it('allows only the buyer to confirm a revised price', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'PRICE_CONFIRMATION_REQUIRED' });
    prisma.$transaction.mockImplementationOnce((cb: any) => cb({
      marketplaceOrder: { update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'ACCEPTED' }) },
      notification: { create: jest.fn().mockResolvedValue({ id: 'notification-1' }), createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'notification-1' }) },
    }));
    await expect(service.confirmOrderPrice('seller-1', UserRole.FARMER, 'order-1')).rejects.toThrow('Marketplace order not found.');
    await expect(service.confirmOrderPrice('buyer-1', UserRole.FARMER, 'order-1')).resolves.toEqual({ id: 'order-1', status: 'ACCEPTED' });
  });

  it('reduces available quantity and marks a listing SOLD when the completed order exhausts stock', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', listingId: 'listing-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'ACCEPTED', quantity: 2, unitPrice: 10 });
    const listingFindUnique = jest.fn().mockResolvedValueOnce({ id: 'listing-1', quantity: 2, status: 'PUBLISHED' }).mockResolvedValueOnce({ quantity: 0 });
    const listingUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const listingUpdate = jest.fn().mockResolvedValue({ id: 'listing-1', status: 'SOLD' });
    prisma.$transaction.mockImplementationOnce((cb: any) => cb({
      marketplaceListing: { findUnique: listingFindUnique, updateMany: listingUpdateMany, update: listingUpdate },
      marketplaceOrder: { update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'COMPLETED' }) },
      notification: { create: jest.fn().mockResolvedValue({ id: 'notification-1' }), createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'notification-1' }) },
    }));
    await service.completeOrder('seller-1', UserRole.FARMER, 'order-1', {});
    expect(listingUpdateMany).toHaveBeenCalledWith({ where: { id: 'listing-1', status: 'PUBLISHED', deletedAt: null, quantity: { gte: 2 } }, data: { quantity: { decrement: 2 } } });
    expect(listingUpdate).toHaveBeenCalledWith({ where: { id: 'listing-1' }, data: { status: 'SOLD' } });
  });

  it('decrements linked Inventory stock and writes a stock-out ledger entry when a Marketplace order completes', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-inventory-1', listingId: 'listing-inventory-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'ACCEPTED', quantity: 3, unitPrice: 10 });
    const listingFindUnique = jest.fn().mockResolvedValueOnce({ id: 'listing-inventory-1', resourceType: 'inventoryItem', resourceId: 'inventory-1', quantity: 3, status: 'PUBLISHED' }).mockResolvedValueOnce({ quantity: 0 });
    const listingUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const inventoryFindFirst = jest.fn().mockResolvedValue({ id: 'inventory-1', name: 'Paddy seed', quantityOnHand: 8, reorderLevel: 5, unit: 'kg', farm: { ownerId: 'seller-1' } });
    const inventoryUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const inventoryTransactionCreate = jest.fn().mockResolvedValue({ id: 'inventory-tx-1' });
    prisma.$transaction.mockImplementationOnce((cb: any) => cb({
      marketplaceListing: { findUnique: listingFindUnique, updateMany: listingUpdateMany, update: jest.fn().mockResolvedValue({ id: 'listing-inventory-1', status: 'SOLD' }) },
      inventoryItem: { findFirst: inventoryFindFirst, updateMany: inventoryUpdateMany },
      inventoryTransaction: { create: inventoryTransactionCreate },
      marketplaceOrder: { update: jest.fn().mockResolvedValue({ id: 'order-inventory-1', status: 'COMPLETED' }) },
      notification: { create: jest.fn().mockResolvedValue({ id: 'notification-1' }), createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'notification-1' }) },
    }));
    await service.completeOrder('seller-1', UserRole.FARMER, 'order-inventory-1', {});
    expect(inventoryUpdateMany).toHaveBeenCalledWith({ where: { id: 'inventory-1', deletedAt: null, quantityOnHand: { equals: 8, gte: 3 } }, data: { quantityOnHand: { decrement: 3 } } });
    expect(inventoryTransactionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ inventoryItemId: 'inventory-1', type: 'STOCK_OUT', quantity: 3, quantityBefore: 8, quantityAfter: 5, reference: 'marketplace-order:order-inventory-1' }) });
  });

  it('submits reviews only for completed orders and keeps them pending moderation', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'COMPLETED' });
    const result = await service.createReview('buyer-1', UserRole.FARMER, 'order-1', { rating: 5, comment: 'Good transaction' });
    expect(result).toEqual({ id: 'review-1', status: 'PENDING' });
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({ resource: 'marketplaceOrder', action: 'READ' }));
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE_REVIEW', resourceType: 'marketplaceReview' }));
  });

  it('rejects reviews from non-participants and incomplete orders', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'ACCEPTED' });
    await expect(service.createReview('buyer-1', UserRole.FARMER, 'order-1', { rating: 4 })).rejects.toThrow('completed transactions');
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'COMPLETED' });
    await expect(service.createReview('stranger', UserRole.FARMER, 'order-1', { rating: 4 })).rejects.toThrow('Marketplace order not found.');
  });

  it('rejects ratings outside the 1–5 range', async () => {
    await expect(service.createReview('buyer-1', UserRole.FARMER, 'order-1', { rating: 6 })).rejects.toThrow('integer from 1 to 5');
  });

  it('moderates reviews with audit and refuses ordinary farmers', async () => {
    prisma.marketplaceReview.findUnique.mockResolvedValue({ id: 'review-1', status: 'PENDING' });
    await expect(service.moderateReview('farmer-1', UserRole.FARMER, 'review-1', { status: 'PUBLISHED' })).rejects.toThrow('requires Admin');
    await expect(service.moderateReview('admin-1', UserRole.ADMIN, 'review-1', { status: 'PUBLISHED' })).resolves.toEqual({ id: 'review-1', status: 'PUBLISHED' });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'MODERATE_REVIEW', resourceType: 'marketplaceReview' }));
  });

  it('rejects unsupported marketplace resource types', async () => {
    await expect(service.create('u1', UserRole.FARMER, {
      resourceType: 'unsupported' as any, resourceId: 'x', title: 'X',
    })).rejects.toThrow('Unsupported marketplace resource.');
  });
  it('blocks order creation for an active Marketplace restriction', async () => {
    prisma.marketplaceRestriction.findFirst.mockResolvedValue({ id: 'r1', scope: 'ORDER_CREATE', reason: 'Verified fraud concern', expiresAt: new Date(Date.now() + 86400000) });
    await expect(service.createOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 1 })).rejects.toThrow('Marketplace action is restricted');
    expect(prisma.marketplaceListing.findFirst).not.toHaveBeenCalled();
  });

  it('creates transaction-linked trust reports and derives the counterparty server-side', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', listingId: 'listing-1' });
    await service.createTrustCase('buyer-1', UserRole.FARMER, { type: 'REPORT', category: 'NON_DELIVERY', description: 'Order was not delivered', orderId: 'order-1' } as any);
    expect(prisma.marketplaceTrustCase.create).not.toHaveBeenCalled();
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE_TRUST_CASE', metadata: expect.objectContaining({ targetUserId: 'seller-1' }) }));
  });

  it('requires an order reference for a Marketplace order dispute', async () => {
    await expect(service.createTrustCase('buyer-1', UserRole.FARMER, { type: 'DISPUTE', category: 'NON_DELIVERY', description: 'Order never arrived' } as any)).rejects.toThrow('must reference the related Marketplace order');
  });

  it('opens an order dispute only for a participant after the seller has acted', async () => {
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', listingId: 'listing-1', status: 'PENDING' });
    await expect(service.createTrustCase('buyer-1', UserRole.FARMER, { type: 'DISPUTE', category: 'NON_DELIVERY', description: 'Order never arrived', orderId: 'order-1' } as any)).rejects.toThrow('after the seller has acted');
    prisma.marketplaceOrder.findUnique.mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', listingId: 'listing-1', status: 'COMPLETED' });
    await expect(service.createTrustCase('buyer-1', UserRole.FARMER, { type: 'DISPUTE', category: 'QUALITY', description: 'Goods damaged', orderId: 'order-1' } as any)).resolves.toMatchObject({ id: 'case-1', status: 'OPEN' });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE_TRUST_CASE', description: 'Marketplace order dispute submitted for review', metadata: expect.objectContaining({ type: 'DISPUTE', orderId: 'order-1', targetUserId: 'seller-1' }) }));
  });

  it('allows a permanent Marketplace-wide restriction after a reviewed trust decision', async () => {
    prisma.marketplaceTrustCase.findUnique.mockResolvedValue({ id: 'case-1', type: 'REPORT', targetUserId: 'seller-1', evidenceUrls: [], status: 'OPEN' });
    const caseUpdate = jest.fn().mockResolvedValue({ id: 'case-1', status: 'RESOLVED' });
    const restrictionCreate = jest.fn().mockResolvedValue({ id: 'restriction-1', scope: 'MARKETPLACE_ALL', status: 'ACTIVE', expiresAt: null });
    prisma.$transaction.mockImplementationOnce((callback: any) => callback({
      marketplaceTrustCase: { update: caseUpdate },
      marketplaceRestriction: { create: restrictionCreate },
    }));
    const result = await service.resolveTrustCase('admin-1', UserRole.ADMIN, 'case-1', {
      status: 'RESOLVED',
      resolution: 'Reviewed evidence supports a Marketplace-wide restriction.',
      restrictionUserId: 'seller-1',
      restrictionScope: 'MARKETPLACE_ALL',
    } as any);
    expect(result.restriction).toEqual(expect.objectContaining({ id: 'restriction-1', expiresAt: null }));
    expect(restrictionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: 'seller-1', scope: 'MARKETPLACE_ALL', status: 'ACTIVE', sourceCaseId: 'case-1',
    }) });
    expect(restrictionCreate.mock.calls[0][0].data).not.toHaveProperty('expiresAt');
  });

  it('requires expiry for cautions and narrower Marketplace restrictions', async () => {
    prisma.marketplaceTrustCase.findUnique.mockResolvedValue({ id: 'case-1', type: 'REPORT', targetUserId: 'seller-1', evidenceUrls: [], status: 'OPEN' });
    await expect(service.resolveTrustCase('admin-1', UserRole.ADMIN, 'case-1', {
      status: 'RESOLVED',
      resolution: 'Reviewed concern requires a temporary restriction.',
      restrictionUserId: 'seller-1',
      restrictionScope: 'ORDER_CREATE',
    } as any)).rejects.toThrow('Only a Marketplace-wide blacklist may be permanent');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires Super Admin authority to enable critical payment features', async () => {
    await expect(service.updateFeatureFlag('admin-1', UserRole.ADMIN, 'marketplace.payments', { enabled: true, reason: 'Provider review complete' } as any)).rejects.toThrow('Critical Marketplace features require Super Admin');
  });

  it('prevents disabling listings while dependent order workflow is enabled', async () => {
    await expect(service.updateFeatureFlag('admin-1', UserRole.ADMIN, 'marketplace.listings', { enabled: false, reason: 'Maintenance' } as any)).rejects.toThrow('Disable dependent feature first');
  });

  it('allows a published-review recipient to post an audited response', async () => {
    prisma.marketplaceReview.findUnique.mockResolvedValue({ id: 'review-1', revieweeId: 'seller-1', reviewerId: 'buyer-1', status: 'PUBLISHED' });
    await service.respondToReview('seller-1', UserRole.FARMER, 'review-1', { response: 'Thank you for the feedback.' } as any);
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'RESPOND_REVIEW', resourceType: 'marketplaceReview' }));
  });

  it('blocks quotes for a seller under an active Marketplace-wide restriction', async () => {
    prisma.marketplaceListing.findFirst.mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', quantity: 5, price: 10, currency: 'INR', status: 'PUBLISHED' });
    prisma.marketplaceRestriction.findFirst.mockImplementation(({ where }: any) => where.scope === 'MARKETPLACE_ALL' ? { id: 'restriction-1' } : null);
    await expect(service.quoteOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 1 })).rejects.toThrow('Marketplace listing not found');
  });

  it('reserves tax policy changes for Super Admin/God Mode', async () => {
    await expect(service.updateCommercePolicy('admin-1', UserRole.ADMIN, { taxEnabled: true, taxPercent: 18, taxReviewReference: 'reviewed-policy' } as any)).rejects.toThrow('Tax policy changes require Super Admin');
  });

  it('publishes safe default feature states without enabling payments', async () => {
    const flags = await service.getPublicFeatureFlags();
    expect(flags.find((item: any) => item.key === 'marketplace.listings')?.enabled).toBe(true);
    expect(flags.find((item: any) => item.key === 'marketplace.payments')?.enabled).toBe(false);
    expect(flags.find((item: any) => item.key === 'marketplace.refunds')?.enabled).toBe(false);
  });

});
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';

describe('Marketplace reviewed tax profiles', () => {
  let prisma: any;
  let audit: any;
  let registry: any;
  let service: MarketplaceService;
  beforeEach(() => {
    prisma = {
      marketplaceTaxProfile: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      marketplaceFeatureFlag: { findUnique: jest.fn().mockResolvedValue({ enabled: true }) },
      marketplaceCommercePolicy: { findUnique: jest.fn().mockResolvedValue({ id: 'default', version: 1, feesEnabled: false, buyerFeeBasisPoints: 0, sellerCommissionBasisPoints: 0, taxEnabled: false, taxBasisPoints: 0, taxReviewReference: null, currency: 'INR' }) },
      marketplaceListing: { findFirst: jest.fn().mockResolvedValue({ id: 'listing-1', sellerId: 'seller-1', status: 'PUBLISHED', deletedAt: null, publishedAt: new Date(), price: 10, quantity: 100, minOrderQuantity: null, priceTiers: null, category: 'PRODUCE', currency: 'INR', sellerJurisdictionCode: 'IN-TG' }) },
      marketplaceRestriction: { findFirst: jest.fn().mockResolvedValue(null) },
      marketplaceOrder: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    audit = { createInTransaction: jest.fn().mockResolvedValue(undefined) };
    registry = { validateResourceField: jest.fn((_r: string, _f: string, value: any) => ({ valid: true, value })) };
    prisma.$transaction.mockImplementation((fn: any) => fn({ marketplaceTaxProfile: { create: prisma.marketplaceTaxProfile.create, update: prisma.marketplaceTaxProfile.update } }));
    service = new MarketplaceService(prisma, { assertCan: jest.fn().mockResolvedValue(undefined) } as any, audit, registry);
  });

  it('creates a jurisdiction/category/effective-dated tax profile as draft with no assumed review reference', async () => {
    prisma.marketplaceTaxProfile.create.mockResolvedValue({ id: 'tax-1', status: 'DRAFT', basisPoints: 500, reviewReference: null });
    const result = await service.createTaxProfile('admin-1', UserRole.ADMIN, { sellerJurisdictionCode: 'IN-TG', buyerJurisdictionCode: 'IN-TG', category: 'PRODUCE', taxCode: 'TAX-01', taxName: 'Configured tax', taxPercent: 5, taxBase: 'SUBTOTAL', effectiveFrom: '2026-10-01T00:00:00.000Z' } as any);
    expect(result).toMatchObject({ id: 'tax-1', status: 'DRAFT', reviewReference: null });
    expect(prisma.marketplaceTaxProfile.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sellerJurisdictionCode: 'IN-TG', buyerJurisdictionCode: 'IN-TG', category: 'PRODUCE', basisPoints: 500, status: 'DRAFT', reviewReference: null }) });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE_MARKETPLACE_TAX_PROFILE' }));
  });

  it('requires Super Admin/God Mode and a qualified reference to approve', async () => {
    await expect(service.approveTaxProfile('admin-1', UserRole.ADMIN, 'tax-1', 'review-reference-1')).rejects.toThrow(UnauthorizedException);
    await expect(service.approveTaxProfile('super-1', UserRole.SUPER_ADMIN, 'tax-1', '  ')).rejects.toThrow(BadRequestException);
  });

  it('blocks overlapping approved profiles for the same jurisdictions and category', async () => {
    prisma.marketplaceTaxProfile.findUnique.mockResolvedValue({ id: 'tax-1', status: 'DRAFT', sellerJurisdictionCode: 'IN-TG', buyerJurisdictionCode: 'IN-TG', category: 'PRODUCE', effectiveFrom: new Date('2026-01-01'), effectiveTo: null, version: 1 });
    prisma.marketplaceTaxProfile.findFirst.mockResolvedValue({ id: 'tax-existing' });
    await expect(service.approveTaxProfile('super-1', UserRole.SUPER_ADMIN, 'tax-1', 'qualified-review-reference')).rejects.toThrow('overlaps this jurisdiction/category');
    expect(prisma.marketplaceTaxProfile.update).not.toHaveBeenCalled();
  });

  it('applies only a matched, approved, currently effective profile to a quote', async () => {
    prisma.marketplaceTaxProfile.findFirst.mockResolvedValue({ id: 'tax-1', basisPoints: 500, taxCode: 'TAX-01', taxName: 'Reviewed tax', taxBase: 'SUBTOTAL', reviewReference: 'qualified-review-reference', effectiveFrom: new Date('2026-01-01'), effectiveTo: null });
    const result = await service.quoteOrder('buyer-1', UserRole.FARMER, 'listing-1', { quantity: 2, buyerJurisdictionCode: 'IN-TG' } as any);
    expect(prisma.marketplaceTaxProfile.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ sellerJurisdictionCode: 'IN-TG', buyerJurisdictionCode: 'IN-TG', category: 'PRODUCE', status: 'APPROVED' }), orderBy: { effectiveFrom: 'desc' } });
    expect(result).toMatchObject({ subtotal: '20.00', taxAmount: '1.00', buyerTotal: '21.00', taxStatus: 'CONFIGURED_BY_REVIEW_REFERENCE', taxProfile: { id: 'tax-1', reviewReference: 'qualified-review-reference' } });
  });
});

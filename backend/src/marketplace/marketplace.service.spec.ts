import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  const prisma: any = {
    resourceRelationship: { findFirst: jest.fn() },
    farmAsset: { findFirst: jest.fn(), findUnique: jest.fn() },
    crop: { findFirst: jest.fn(), findUnique: jest.fn() },
    livestock: { findFirst: jest.fn(), findUnique: jest.fn() },
    marketplaceListing: { findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const authorization: any = { assertCan: jest.fn() };
  const audit: any = { createInTransaction: jest.fn() };
  const registry: any = { validateResourceField: jest.fn() };
  let service: MarketplaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketplaceService(prisma, authorization, audit, registry);
    prisma.$transaction.mockImplementation((cb: any) => cb({
      marketplaceListing: { create: jest.fn().mockResolvedValue({ id: 'listing-1', status: 'DRAFT' }), update: jest.fn().mockResolvedValue({ id: 'listing-1' }) },
    }));
    registry.validateResourceField.mockImplementation((_r: string, _f: string, value: any) => ({ valid: true, value }));
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

  it('validates all supplied listing fields through Registry', async () => {
    prisma.resourceRelationship.findFirst.mockResolvedValue({ userId: 'owner-1' });
    prisma.crop.findFirst.mockResolvedValue({ id: 'crop-1' });
    await service.create('owner-1', UserRole.FARMER, {
      resourceType: 'crop', resourceId: 'crop-1', title: 'Crop',
      description: 'Description', quantity: 4, unit: 'kg', price: 12, currency: 'INR',
    });
    expect(registry.validateResourceField).toHaveBeenCalledTimes(8);
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

  it('lists only published non-deleted listings publicly', async () => {
    prisma.marketplaceListing.findMany.mockResolvedValue([{ id: 'published-1' }]);
    await expect(service.findPublished()).resolves.toEqual([{ id: 'published-1' }]);
    expect(prisma.marketplaceListing.findMany).toHaveBeenCalledWith({
      where: { status: 'PUBLISHED', deletedAt: null, publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
    });
  });

  it('lists only active listings owned by the requesting user', async () => {
    prisma.marketplaceListing.findMany.mockResolvedValue([{ id: 'mine-1' }]);
    await expect(service.findMine('seller-1', UserRole.FARMER)).resolves.toEqual([{ id: 'mine-1' }]);
    expect(authorization.assertCan).toHaveBeenCalledWith(expect.objectContaining({
      action: 'READ', ownerId: 'seller-1',
    }));
  });

  it('rejects unsupported marketplace resource types', async () => {
    await expect(service.create('u1', UserRole.FARMER, {
      resourceType: 'unsupported' as any, resourceId: 'x', title: 'X',
    })).rejects.toThrow('Unsupported marketplace resource.');
  });
});
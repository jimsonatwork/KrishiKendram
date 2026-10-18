import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  const farmsService = { findMyFarms: jest.fn() };
  const cropsService = { findMyCrops: jest.fn() };
  const livestockService = { findMine: jest.fn() };
  const inventoryService = { list: jest.fn() };
  const financeService = { list: jest.fn() };
  const marketplaceService = { findMine: jest.fn() };
  const registry = { validateResourceField: jest.fn((_resource: string, _field: string, value: unknown) => ({ valid: true, value, errors: [] })) };

  beforeEach(() => {
    jest.clearAllMocks();
    registry.validateResourceField.mockImplementation((_resource, _field, value) => ({ valid: true, value, errors: [] }));
    farmsService.findMyFarms.mockResolvedValue([
      { id: 'farm-1', name: 'Green Farm', area: 2, unit: 'ACRE' },
      { id: 'farm-2', name: 'Other Farm', area: 4, unit: 'ACRE' },
    ]);
    cropsService.findMyCrops.mockResolvedValue([
      { id: 'crop-1', farmId: 'farm-1', createdAt: new Date('2026-04-01T00:00:00Z') },
      { id: 'crop-2', farmId: 'farm-2', createdAt: new Date('2026-04-01T00:00:00Z') },
    ]);
    livestockService.findMine.mockResolvedValue([{ id: 'animal-1', farmId: 'farm-1', createdAt: new Date('2026-04-02T00:00:00Z') }]);
    inventoryService.list.mockResolvedValue([
      { id: 'item-1', farmId: 'farm-1', quantityOnHand: 1, reorderLevel: 2, createdAt: new Date('2026-04-03T00:00:00Z') },
      { id: 'item-2', farmId: 'farm-2', quantityOnHand: 20, reorderLevel: 2, createdAt: new Date('2026-04-03T00:00:00Z') },
    ]);
    financeService.list.mockResolvedValue([
      { id: 'income-1', farmId: 'farm-1', type: 'INCOME', amount: 1000, currency: 'INR', occurredAt: new Date('2026-04-04T00:00:00Z'), farm: { name: 'Green Farm' } },
      { id: 'expense-1', farmId: 'farm-1', type: 'EXPENSE', amount: 20, currency: 'USD', occurredAt: new Date('2026-04-05T00:00:00Z'), farm: { name: 'Green Farm' } },
      { id: 'income-2', farmId: 'farm-2', type: 'INCOME', amount: 900, currency: 'INR', occurredAt: new Date('2025-04-04T00:00:00Z'), farm: { name: 'Other Farm' } },
    ]);
    marketplaceService.findMine.mockResolvedValue([
      { id: 'listing-1', status: 'PUBLISHED', createdAt: new Date('2026-04-04T00:00:00Z') },
      { id: 'listing-2', status: 'DRAFT', createdAt: new Date('2026-04-04T00:00:00Z') },
    ]);
    service = new ReportsService(farmsService as any, cropsService as any, livestockService as any, inventoryService as any, financeService as any, marketplaceService as any, registry as any);
  });

  it('aggregates only the selected authorized farm, applies inclusive dates and keeps currencies separate', async () => {
    const result = await service.getOverview('user-1', UserRole.FARMER, { farmId: 'farm-1', fromDate: '2026-04-01', toDate: '2026-04-30' });
    expect(result.filters).toEqual({ farmId: 'farm-1', fromDate: '2026-04-01', toDate: '2026-04-30' });
    expect(result.availableFarms).toHaveLength(2);
    expect(result.farms).toHaveLength(1);
    expect(result.farms[0]).toMatchObject({ farmId: 'farm-1', cropRecords: 1, livestockRecords: 1, inventoryItems: 1, lowStockItems: 1 });
    expect(result.totals).toMatchObject({ farmCount: 1, cropRecords: 1, livestockRecords: 1, inventoryItems: 1, lowStockItems: 1, publishedListings: 1 });
    expect(result.totals.financeByCurrency).toEqual([
      { currency: 'INR', income: 1000, expense: 0, net: 1000 },
      { currency: 'USD', income: 0, expense: 20, net: -20 },
    ]);
    expect(result.financialDetails).toHaveLength(2);
    expect(farmsService.findMyFarms).toHaveBeenCalledWith('user-1', UserRole.FARMER);
    expect(registry.validateResourceField).toHaveBeenCalledWith('farmReport', 'farmId', 'farm-1');
  });

  it('rejects a farm outside the current authorized farm list', async () => {
    await expect(service.getOverview('user-1', UserRole.FARMER, { farmId: 'foreign-farm' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects reversed date ranges', async () => {
    await expect(service.getOverview('user-1', UserRole.FARMER, { fromDate: '2026-05-01', toDate: '2026-04-01' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects impossible calendar dates even when the date shape is valid', async () => {
    await expect(service.getOverview('user-1', UserRole.FARMER, { fromDate: '2026-02-31' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns authorized report sections when one optional source is unavailable', async () => {
    marketplaceService.findMine.mockRejectedValue(new Error('listing source unavailable'));
    const result = await service.getOverview('user-1', UserRole.FARMER, {});
    expect(result.totals.cropRecords).toBe(2);
    expect(result.totals.publishedListings).toBe(0);
    expect(result.warnings).toContain('Marketplace listing data could not be loaded; other authorized report sections remain available.');
  });

  it('rejects filters that fail Registry validation', async () => {
    registry.validateResourceField.mockReturnValue({ valid: false, value: undefined, errors: ['Invalid filter'] });
    await expect(service.getOverview('user-1', UserRole.FARMER, { fromDate: '2026-04-01' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

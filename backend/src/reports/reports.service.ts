import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CropsService } from '../crops/crops.service';
import { FarmsService } from '../farms/farms.service';
import { FinanceService } from '../finance/finance.service';
import { InventoryService } from '../inventory/inventory.service';
import { LivestockService } from '../livestock/livestock.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { RegistryService } from '../platform/registry/registry.service';
import { ReportQueryDto } from './dto/report-query.dto';

type CurrencyTotal = { currency: string; income: number; expense: number; net: number };
type DatedRecord = { farmId?: string | null; occurredAt?: Date | string | null; publishedAt?: Date | string | null; createdAt?: Date | string | null; updatedAt?: Date | string | null };

@Injectable()
export class ReportsService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly cropsService: CropsService,
    private readonly livestockService: LivestockService,
    private readonly inventoryService: InventoryService,
    private readonly financeService: FinanceService,
    private readonly marketplaceService: MarketplaceService,
    private readonly registry: RegistryService,
  ) {}

  private validateFilter(field: string, value: unknown): unknown {
    const result = this.registry.validateResourceField('farmReport', field, value);
    if (!result.valid) {
      throw new BadRequestException({ message: 'Invalid report filter: ' + field + '.', errors: result.errors });
    }
    return result.value;
  }

  private recordDay(record: DatedRecord): string | null {
    const value = record.occurredAt || record.publishedAt || record.createdAt || record.updatedAt;
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  private validateCalendarDate(field: string, value?: string): void {
    if (!value) return;
    const parsed = new Date(value + 'T00:00:00.000Z');
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException(field + ' must be a real calendar date in YYYY-MM-DD format.');
    }
  }

  private inRange(record: DatedRecord, fromDate?: string, toDate?: string): boolean {
    if (!fromDate && !toDate) return true;
    const day = this.recordDay(record);
    if (!day) return false;
    return (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
  }

  private currencyTotals(records: Array<{ type: string; amount: unknown; currency?: string | null }>): CurrencyTotal[] {
    const totals = new Map<string, CurrencyTotal>();
    for (const record of records) {
      const currency = String(record.currency || 'INR').trim().toUpperCase() || 'INR';
      const total = totals.get(currency) || { currency, income: 0, expense: 0, net: 0 };
      const amount = Number(record.amount || 0);
      if (!Number.isFinite(amount)) continue;
      if (record.type === 'INCOME') total.income += amount;
      if (record.type === 'EXPENSE') total.expense += amount;
      total.net = total.income - total.expense;
      totals.set(currency, total);
    }
    return Array.from(totals.values()).sort((a, b) => a.currency.localeCompare(b.currency));
  }

  async getOverview(userId: string, role: UserRole, query: ReportQueryDto) {
    const farmId = query.farmId?.trim() || undefined;
    const fromDate = query.fromDate || undefined;
    const toDate = query.toDate || undefined;
    if (farmId) this.validateFilter('farmId', farmId);
    if (fromDate) this.validateFilter('fromDate', fromDate);
    if (toDate) this.validateFilter('toDate', toDate);
    this.validateCalendarDate('fromDate', fromDate);
    this.validateCalendarDate('toDate', toDate);
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('fromDate must be on or before toDate.');
    }

    const sourceResults = await Promise.allSettled([
      this.farmsService.findMyFarms(userId, role),
      this.cropsService.findMyCrops(userId, role),
      this.livestockService.findMine(userId, role),
      this.inventoryService.list(userId, role),
      this.financeService.list(userId, role),
      this.marketplaceService.findMine(userId, role),
    ]);
    const warnings: string[] = [];
    const sourceValue = (index: number, label: string): any[] => {
      const result = sourceResults[index];
      if (result.status === 'fulfilled') return result.value as any[];
      warnings.push(label + ' data could not be loaded; other authorized report sections remain available.');
      return [];
    };
    if (farmId && sourceResults[0].status === 'rejected') {
      throw new ServiceUnavailableException('Unable to verify farm access for the requested report filter.');
    }
    const allFarms = sourceValue(0, 'Farm');
    const allCrops = sourceValue(1, 'Crop');
    const allLivestock = sourceValue(2, 'Livestock');
    const allInventory = sourceValue(3, 'Inventory');
    const allFinance = sourceValue(4, 'Finance');
    const allListings = sourceValue(5, 'Marketplace listing');

    if (farmId && !allFarms.some((farm: any) => farm.id === farmId)) {
      throw new NotFoundException('Farm not found in the current user scope.');
    }
    const availableFarms = allFarms.map((farm: any) => ({ id: farm.id, name: farm.name, area: farm.area ?? null, unit: farm.unit ?? null }));
    const farms = farmId ? allFarms.filter((farm: any) => farm.id === farmId) : allFarms;
    const filterFarm = (records: any[]) => records.filter(record => (!farmId || record.farmId === farmId) && this.inRange(record, fromDate, toDate));
    const crops = filterFarm(allCrops);
    const livestock = filterFarm(allLivestock);
    const inventory = filterFarm(allInventory);
    const finance = filterFarm(allFinance);
    const listings = allListings.filter((listing: any) => this.inRange(listing, fromDate, toDate));
    const financeByCurrency = this.currencyTotals(finance);
    const farmSummaries = farms.map((farm: any) => {
      const farmCrops = crops.filter((record: any) => record.farmId === farm.id);
      const farmLivestock = livestock.filter((record: any) => record.farmId === farm.id);
      const farmInventory = inventory.filter((record: any) => record.farmId === farm.id);
      const farmFinance = finance.filter((record: any) => record.farmId === farm.id);
      return {
        farmId: farm.id,
        name: farm.name,
        area: farm.area ?? null,
        unit: farm.unit ?? null,
        cropRecords: farmCrops.length,
        livestockRecords: farmLivestock.length,
        inventoryItems: farmInventory.length,
        lowStockItems: farmInventory.filter((item: any) => Number(item.quantityOnHand || 0) <= Number(item.reorderLevel || 0)).length,
        financeByCurrency: this.currencyTotals(farmFinance),
      };
    });
    const lowStockItems = inventory.filter((item: any) => Number(item.quantityOnHand || 0) <= Number(item.reorderLevel || 0));
    const financialDetails = finance.map((record: any) => ({
      id: record.id,
      farmId: record.farmId,
      farmName: record.farm?.name || farms.find((farm: any) => farm.id === record.farmId)?.name || 'Farm',
      type: record.type,
      category: record.category || '',
      amount: Number(record.amount || 0),
      currency: String(record.currency || 'INR').toUpperCase(),
      occurredAt: record.occurredAt ? new Date(record.occurredAt).toISOString() : null,
      reference: record.reference || '',
      notes: record.notes || '',
    }));

    return {
      generatedAt: new Date().toISOString(),
      filters: { farmId: farmId || null, fromDate: fromDate || null, toDate: toDate || null },
      availableFarms,
      totals: {
        farmCount: farms.length,
        cropRecords: crops.length,
        livestockRecords: livestock.length,
        inventoryItems: inventory.length,
        lowStockItems: lowStockItems.length,
        listingCount: listings.length,
        publishedListings: listings.filter((listing: any) => listing.status === 'PUBLISHED').length,
        financeByCurrency,
      },
      farms: farmSummaries,
      financialDetails,
      warnings,
      notes: {
        financialTotals: 'Amounts are grouped by currency; no foreign-exchange conversion is applied.',
        marketplaceListings: 'Listing totals are for the current seller and are not attributed to a farm unless a listing has an explicit farm relationship.',
        source: 'Aggregated from existing authorized module services; report generation is read-only.',
      },
    };
  }
}

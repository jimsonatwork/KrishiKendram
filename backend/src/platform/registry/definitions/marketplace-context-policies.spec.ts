import { missingMarketplaceContextFields, resolveMarketplaceContextPolicy } from './marketplace-context-policies';

describe('Marketplace context policies', () => {
  it('requires crop and location for agricultural input guidance', () => {
    const policy = resolveMarketplaceContextPolicy({ category: 'FARM_INPUTS', title: 'Neem Fertilizer', offeringType: 'PRODUCT' });
    expect(policy?.key).toBe('AGRI_INPUT_USAGE');
    expect(missingMarketplaceContextFields(policy!, {})).toEqual(['intendedCrop', 'region']);
    expect(missingMarketplaceContextFields(policy!, { intendedCrop: 'Paddy', region: 'Warangal' })).toEqual([]);
  });

  it('applies seed context even when the title is generic', () => {
    expect(resolveMarketplaceContextPolicy({ category: 'SEEDS', title: 'Hybrid seed pack', offeringType: 'PRODUCT' })?.key).toBe('AGRI_INPUT_USAGE');
  });

  it('does not force agricultural context for unrelated products or services', () => {
    expect(resolveMarketplaceContextPolicy({ category: 'EQUIPMENT', title: 'Hand sprayer', offeringType: 'PRODUCT' })).toBeNull();
    expect(resolveMarketplaceContextPolicy({ category: 'FARM_INPUTS', title: 'Soil consultation', offeringType: 'SERVICE' })).toBeNull();
  });

  it('never interprets a non-product listing as an agricultural input purchase', () => {
    expect(resolveMarketplaceContextPolicy({ category: 'FARM_INPUTS', title: 'Fertilizer training session', offeringType: 'KNOWLEDGE' })).toBeNull();
  });

  it('requires dates and use location for rentals without affecting ordinary products', () => {
    const policy = resolveMarketplaceContextPolicy({ category: 'EQUIPMENT', title: 'Tractor rental', offeringType: 'RENTAL' });
    expect(policy?.key).toBe('RENTAL_BOOKING');
    expect(missingMarketplaceContextFields(policy!, {})).toEqual(['startDate', 'endDate', 'useLocation']);
    expect(missingMarketplaceContextFields(policy!, { startDate: '2026-11-01', endDate: '2026-11-03', useLocation: 'Warangal' })).toEqual([]);
    expect(resolveMarketplaceContextPolicy({ category: 'EQUIPMENT', title: 'Tractor sale', offeringType: 'PRODUCT' })).toBeNull();
  });

  it('asks for a preferred date and time for bookings', () => {
    const policy = resolveMarketplaceContextPolicy({ title: 'Veterinary appointment', offeringType: 'BOOKING' });
    expect(policy?.key).toBe('BOOKING_REQUEST');
    expect(missingMarketplaceContextFields(policy!, { preferredDate: '2026-11-02' })).toEqual(['preferredTime']);
  });

  it('requires route and cargo details for logistics quotes', () => {
    const policy = resolveMarketplaceContextPolicy({ title: 'Cold-chain transport', offeringType: 'LOGISTICS' });
    expect(policy?.key).toBe('LOGISTICS_QUOTE');
    expect(missingMarketplaceContextFields(policy!, { originRegion: 'Guntur' })).toEqual(['destinationRegion', 'cargoDescription']);
  });

  it('recognizes the current INPUTS category for agricultural products', () => {
    expect(resolveMarketplaceContextPolicy({ category: 'INPUTS', title: 'Pest control pesticide', offeringType: 'PRODUCT' })?.key).toBe('AGRI_INPUT_USAGE');
  });
});

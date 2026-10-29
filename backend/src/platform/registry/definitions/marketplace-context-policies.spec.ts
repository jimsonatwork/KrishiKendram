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
});

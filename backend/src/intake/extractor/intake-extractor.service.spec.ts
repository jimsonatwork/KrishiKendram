import { IntakeExtractorService } from './intake-extractor.service';

describe('IntakeExtractorService', () => {
  const service = new IntakeExtractorService();

  it('extracts mango planting and a spoken number-word area', async () => {
    await expect(service.extract('I have planted mango plants across one acre of my farm')).resolves.toMatchObject({
      category: 'PLANTING',
      crop: { name: 'Mango' },
      activity: { type: 'PLANTING', area: 1, unit: 'acre' },
    });
  });

  it('extracts a numeric area while preserving the existing unit wording', async () => {
    await expect(service.extract('I planted rice across 2 acres')).resolves.toMatchObject({
      category: 'PLANTING',
      crop: { name: 'Rice' },
      activity: { type: 'PLANTING', area: 2, unit: 'acres' },
    });
  });

  it('recognizes an explicit crop-registration request and extracts its area', async () => {
    await expect(service.extract('register a crop with two acres of paddy')).resolves.toMatchObject({
      category: 'PLANTING',
      crop: { name: 'Paddy' },
      activity: { type: 'PLANTING', area: 2, unit: 'acres' },
    });
  });

  it('does not treat a rice question as a planting event', async () => {
    await expect(service.extract('How is rice doing in this weather?')).resolves.toMatchObject({
      category: 'GENERAL',
    });
  });

  it('does not turn an ordinary crop question into a planting record', async () => {
    await expect(service.extract('How should I grow mango in my region?')).resolves.toMatchObject({
      category: 'GENERAL',
    });
  });

  it('does not misclassify a plant-disease question as a planting record', async () => {
    await expect(service.extract('What plant disease affects mango?')).resolves.toMatchObject({
      category: 'GENERAL',
    });
  });

  it('recognizes additional common crops only with a planting verb', async () => {
    await expect(service.extract('I am sowing maize on three hectares')).resolves.toMatchObject({
      category: 'PLANTING',
      crop: { name: 'Maize' },
      activity: { type: 'PLANTING', area: 3, unit: 'hectares' },
    });
  });

  it('preserves two acres, five-week crop age and NPK when ASR mishears acres as acers', async () => {
    const result = await service.extract('create a paddy crop for 2 acers of land sown last five weeks now using NPK fertilizer');
    expect(result).toMatchObject({
      category: 'PLANTING',
      crop: { name: 'Paddy' },
      activity: { type: 'PLANTING', area: 2, unit: 'acres', fertilizer: 'NPK' },
    });
    expect(result.activity?.sowingDate).toBeDefined();
    const age = Date.now() - new Date(result.activity!.sowingDate!).getTime();
    expect(age).toBeGreaterThanOrEqual(34 * 86400000);
    expect(age).toBeLessThanOrEqual(36 * 86400000);
  });

  it('preserves an explicit unknown sowing date instead of inventing today', async () => {
    await expect(service.extract('I planted paddy on two acres. Sowing date unknown.')).resolves.toMatchObject({
      category: 'PLANTING',
      activity: { area: 2, unit: 'acres', sowingDateUnknown: true },
    });
  });
});

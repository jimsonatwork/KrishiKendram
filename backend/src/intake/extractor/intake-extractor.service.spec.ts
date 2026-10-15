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
});

import { buildAtplaceFilename, buildBootstrapPattern, yearToWords } from './bootstrap-pattern';

describe('bootstrap pattern', () => {
  it('builds the requested September 2026 pattern', () => {
    expect(buildBootstrapPattern(new Date(2026, 8, 29))).toBe('JjKk29SEPbertwentytwentysix');
  });

  it('builds a rotating SVG atplace filename', () => {
    const filename = buildAtplaceFilename();
    expect(filename).toMatch(/^JjKk__\d+\.svg$/);
  });

  it('converts common years to concatenated English words', () => {
    expect(yearToWords(2026)).toBe('twentytwentysix');
    expect(yearToWords(2000)).toBe('twentytwenty');
    expect(yearToWords(1999)).toBe('nineteenhundredninetynine');
  });
});

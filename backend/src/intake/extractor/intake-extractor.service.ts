import { Injectable } from '@nestjs/common';
import { CROP_TERMINOLOGY } from '../../ai/registry/crop-terminology';

export interface IntakeExtraction {
  raw: string;
  category: string;

  crop?: {
    name: string;
  };

  livestock?: {
    type: string;
  };

  expense?: {
    item: string;
  };

  equipment?: {
    name: string;
  };

  activity?: {
    type: string;
    area?: number;
    unit?: string;
  };
}

@Injectable()
export class IntakeExtractorService {

  async extract(content: string): Promise<IntakeExtraction> {
    const text = content.toLowerCase();

    const result: IntakeExtraction = {
      raw: content,
      category: 'GENERAL',
    };

    /*
     * Crop / planting detection.
     * Every recognized crop requires a planting verb or explicit imperative
     * crop action so ordinary crop questions do not become farm records.
     */
    const cropCatalogue = CROP_TERMINOLOGY.crops;
    const plantingVerbPattern = new RegExp(
      '\\b(' + CROP_TERMINOLOGY.plantingVerbs.join('|') + ')\\b',
      'i',
    );
    const plantingVerb = plantingVerbPattern.test(text) ||
      new RegExp('^\\s*' + CROP_TERMINOLOGY.imperativeCropAction + '\\s+').test(text);
    const registrationVerb = new RegExp(
      '\\b(' + CROP_TERMINOLOGY.cropRegistrationVerbs.join('|') + ')\\b',
      'i',
    ).test(text) && /\b(crop|planting|field)\b/i.test(text);
    const matchedCrop = cropCatalogue.find((crop) =>
      crop.aliases.some((alias) =>
        new RegExp('\\b' + alias.replace(/ /g, '\\s+') + '\\b', 'i').test(text),
      ),
    );
    if (matchedCrop && (plantingVerb || registrationVerb)) {
      result.category = 'PLANTING';
      result.crop = { name: matchedCrop.name };
    }

    /*
     * Livestock detection
     */
    if (text.includes('cow') || text.includes('cattle')) {
      result.category = 'LIVESTOCK';

      result.livestock = {
        type: 'CATTLE',
      };
    }

    /*
     * Expense detection
     */
    if (text.includes('fertilizer') || text.includes('urea')) {
      result.category = 'EXPENSE';

      result.expense = {
        item: text.includes('urea') ? 'Urea' : 'Fertilizer',
      };
    }

    /*
     * Equipment detection
     */
    if (text.includes('tractor')) {
      result.equipment = {
        name: 'Tractor',
      };
    }

    /*
     * Simple planting activity extraction
     */
    if (result.category === 'PLANTING') {
      result.activity = {
        type: 'PLANTING',
      };

      const numberWords = Object.keys(CROP_TERMINOLOGY.numberWords).join('|');
      const areaUnits = CROP_TERMINOLOGY.areaUnits.join('|');
      const areaMatch = text.match(
        new RegExp('\\b(\\d+(?:\\.\\d+)?|' + numberWords + ')\\s*(' + areaUnits + ')\\b', 'i'),
      );

      if (areaMatch) {
        const amount = areaMatch[1].toLowerCase();
        result.activity.area = CROP_TERMINOLOGY.numberWords[
          amount as keyof typeof CROP_TERMINOLOGY.numberWords
        ] ?? Number(amount);
        result.activity.unit = areaMatch[2].toLowerCase();
      }
    }

    return result;
  }
}

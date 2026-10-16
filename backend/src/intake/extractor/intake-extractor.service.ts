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
    /** ISO timestamp derived from an explicit user-provided relative planting date. */
    sowingDate?: string;
    /** User-reported fertilizer context; never treated as a separate expense when part of planting intake. */
    fertilizer?: string;
    /** Explicitly records that the farmer does not know the sowing date; never replace it with today. */
    sowingDateUnknown?: boolean;
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
    if ((text.includes('fertilizer') || text.includes('urea')) && result.category !== 'PLANTING') {
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
      // Accept common speech-recognition misspellings of acre(s).
      const areaUnits = [...CROP_TERMINOLOGY.areaUnits, 'acer', 'acers'].join('|');
      const areaMatch = text.match(
        new RegExp('\\b(\\d+(?:\\.\\d+)?|' + numberWords + ')\\s*(' + areaUnits + ')\\b', 'i'),
      );

      if (areaMatch) {
        const amount = areaMatch[1].toLowerCase();
        result.activity.area = CROP_TERMINOLOGY.numberWords[
          amount as keyof typeof CROP_TERMINOLOGY.numberWords
        ] ?? Number(amount);
        const matchedUnit = areaMatch[2].toLowerCase();
        result.activity.unit = matchedUnit.startsWith('acer')
          ? (result.activity.area === 1 ? 'acre' : 'acres')
          : matchedUnit;
      }
      if (/\b(?:sowing date|planting date)\s+(?:is\s+)?unknown\b|\b(?:i\s+)?(?:do not know|don't know|dont know)\s+(?:the\s+)?(?:sowing|planting)?\s*date\b/i.test(text)) {
        result.activity.sowingDateUnknown = true;
      } else if (/\btoday\b/i.test(text) && /\b(sown|sowed|planted|planting|sowing|transplanted)\b/i.test(text)) {
        result.activity.sowingDate = new Date().toISOString();
      } else if (/\byesterday\b/i.test(text) && /\b(sown|sowed|planted|planting|sowing|transplanted)\b/i.test(text)) {
        result.activity.sowingDate = new Date(Date.now() - 86400000).toISOString();
      } else {
        const durationMatch = text.match(/\b(?:last|past|about|around)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(weeks?|days?)\s*(?:ago|back|now)?\b/i);
        if (durationMatch && /\b(last|past|ago|back|sown|sowed|planted|planting|sowing|transplanted)\b/i.test(text)) {
          const rawAmount = durationMatch[1].toLowerCase();
          const amount = Number(rawAmount) || CROP_TERMINOLOGY.numberWords[rawAmount as keyof typeof CROP_TERMINOLOGY.numberWords] || 0;
          const unit = durationMatch[2].toLowerCase();
          if (amount > 0 && amount <= 730) {
            const elapsedDays = unit.startsWith('week') ? amount * 7 : amount;
            result.activity.sowingDate = new Date(Date.now() - elapsedDays * 86400000).toISOString();
          }
        }
      }
      if (text.includes('npk')) result.activity.fertilizer = 'NPK';
      else if (text.includes('fertilizer')) result.activity.fertilizer = 'Unspecified fertilizer';
    }

    return result;
  }
}

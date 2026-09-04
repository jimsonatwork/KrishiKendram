import { Injectable } from '@nestjs/common';

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
     * Crop / planting detection
     */
    if (text.includes('rice') || text.includes('paddy')) {
      result.category = 'PLANTING';

      result.crop = {
        name: text.includes('rice') ? 'Rice' : 'Paddy',
      };
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

      const areaMatch = text.match(
        /(\d+(?:\.\d+)?)\s*(acre|acres|hectare|hectares)/,
      );

      if (areaMatch) {
        result.activity.area = Number(areaMatch[1]);
        result.activity.unit = areaMatch[2];
      }
    }

    return result;
  }
}

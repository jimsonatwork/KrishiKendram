import { Injectable } from '@nestjs/common';

@Injectable()
export class IntakeExtractorService {

  async extract(content: string) {

    const text = content.toLowerCase();

    const result: any = {
      raw: content,
    };

    if (text.includes('rice') || text.includes('paddy')) {
      result.category = 'PLANTING';
      result.crop = text.includes('rice') ? 'Rice' : 'Paddy';
    }

    if (text.includes('cow') || text.includes('cattle')) {
      result.category = 'LIVESTOCK';
    }

    if (text.includes('fertilizer') || text.includes('urea')) {
      result.category = 'EXPENSE';
    }

    return result;
  }
}

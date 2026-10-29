export type MarketplaceOfferingType =
  | 'PRODUCT' | 'DIGITAL' | 'SERVICE' | 'RENTAL' | 'BOOKING' | 'SUBSCRIPTION'
  | 'RFQ' | 'PUBLIC_SERVICE' | 'KNOWLEDGE' | 'DONATION' | 'JOB' | 'LOGISTICS';

export type MarketplaceContextField = {
  key: string;
  label: string;
  prompt: string;
  required: boolean;
  type: 'text' | 'number';
  reason: string;
};

export type MarketplaceContextPolicy = {
  key: string;
  version: number;
  title: string;
  purpose: string;
  blockingAction: 'ORDER_CREATE' | 'ADVICE_ONLY' | 'BOOKING_CREATE';
  requiredFields: MarketplaceContextField[];
  recommendedFields: MarketplaceContextField[];
  noAdviceUntilComplete: boolean;
};

export const MARKETPLACE_OFFERING_TYPES: readonly MarketplaceOfferingType[] = [
  'PRODUCT', 'DIGITAL', 'SERVICE', 'RENTAL', 'BOOKING', 'SUBSCRIPTION',
  'RFQ', 'PUBLIC_SERVICE', 'KNOWLEDGE', 'DONATION', 'JOB', 'LOGISTICS',
];

export const MARKETPLACE_CONTEXT_POLICIES: Readonly<Record<string, MarketplaceContextPolicy>> = {
  AGRI_INPUT_USAGE: {
    key: 'AGRI_INPUT_USAGE',
    version: 1,
    title: 'Help us tailor safe agricultural product guidance',
    purpose: 'The crop and growing context helps KK and the seller provide relevant use instructions and follow-up support.',
    blockingAction: 'ORDER_CREATE',
    noAdviceUntilComplete: true,
    requiredFields: [
      { key: 'intendedCrop', label: 'Intended crop', prompt: 'Which crop will you use this product for?', required: true, type: 'text', reason: 'Usage guidance depends on the crop.' },
      { key: 'region', label: 'Farm or use location', prompt: 'Which village, town or district will it be used in?', required: true, type: 'text', reason: 'Recommendations can vary by local conditions.' },
    ],
    recommendedFields: [
      { key: 'area', label: 'Area', prompt: 'How much area will you use it on?', required: false, type: 'number', reason: 'Helps estimate quantities; use your preferred unit in the next field.' },
      { key: 'areaUnit', label: 'Area unit', prompt: 'Which area unit do you use (acre, hectare, etc.)?', required: false, type: 'text', reason: 'Prevents unit assumptions.' },
      { key: 'growthStage', label: 'Crop stage', prompt: 'Is the crop not planted yet, newly planted, growing, flowering or ready for harvest?', required: false, type: 'text', reason: 'Application timing can matter.' },
      { key: 'purpose', label: 'What do you want to address?', prompt: 'What are you trying to improve or treat?', required: false, type: 'text', reason: 'Helps distinguish nutrition, pest, disease and other needs.' },
    ],
  },
};

const AGRI_INPUT_TERMS = /\b(fertili[sz]er|seed(?:s)?|pesticide|insecticide|herbicide|fungicide|micronutrient|biofertili[sz]er|soil amendment|plant nutrient|crop nutrient)\b/i;

export function resolveMarketplaceContextPolicy(input: {
  category?: string | null;
  title?: string | null;
  description?: string | null;
  offeringType?: string | null;
}): MarketplaceContextPolicy | null {
  const category = String(input.category || '').toUpperCase();
  const text = [input.title, input.description].filter(Boolean).join(' ');
  if (input.offeringType === 'PRODUCT' && (
    category === 'SEEDS' ||
    (category === 'FARM_INPUTS' && AGRI_INPUT_TERMS.test(text)) ||
    AGRI_INPUT_TERMS.test(text)
  )) return MARKETPLACE_CONTEXT_POLICIES.AGRI_INPUT_USAGE;
  return null;
}

export function missingMarketplaceContextFields(
  policy: MarketplaceContextPolicy,
  answers: Record<string, unknown> | undefined,
): string[] {
  return policy.requiredFields
    .filter((field) => typeof answers?.[field.key] !== 'string' || !(answers[field.key] as string).trim())
    .map((field) => field.key);
}

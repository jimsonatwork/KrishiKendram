export type MarketplaceOfferingType =
  | 'PRODUCT' | 'DIGITAL' | 'SERVICE' | 'RENTAL' | 'BOOKING' | 'SUBSCRIPTION'
  | 'RFQ' | 'PUBLIC_SERVICE' | 'KNOWLEDGE' | 'DONATION' | 'JOB' | 'LOGISTICS';

export type MarketplaceContextField = {
  key: string;
  label: string;
  prompt: string;
  required: boolean;
  type: 'text' | 'number' | 'date';
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
      { key: 'region', label: 'Use location', prompt: 'Which village, town or district will it be used in?', required: true, type: 'text', reason: 'Recommendations can vary by local conditions.' },
    ],
    recommendedFields: [
      { key: 'area', label: 'Area', prompt: 'How much area will you use it on?', required: false, type: 'number', reason: 'Helps estimate quantities; use your preferred unit in the next field.' },
      { key: 'areaUnit', label: 'Area unit', prompt: 'Which area unit do you use (acre, hectare, etc.)?', required: false, type: 'text', reason: 'Prevents unit assumptions.' },
      { key: 'growthStage', label: 'Crop stage', prompt: 'Is the crop not planted yet, newly planted, growing, flowering or ready for harvest?', required: false, type: 'text', reason: 'Application timing can matter.' },
      { key: 'purpose', label: 'Intended purpose', prompt: 'What are you trying to improve or treat?', required: false, type: 'text', reason: 'Helps distinguish nutrition, pest, disease and other needs.' },
    ],
  },
  RENTAL_BOOKING: {
    key: 'RENTAL_BOOKING',
    version: 1,
    title: 'Tell the provider when and where you need the rental',
    purpose: 'Rental dates and use location help the provider confirm availability, delivery and the right price.',
    blockingAction: 'ORDER_CREATE',
    noAdviceUntilComplete: false,
    requiredFields: [
      { key: 'startDate', label: 'Rental start date', prompt: 'When should the rental start?', required: true, type: 'date', reason: 'The provider needs the start date to check availability.' },
      { key: 'endDate', label: 'Rental end date', prompt: 'When should the rental end?', required: true, type: 'date', reason: 'The provider needs the full rental period to quote accurately.' },
      { key: 'useLocation', label: 'Use location', prompt: 'Village, town or district where the rental will be used', required: true, type: 'text', reason: 'Availability and delivery depend on location.' },
    ],
    recommendedFields: [
      { key: 'usePurpose', label: 'Intended use', prompt: 'What will you use the rented item for?', required: false, type: 'text', reason: 'Helps the provider confirm suitability.' },
    ],
  },
  BOOKING_REQUEST: {
    key: 'BOOKING_REQUEST',
    version: 1,
    title: 'Share your preferred booking time',
    purpose: 'The provider can respond with availability without asking you to repeat the request.',
    blockingAction: 'ORDER_CREATE',
    noAdviceUntilComplete: false,
    requiredFields: [
      { key: 'preferredDate', label: 'Preferred date', prompt: 'Which date works best for you?', required: true, type: 'date', reason: 'A booking needs a requested date.' },
      { key: 'preferredTime', label: 'Preferred time or time window', prompt: 'Morning, afternoon, evening or a preferred time', required: true, type: 'text', reason: 'Helps the provider check schedule availability.' },
    ],
    recommendedFields: [
      { key: 'region', label: 'Location / region', prompt: 'Village, town or district (if relevant)', required: false, type: 'text', reason: 'Useful for onsite appointments and visits.' },
      { key: 'attendeeCount', label: 'People / units', prompt: 'How many people or units should be included?', required: false, type: 'number', reason: 'Helps reserve the correct capacity.' },
    ],
  },
  LOGISTICS_QUOTE: {
    key: 'LOGISTICS_QUOTE',
    version: 1,
    title: 'Add the route and load details',
    purpose: 'Origin, destination and cargo details let the provider prepare a meaningful logistics quote.',
    blockingAction: 'ORDER_CREATE',
    noAdviceUntilComplete: false,
    requiredFields: [
      { key: 'originRegion', label: 'Pickup location', prompt: 'Village, town, district or pickup point', required: true, type: 'text', reason: 'A route needs an origin.' },
      { key: 'destinationRegion', label: 'Delivery location', prompt: 'Village, town, district or destination point', required: true, type: 'text', reason: 'A route needs a destination.' },
      { key: 'cargoDescription', label: 'Cargo / load details', prompt: 'What needs to be transported or stored?', required: true, type: 'text', reason: 'The provider needs to understand the load.' },
    ],
    recommendedFields: [
      { key: 'targetDate', label: 'Target date', prompt: 'When is pickup or service needed?', required: false, type: 'date', reason: 'Availability and rates may depend on the date.' },
      { key: 'estimatedWeight', label: 'Estimated weight', prompt: 'Estimated weight (optional)', required: false, type: 'number', reason: 'Helps estimate capacity and price.' },
      { key: 'weightUnit', label: 'Weight unit', prompt: 'kg, tonne, bags or another unit', required: false, type: 'text', reason: 'Prevents assumptions about load units.' },
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
  const offeringType = String(input.offeringType || 'PRODUCT').toUpperCase();
  const text = [input.title, input.description].filter(Boolean).join(' ');

  if (offeringType === 'RENTAL') return MARKETPLACE_CONTEXT_POLICIES.RENTAL_BOOKING;
  if (offeringType === 'BOOKING') return MARKETPLACE_CONTEXT_POLICIES.BOOKING_REQUEST;
  if (offeringType === 'LOGISTICS') return MARKETPLACE_CONTEXT_POLICIES.LOGISTICS_QUOTE;

  if (offeringType === 'PRODUCT' && (
    category === 'SEEDS' ||
    ((category === 'FARM_INPUTS' || category === 'INPUTS') && AGRI_INPUT_TERMS.test(text)) ||
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

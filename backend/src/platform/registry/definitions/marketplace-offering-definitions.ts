import { FieldDefinition } from '../field-definition.interface';

export type MarketplaceOfferingInputType = 'text' | 'number' | 'boolean' | 'date' | 'url' | 'enum';

export interface MarketplaceOfferingField {
  key: string;
  label: string;
  type: MarketplaceOfferingInputType;
  registryField: string;
  required?: boolean;
  options?: readonly string[];
  placeholder?: string;
  help?: string;
}

export interface MarketplaceOfferingDefinition {
  type: string;
  label: string;
  description: string;
  fields: readonly MarketplaceOfferingField[];
}

const field = (
  key: string,
  label: string,
  type: MarketplaceOfferingInputType,
  registryField: string,
  options?: readonly string[],
  required = false,
  placeholder?: string,
  help?: string,
): MarketplaceOfferingField => ({ key, label, type, registryField, ...(options ? { options } : {}), required, ...(placeholder ? { placeholder } : {}), ...(help ? { help } : {}) });

export const MARKETPLACE_OFFERING_DEFINITIONS: readonly MarketplaceOfferingDefinition[] = [
  {
    type: 'PRODUCT', label: 'Physical product', description: 'Goods, farm produce, inputs, equipment and other tangible items.',
    fields: [
      field('condition', 'Item condition', 'enum', 'marketplaceOfferingProductCondition', ['NEW', 'USED', 'REFURBISHED']),
      field('brand', 'Brand / maker', 'text', 'marketplaceOfferingProductBrand', undefined, false, 'Brand or maker'),
      field('originRegion', 'Origin region', 'text', 'marketplaceOfferingProductOriginRegion', undefined, false, 'Village, district or state'),
    ],
  },
  {
    type: 'DIGITAL', label: 'Digital product', description: 'Digital files, guides, software, subscriptions or streamed content.',
    fields: [
      field('deliveryMethod', 'Digital delivery method', 'enum', 'marketplaceOfferingDigitalDeliveryMethod', ['DOWNLOAD', 'EMAIL', 'PORTAL', 'STREAMING'], true),
      field('format', 'File / content format', 'text', 'marketplaceOfferingDigitalFormat', undefined, false, 'PDF, video, spreadsheet…'),
      field('accessDays', 'Access duration (days)', 'number', 'marketplaceOfferingDigitalAccessDays', undefined, false, 'Leave blank for no expiry'),
    ],
  },
  {
    type: 'SERVICE', label: 'Service', description: 'Professional, agricultural, repair, advisory or field services.',
    fields: [
      field('serviceMode', 'Service delivery mode', 'enum', 'marketplaceOfferingServiceMode', ['ONSITE', 'REMOTE', 'HYBRID'], true),
      field('serviceArea', 'Service area', 'text', 'marketplaceOfferingServiceArea', undefined, false, 'Area / districts served'),
      field('durationMinutes', 'Typical duration (minutes)', 'number', 'marketplaceOfferingServiceDurationMinutes', undefined, false, 'Estimated duration'),
    ],
  },
  {
    type: 'RENTAL', label: 'Rental', description: 'Equipment, land, storage or other assets offered for a defined period.',
    fields: [
      field('rentalUnit', 'Rental unit', 'enum', 'marketplaceOfferingRentalUnit', ['HOUR', 'DAY', 'ACRE', 'SEASON'], true),
      field('depositAmount', 'Refundable deposit (INR)', 'number', 'marketplaceOfferingRentalDepositAmount', undefined, false, '0 if no deposit'),
      field('minimumDuration', 'Minimum duration (units)', 'number', 'marketplaceOfferingRentalMinimumDuration', undefined, false, 'Minimum rental period'),
    ],
  },
  {
    type: 'BOOKING', label: 'Booking', description: 'Appointments, sessions, visits, events or scheduled capacity.',
    fields: [
      field('bookingMode', 'Booking mode', 'enum', 'marketplaceOfferingBookingMode', ['ONSITE', 'REMOTE', 'HYBRID'], true),
      field('availableFrom', 'Available from', 'date', 'marketplaceOfferingBookingAvailableFrom'),
      field('availableUntil', 'Available until', 'date', 'marketplaceOfferingBookingAvailableUntil'),
      field('capacity', 'Capacity per slot', 'number', 'marketplaceOfferingBookingCapacity', undefined, false, 'People / units per slot'),
    ],
  },
  {
    type: 'SUBSCRIPTION', label: 'Subscription', description: 'Recurring supplies, services, memberships or access.',
    fields: [
      field('billingInterval', 'Billing interval', 'enum', 'marketplaceOfferingSubscriptionBillingInterval', ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], true),
      field('includedUses', 'Included uses per interval', 'number', 'marketplaceOfferingSubscriptionIncludedUses', undefined, false, 'Visits, deliveries or uses'),
      field('cancellationTerms', 'Cancellation terms', 'text', 'marketplaceOfferingSubscriptionCancellationTerms', undefined, false, 'Explain notice / refund terms'),
    ],
  },
  {
    type: 'RFQ', label: 'Request for quotation', description: 'Request supplier quotes before committing to a purchase.',
    fields: [
      field('responseDeadline', 'Quote response deadline', 'date', 'marketplaceOfferingRfqResponseDeadline'),
      field('deliveryRegion', 'Delivery region', 'text', 'marketplaceOfferingRfqDeliveryRegion', undefined, false, 'Required delivery location'),
      field('minimumSupplierCount', 'Desired number of quotes', 'number', 'marketplaceOfferingRfqMinimumSupplierCount', undefined, false, 'How many supplier responses to seek'),
    ],
  },
  {
    type: 'PUBLIC_SERVICE', label: 'Public service', description: 'Government, FPO, institutional or community service information.',
    fields: [
      field('agencyName', 'Issuing agency / institution', 'text', 'marketplaceOfferingPublicAgencyName', undefined, true, 'Official institution name'),
      field('officialReference', 'Official reference number', 'text', 'marketplaceOfferingPublicOfficialReference', undefined, false, 'Notice / scheme reference'),
      field('officialUrl', 'Official information URL', 'url', 'marketplaceOfferingPublicOfficialUrl', undefined, false, 'https://…'),
      field('eligibilitySummary', 'Eligibility summary', 'text', 'marketplaceOfferingPublicEligibilitySummary', undefined, false, 'Who can apply / use it'),
    ],
  },
  {
    type: 'KNOWLEDGE', label: 'Knowledge / learning', description: 'Training, agronomy guidance, educational content or consultation.',
    fields: [
      field('contentFormat', 'Content format', 'enum', 'marketplaceOfferingKnowledgeFormat', ['ARTICLE', 'VIDEO', 'COURSE', 'WEBINAR', 'CONSULTATION', 'DOCUMENT'], true),
      field('language', 'Language', 'text', 'marketplaceOfferingKnowledgeLanguage', undefined, false, 'Language(s) offered'),
      field('durationMinutes', 'Duration (minutes)', 'number', 'marketplaceOfferingKnowledgeDurationMinutes', undefined, false, 'Approximate learning time'),
      field('certificateAvailable', 'Certificate available', 'boolean', 'marketplaceOfferingKnowledgeCertificateAvailable'),
    ],
  },
  {
    type: 'DONATION', label: 'Donation / community support', description: 'Donations, shared resources, relief or community support offers.',
    fields: [
      field('beneficiaryType', 'Beneficiary type', 'enum', 'marketplaceOfferingDonationBeneficiaryType', ['INDIVIDUAL', 'FARMER_GROUP', 'NGO', 'COMMUNITY', 'OTHER'], true),
      field('intendedUse', 'Intended use', 'text', 'marketplaceOfferingDonationIntendedUse', undefined, true, 'How the support will be used'),
      field('deliveryMethod', 'Delivery method', 'enum', 'marketplaceOfferingDonationDeliveryMethod', ['PICKUP', 'DELIVERY', 'DIGITAL', 'VOLUNTEER'], true),
    ],
  },
  {
    type: 'JOB', label: 'Job / work opportunity', description: 'Agricultural work, seasonal roles, contracts or project opportunities.',
    fields: [
      field('engagementType', 'Engagement type', 'enum', 'marketplaceOfferingJobEngagementType', ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'SEASONAL', 'VOLUNTEER', 'PROJECT'], true),
      field('workMode', 'Work mode', 'enum', 'marketplaceOfferingJobWorkMode', ['ONSITE', 'REMOTE', 'HYBRID'], true),
      field('closingAt', 'Application closing date', 'date', 'marketplaceOfferingJobClosingAt'),
      field('experienceYears', 'Experience required (years)', 'number', 'marketplaceOfferingJobExperienceYears', undefined, false, '0 for entry-level'),
      field('skills', 'Required skills', 'text', 'marketplaceOfferingJobSkills', undefined, false, 'Skills / qualifications'),
    ],
  },
  {
    type: 'LOGISTICS', label: 'Logistics / transport', description: 'Freight, cold chain, warehousing, delivery or agricultural transport.',
    fields: [
      field('transportMode', 'Transport / service mode', 'enum', 'marketplaceOfferingLogisticsTransportMode', ['ROAD', 'RAIL', 'AIR', 'COLD_CHAIN', 'WAREHOUSING', 'OTHER'], true),
      field('serviceArea', 'Service area', 'text', 'marketplaceOfferingLogisticsServiceArea', undefined, true, 'Routes / districts covered'),
      field('capacityDescription', 'Capacity / load details', 'text', 'marketplaceOfferingLogisticsCapacity', undefined, false, 'Vehicle, weight, volume or storage'),
      field('deliveryLeadTimeHours', 'Lead time (hours)', 'number', 'marketplaceOfferingLogisticsLeadTimeHours', undefined, false, 'Estimated time'),
    ],
  },
];

const fixedText = (name: string, maxLength: number, required = false, pattern?: string): FieldDefinition => ({
  name, type: 'string', description: name, validation: { required, maxLength, ...(pattern ? { pattern } : {}) },
  normalization: { trim: true }, overrideMode: 'FIXED',
});
const fixedEnum = (name: string, enumValues: readonly string[], required = false): FieldDefinition => ({
  name, type: 'enum', description: name, validation: { required, enumValues }, overrideMode: 'FIXED',
});
const fixedNumber = (name: string, min: number, max?: number): FieldDefinition => ({
  name, type: 'number', description: name, validation: { required: false, min, ...(max !== undefined ? { max } : {}) }, overrideMode: 'FIXED',
});
const fixedDate = (name: string): FieldDefinition => ({ name, type: 'date', description: name, validation: { required: false }, overrideMode: 'FIXED' });
const fixedBoolean = (name: string): FieldDefinition => ({ name, type: 'boolean', description: name, validation: { required: false }, overrideMode: 'FIXED' });

export const MARKETPLACE_OFFERING_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  fixedEnum('marketplaceOfferingProductCondition', ['NEW', 'USED', 'REFURBISHED']),
  fixedText('marketplaceOfferingProductBrand', 100),
  fixedText('marketplaceOfferingProductOriginRegion', 120),
  fixedEnum('marketplaceOfferingDigitalDeliveryMethod', ['DOWNLOAD', 'EMAIL', 'PORTAL', 'STREAMING'], true),
  fixedText('marketplaceOfferingDigitalFormat', 100),
  fixedNumber('marketplaceOfferingDigitalAccessDays', 1, 36500),
  fixedEnum('marketplaceOfferingServiceMode', ['ONSITE', 'REMOTE', 'HYBRID'], true),
  fixedText('marketplaceOfferingServiceArea', 160),
  fixedNumber('marketplaceOfferingServiceDurationMinutes', 1, 100000),
  fixedEnum('marketplaceOfferingRentalUnit', ['HOUR', 'DAY', 'ACRE', 'SEASON'], true),
  fixedNumber('marketplaceOfferingRentalDepositAmount', 0, 1000000000),
  fixedNumber('marketplaceOfferingRentalMinimumDuration', 1, 100000),
  fixedEnum('marketplaceOfferingBookingMode', ['ONSITE', 'REMOTE', 'HYBRID'], true),
  fixedDate('marketplaceOfferingBookingAvailableFrom'),
  fixedDate('marketplaceOfferingBookingAvailableUntil'),
  fixedNumber('marketplaceOfferingBookingCapacity', 1, 1000000),
  fixedEnum('marketplaceOfferingSubscriptionBillingInterval', ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], true),
  fixedNumber('marketplaceOfferingSubscriptionIncludedUses', 1, 1000000),
  fixedText('marketplaceOfferingSubscriptionCancellationTerms', 1000),
  fixedDate('marketplaceOfferingRfqResponseDeadline'),
  fixedText('marketplaceOfferingRfqDeliveryRegion', 160),
  fixedNumber('marketplaceOfferingRfqMinimumSupplierCount', 1, 1000),
  fixedText('marketplaceOfferingPublicAgencyName', 200, true),
  fixedText('marketplaceOfferingPublicOfficialReference', 160),
  fixedText('marketplaceOfferingPublicOfficialUrl', 2048, false, '^https?://[^\\\\s]+$'),
  fixedText('marketplaceOfferingPublicEligibilitySummary', 2000),
  fixedEnum('marketplaceOfferingKnowledgeFormat', ['ARTICLE', 'VIDEO', 'COURSE', 'WEBINAR', 'CONSULTATION', 'DOCUMENT'], true),
  fixedText('marketplaceOfferingKnowledgeLanguage', 120),
  fixedNumber('marketplaceOfferingKnowledgeDurationMinutes', 1, 100000),
  fixedBoolean('marketplaceOfferingKnowledgeCertificateAvailable'),
  fixedEnum('marketplaceOfferingDonationBeneficiaryType', ['INDIVIDUAL', 'FARMER_GROUP', 'NGO', 'COMMUNITY', 'OTHER'], true),
  fixedText('marketplaceOfferingDonationIntendedUse', 1000, true),
  fixedEnum('marketplaceOfferingDonationDeliveryMethod', ['PICKUP', 'DELIVERY', 'DIGITAL', 'VOLUNTEER'], true),
  fixedEnum('marketplaceOfferingJobEngagementType', ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'SEASONAL', 'VOLUNTEER', 'PROJECT'], true),
  fixedEnum('marketplaceOfferingJobWorkMode', ['ONSITE', 'REMOTE', 'HYBRID'], true),
  fixedDate('marketplaceOfferingJobClosingAt'),
  fixedNumber('marketplaceOfferingJobExperienceYears', 0, 100),
  fixedText('marketplaceOfferingJobSkills', 2000),
  fixedEnum('marketplaceOfferingLogisticsTransportMode', ['ROAD', 'RAIL', 'AIR', 'COLD_CHAIN', 'WAREHOUSING', 'OTHER'], true),
  fixedText('marketplaceOfferingLogisticsServiceArea', 200, true),
  fixedText('marketplaceOfferingLogisticsCapacity', 1000),
  fixedNumber('marketplaceOfferingLogisticsLeadTimeHours', 0, 100000),
];

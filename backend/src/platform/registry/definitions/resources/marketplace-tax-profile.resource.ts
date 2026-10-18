import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

export const marketplaceTaxProfileResource: ResourceDefinition = {
  name: 'marketplaceTaxProfile',
  module: 'marketplace',
  model: 'MarketplaceTaxProfile',
  ownerField: 'createdById',
  fields: {
    sellerJurisdictionCode: { definition: 'marketplaceTaxProfileSellerJurisdictionCode' },
    buyerJurisdictionCode: { definition: 'marketplaceTaxProfileBuyerJurisdictionCode' },
    category: { definition: 'marketplaceListingCategory' },
    taxCode: { definition: 'marketplaceTaxProfileTaxCode' },
    taxName: { definition: 'marketplaceTaxProfileTaxName' },
    taxBase: { definition: 'marketplaceTaxProfileTaxBase' },
    basisPoints: { definition: 'marketplaceTaxProfileBasisPoints' },
    reviewReference: { definition: 'marketplaceTaxProfileReviewReference' },
    status: { definition: 'marketplaceTaxProfileStatus' },
  },
  searchableFields: ['taxCode', 'taxName', 'category'],
  sortableFields: ['effectiveFrom', 'createdAt', 'updatedAt'],
  defaultSort: 'effectiveFrom:desc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.CREATE, AuthorizationAction.UPDATE].map(action => ({ action, scopes: [AuthorizationScope.OWN, AuthorizationScope.GLOBAL] })),
  permissions: ['READ', 'CREATE', 'UPDATE'],
  scopes: ['OWN', 'GLOBAL'],
  features: ['versioned', 'audited'],
  softDelete: false,
};

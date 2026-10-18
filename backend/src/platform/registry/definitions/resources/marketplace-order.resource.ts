import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

export const marketplaceOrderResource: ResourceDefinition = {
  name: 'marketplaceOrder',
  module: 'marketplace',
  model: 'MarketplaceOrder',
  ownerField: 'buyerId',
  fields: {
    listingId: { definition: 'marketplaceResourceId' },
    quantity: { definition: 'marketplaceListingQuantity' },
    unitPrice: { definition: 'marketplaceListingPrice' },
    offerPrice: { definition: 'marketplaceOrderOfferPrice' },
    buyerJurisdictionCode: { definition: 'marketplaceOrderBuyerJurisdictionCode' },
    agreedUnitPrice: { definition: 'marketplaceListingPrice' },
    currency: { definition: 'marketplaceListingCurrency' },
    note: { definition: 'marketplaceListingDescription' },
    sellerNote: { definition: 'marketplaceListingDescription' },
    deliveryStatus: { definition: 'marketplaceShipmentStatus' },
    deliveryCarrier: { definition: 'marketplaceShipmentCarrier' },
    deliveryTrackingNumber: { definition: 'marketplaceShipmentTrackingNumber' },
    deliveryTrackingUrl: { definition: 'marketplaceShipmentTrackingUrl' },
    status: { definition: 'marketplaceResourceType' },
  },
  searchableFields: ['status', 'listingId'],
  sortableFields: ['createdAt', 'updatedAt', 'status'],
  defaultSort: 'createdAt:desc',
  capabilities: [AuthorizationAction.READ, AuthorizationAction.CREATE, AuthorizationAction.UPDATE].map((action) => ({
    action,
    scopes: [AuthorizationScope.OWN, AuthorizationScope.GLOBAL],
  })),
  permissions: ['READ', 'CREATE', 'UPDATE'],
  scopes: ['OWN', 'GLOBAL'],
  features: ['buyer-seller-lifecycle', 'audit-history'],
};

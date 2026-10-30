import { ResourceDefinition } from '../../resource-definition.interface';

import { auditResource } from './audit.resource';
import { cropResource } from './crop.resource';
import { conversationResource } from './conversation.resource';
import { livestockResource } from './livestock.resource';
import { marketplaceListingResource } from './marketplace-listing.resource';
import { marketplaceRFQResponseResource } from './marketplace-rfq-response.resource';
import { marketplaceRFQResource } from './marketplace-rfq.resource';
import { marketplaceMessageResource } from './marketplace-message.resource';
import { marketplaceListingQuestionResource } from './marketplace-listing-question.resource';
import { marketplaceFavoriteResource } from './marketplace-favorite.resource';
import { marketplaceSellerProfileResource } from './marketplace-seller-profile.resource';
import { marketplaceOrderResource } from './marketplace-order.resource';
import { marketplaceFeatureFlagResource } from './marketplace-feature-flag.resource';
import { marketplaceTrustCaseResource } from './marketplace-trust-case.resource';
import { marketplaceRestrictionResource } from './marketplace-restriction.resource';
import { marketplaceTaxProfileResource } from './marketplace-tax-profile.resource';
import { marketplaceChargebackResource } from './marketplace-chargeback.resource';
import { inventoryItemResource } from './inventory-item.resource';
import { financialRecordResource } from './financial-record.resource';
import { farmReportResource } from './farm-report.resource';
import { notificationResource } from './notification.resource';
import { livestockRecordResource } from './livestock-record.resource';
import { farmAssetResource } from './farm-asset.resource';
import { farmRecordResource } from './farm-record.resource';
import { farmResource } from './farm.resource';
import { permissionResource } from './permission.resource';
import { userResource } from './user.resource';

export const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
  userResource,
  permissionResource,
  conversationResource,
  auditResource,
  farmResource,
  cropResource,
  livestockResource,
  marketplaceListingResource,
  marketplaceRFQResponseResource,
  marketplaceRFQResource,
  marketplaceMessageResource,
  marketplaceListingQuestionResource,
  marketplaceFavoriteResource,
  marketplaceSellerProfileResource,
  marketplaceOrderResource,
  marketplaceFeatureFlagResource,
  marketplaceTrustCaseResource,
  marketplaceRestrictionResource,
  marketplaceTaxProfileResource,
  marketplaceChargebackResource,
  inventoryItemResource,
  financialRecordResource,
  farmReportResource,
  notificationResource,
  livestockRecordResource,
  farmAssetResource,
  farmRecordResource,
];

export {
  auditResource,
  cropResource,
  livestockResource,
  marketplaceListingResource,
  marketplaceRFQResponseResource,
  marketplaceRFQResource,
  marketplaceMessageResource,
  marketplaceListingQuestionResource,
  marketplaceFavoriteResource,
  marketplaceSellerProfileResource,
  marketplaceOrderResource,
  marketplaceFeatureFlagResource,
  marketplaceTrustCaseResource,
  marketplaceRestrictionResource,
  marketplaceTaxProfileResource,
  marketplaceChargebackResource,
  inventoryItemResource,
  financialRecordResource,
  farmReportResource,
  notificationResource,
  livestockRecordResource,
  farmAssetResource,
  farmRecordResource,
  farmResource,
  userResource,
  permissionResource,
  conversationResource,
};

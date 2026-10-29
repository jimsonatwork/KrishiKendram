CREATE TABLE "MarketplaceBuyerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "buyerType" TEXT NOT NULL DEFAULT 'FARMER',
  "purchasePurpose" TEXT NOT NULL DEFAULT 'FARMING',
  "businessName" TEXT,
  "regionLabel" TEXT,
  "operationScale" TEXT,
  "cropInterests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "moduleTargets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "crossModuleConsent" BOOLEAN NOT NULL DEFAULT false,
  "consentAt" TIMESTAMP(3),
  "consentRevokedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceBuyerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketplaceBuyerProfile_userId_key" ON "MarketplaceBuyerProfile"("userId");
CREATE INDEX "MarketplaceBuyerProfile_buyerType_purchasePurpose_idx" ON "MarketplaceBuyerProfile"("buyerType", "purchasePurpose");
CREATE INDEX "MarketplaceBuyerProfile_crossModuleConsent_updatedAt_idx" ON "MarketplaceBuyerProfile"("crossModuleConsent", "updatedAt");
ALTER TABLE "MarketplaceBuyerProfile" ADD CONSTRAINT "MarketplaceBuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MarketplaceListingViewEvent" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceListingViewEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketplaceListingViewEvent_listingId_viewedAt_idx" ON "MarketplaceListingViewEvent"("listingId", "viewedAt");
ALTER TABLE "MarketplaceListingViewEvent" ADD CONSTRAINT "MarketplaceListingViewEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketplaceListing" ADD COLUMN "videoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MarketplaceListing" ADD COLUMN "externalLinks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MarketplaceOrder" ADD COLUMN "offerPrice" DOUBLE PRECISION;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "agreedUnitPrice" DOUBLE PRECISION;

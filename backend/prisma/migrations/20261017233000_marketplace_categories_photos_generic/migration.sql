-- Marketplace listings may be generic seller-owned offers or linked farm resources.
ALTER TABLE "MarketplaceListing" ALTER COLUMN "resourceType" DROP NOT NULL;
ALTER TABLE "MarketplaceListing" ALTER COLUMN "resourceId" DROP NOT NULL;
ALTER TABLE "MarketplaceListing" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER';
ALTER TABLE "MarketplaceListing" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "MarketplaceListing_category_status_publishedAt_idx" ON "MarketplaceListing"("category", "status", "publishedAt");

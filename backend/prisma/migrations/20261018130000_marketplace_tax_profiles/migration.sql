ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "sellerJurisdictionCode" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "buyerJurisdictionCode" TEXT;
CREATE TABLE IF NOT EXISTS "MarketplaceTaxProfile" (
  "id" TEXT NOT NULL,
  "sellerJurisdictionCode" TEXT NOT NULL,
  "buyerJurisdictionCode" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "taxCode" TEXT NOT NULL,
  "taxName" TEXT NOT NULL,
  "taxBase" TEXT NOT NULL DEFAULT 'SUBTOTAL',
  "basisPoints" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "reviewReference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceTaxProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceTaxProfile_sellerJurisdictionCode_buyerJurisdictionCode_category_effectiveFrom_key" ON "MarketplaceTaxProfile"("sellerJurisdictionCode", "buyerJurisdictionCode", "category", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "MarketplaceTaxProfile_status_effectiveFrom_effectiveTo_idx" ON "MarketplaceTaxProfile"("status", "effectiveFrom", "effectiveTo");
CREATE INDEX IF NOT EXISTS "MarketplaceTaxProfile_sellerJurisdictionCode_buyerJurisdictionCode_category_status_idx" ON "MarketplaceTaxProfile"("sellerJurisdictionCode", "buyerJurisdictionCode", "category", "status");

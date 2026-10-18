CREATE TABLE "MarketplaceCommercePolicy" (
  "id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "feesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "buyerFeeBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "sellerCommissionBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
  "taxBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "taxReviewReference" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceCommercePolicy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketplaceCommercePolicy_updatedAt_idx" ON "MarketplaceCommercePolicy"("updatedAt");
ALTER TABLE "MarketplaceOrder" ADD COLUMN "subtotal" DECIMAL(14,2), ADD COLUMN "buyerFeeAmount" DECIMAL(14,2), ADD COLUMN "sellerCommissionAmount" DECIMAL(14,2), ADD COLUMN "taxAmount" DECIMAL(14,2), ADD COLUMN "buyerTotal" DECIMAL(14,2), ADD COLUMN "sellerNet" DECIMAL(14,2), ADD COLUMN "pricingPolicyVersion" INTEGER, ADD COLUMN "pricingSnapshot" JSONB;

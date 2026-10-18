CREATE TABLE "MarketplaceReview" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "revieweeId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sellerResponse" TEXT,
  "moderatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketplaceReview_orderId_reviewerId_key" ON "MarketplaceReview"("orderId", "reviewerId");
CREATE INDEX "MarketplaceReview_revieweeId_status_createdAt_idx" ON "MarketplaceReview"("revieweeId", "status", "createdAt");
CREATE INDEX "MarketplaceReview_orderId_status_idx" ON "MarketplaceReview"("orderId", "status");
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

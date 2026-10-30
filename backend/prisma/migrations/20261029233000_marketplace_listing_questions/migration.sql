CREATE TABLE "MarketplaceListingQuestion" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "askerId" TEXT NOT NULL,
  "answeredById" TEXT,
  "questionType" TEXT NOT NULL DEFAULT 'PRODUCT_QUESTION',
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceListingQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketplaceListingQuestion_listingId_visibility_status_createdAt_idx" ON "MarketplaceListingQuestion"("listingId", "visibility", "status", "createdAt");
CREATE INDEX "MarketplaceListingQuestion_askerId_createdAt_idx" ON "MarketplaceListingQuestion"("askerId", "createdAt");
CREATE INDEX "MarketplaceListingQuestion_answeredById_answeredAt_idx" ON "MarketplaceListingQuestion"("answeredById", "answeredAt");
ALTER TABLE "MarketplaceListingQuestion" ADD CONSTRAINT "MarketplaceListingQuestion_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListingQuestion" ADD CONSTRAINT "MarketplaceListingQuestion_askerId_fkey" FOREIGN KEY ("askerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListingQuestion" ADD CONSTRAINT "MarketplaceListingQuestion_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

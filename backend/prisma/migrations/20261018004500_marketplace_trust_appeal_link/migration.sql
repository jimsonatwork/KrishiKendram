ALTER TABLE "MarketplaceTrustCase" ADD COLUMN "parentCaseId" TEXT;
CREATE INDEX "MarketplaceTrustCase_parentCaseId_idx" ON "MarketplaceTrustCase"("parentCaseId");
ALTER TABLE "MarketplaceTrustCase" ADD CONSTRAINT "MarketplaceTrustCase_parentCaseId_fkey" FOREIGN KEY ("parentCaseId") REFERENCES "MarketplaceTrustCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

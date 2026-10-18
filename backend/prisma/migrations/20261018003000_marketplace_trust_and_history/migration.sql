CREATE TABLE "MarketplaceTrustCase" (
  "id" TEXT NOT NULL, "caseNumber" TEXT NOT NULL, "reporterId" TEXT NOT NULL, "targetUserId" TEXT, "listingId" TEXT, "orderId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'REPORT', "category" TEXT NOT NULL, "description" TEXT NOT NULL, "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'OPEN', "resolution" TEXT, "assignedToId" TEXT, "resolvedById" TEXT, "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceTrustCase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketplaceTrustCase_caseNumber_key" ON "MarketplaceTrustCase"("caseNumber");
CREATE INDEX "MarketplaceTrustCase_reporterId_createdAt_idx" ON "MarketplaceTrustCase"("reporterId", "createdAt");
CREATE INDEX "MarketplaceTrustCase_targetUserId_status_createdAt_idx" ON "MarketplaceTrustCase"("targetUserId", "status", "createdAt");
CREATE INDEX "MarketplaceTrustCase_status_createdAt_idx" ON "MarketplaceTrustCase"("status", "createdAt");
CREATE INDEX "MarketplaceTrustCase_listingId_idx" ON "MarketplaceTrustCase"("listingId");
CREATE INDEX "MarketplaceTrustCase_orderId_idx" ON "MarketplaceTrustCase"("orderId");
CREATE TABLE "MarketplaceRestriction" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "scope" TEXT NOT NULL DEFAULT 'MARKETPLACE_ALL', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "reason" TEXT NOT NULL,
  "evidence" JSONB, "cautionRating" INTEGER, "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT, "createdById" TEXT NOT NULL, "sourceCaseId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceRestriction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketplaceRestriction_userId_scope_status_expiresAt_idx" ON "MarketplaceRestriction"("userId", "scope", "status", "expiresAt");
CREATE INDEX "MarketplaceRestriction_sourceCaseId_idx" ON "MarketplaceRestriction"("sourceCaseId");
CREATE INDEX "MarketplaceRestriction_createdById_createdAt_idx" ON "MarketplaceRestriction"("createdById", "createdAt");
ALTER TABLE "MarketplaceTrustCase" ADD CONSTRAINT "MarketplaceTrustCase_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceTrustCase" ADD CONSTRAINT "MarketplaceTrustCase_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceRestriction" ADD CONSTRAINT "MarketplaceRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

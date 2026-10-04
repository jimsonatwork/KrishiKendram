-- DropIndex
DROP INDEX "Crop_farmId_idx";

-- DropIndex
DROP INDEX "Livestock_farmId_idx";

-- DropIndex
DROP INDEX "MarketplaceListing_sellerId_status_idx";

-- DropIndex
DROP INDEX "ResourceTransferRequest_destinationUserId_status_idx";

-- CreateIndex
CREATE INDEX "Crop_farmId_deletedAt_createdAt_idx" ON "Crop"("farmId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Farm_ownerId_deletedAt_createdAt_idx" ON "Farm"("ownerId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "FarmAsset_farmId_createdAt_idx" ON "FarmAsset"("farmId", "createdAt");

-- CreateIndex
CREATE INDEX "FarmRecord_farmId_createdAt_idx" ON "FarmRecord"("farmId", "createdAt");

-- CreateIndex
CREATE INDEX "Livestock_farmId_deletedAt_createdAt_idx" ON "Livestock"("farmId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_sellerId_deletedAt_createdAt_idx" ON "MarketplaceListing"("sellerId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceTransferRequest_destinationUserId_status_requestedA_idx" ON "ResourceTransferRequest"("destinationUserId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "ResourceTransferRequest_sourceUserId_status_requestedAt_idx" ON "ResourceTransferRequest"("sourceUserId", "status", "requestedAt");

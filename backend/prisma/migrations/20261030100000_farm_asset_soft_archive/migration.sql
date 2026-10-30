-- Preserve FarmAsset history and enable reversible archive/restore.
ALTER TABLE "FarmAsset" ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "FarmAsset_farmId_createdAt_idx";
CREATE INDEX "FarmAsset_farmId_deletedAt_createdAt_idx"
  ON "FarmAsset"("farmId", "deletedAt", "createdAt");

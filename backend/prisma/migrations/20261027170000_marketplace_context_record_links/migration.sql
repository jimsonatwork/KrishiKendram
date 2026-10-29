ALTER TABLE "MarketplaceOrder"
  ADD COLUMN "contextFarmId" TEXT,
  ADD COLUMN "contextCropId" TEXT;

CREATE INDEX "MarketplaceOrder_contextFarmId_idx" ON "MarketplaceOrder"("contextFarmId");
CREATE INDEX "MarketplaceOrder_contextCropId_idx" ON "MarketplaceOrder"("contextCropId");

ALTER TABLE "MarketplaceOrder"
  ADD CONSTRAINT "MarketplaceOrder_contextFarmId_fkey"
  FOREIGN KEY ("contextFarmId") REFERENCES "Farm"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MarketplaceOrder"
  ADD CONSTRAINT "MarketplaceOrder_contextCropId_fkey"
  FOREIGN KEY ("contextCropId") REFERENCES "Crop"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

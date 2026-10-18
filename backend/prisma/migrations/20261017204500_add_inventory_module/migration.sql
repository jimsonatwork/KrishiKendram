CREATE TYPE "InventoryTransactionType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT');
CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantityOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "supplier" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryTransaction" (
  "id" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "type" "InventoryTransactionType" NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "quantityBefore" DOUBLE PRECISION NOT NULL,
  "quantityAfter" DOUBLE PRECISION NOT NULL,
  "unitCost" DOUBLE PRECISION,
  "reference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryItem_farmId_deletedAt_name_idx" ON "InventoryItem"("farmId", "deletedAt", "name");
CREATE INDEX "InventoryItem_category_deletedAt_idx" ON "InventoryItem"("category", "deletedAt");
CREATE INDEX "InventoryTransaction_inventoryItemId_createdAt_idx" ON "InventoryTransaction"("inventoryItemId", "createdAt");
CREATE INDEX "InventoryTransaction_actorId_createdAt_idx" ON "InventoryTransaction"("actorId", "createdAt");
CREATE INDEX "InventoryTransaction_type_createdAt_idx" ON "InventoryTransaction"("type", "createdAt");
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

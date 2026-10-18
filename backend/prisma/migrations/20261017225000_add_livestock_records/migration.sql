CREATE TYPE "LivestockRecordType" AS ENUM ('HEALTH', 'VACCINATION', 'TREATMENT', 'MILK_PRODUCTION', 'EGG_PRODUCTION', 'WEIGHT', 'BREEDING', 'FEEDING', 'OTHER');
CREATE TABLE "LivestockRecord" (
  "id" TEXT NOT NULL,
  "livestockId" TEXT NOT NULL,
  "type" "LivestockRecordType" NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION,
  "unit" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextDueAt" TIMESTAMP(3),
  "reference" TEXT,
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LivestockRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LivestockRecord_livestockId_recordedAt_idx" ON "LivestockRecord"("livestockId", "recordedAt");
CREATE INDEX "LivestockRecord_livestockId_type_recordedAt_idx" ON "LivestockRecord"("livestockId", "type", "recordedAt");
CREATE INDEX "LivestockRecord_nextDueAt_idx" ON "LivestockRecord"("nextDueAt");
CREATE INDEX "LivestockRecord_createdBy_createdAt_idx" ON "LivestockRecord"("createdBy", "createdAt");
ALTER TABLE "LivestockRecord" ADD CONSTRAINT "LivestockRecord_livestockId_fkey" FOREIGN KEY ("livestockId") REFERENCES "Livestock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LivestockRecord" ADD CONSTRAINT "LivestockRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

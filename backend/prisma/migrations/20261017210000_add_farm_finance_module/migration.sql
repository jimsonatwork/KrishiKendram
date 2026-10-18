CREATE TYPE "FinancialRecordType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TABLE "FarmFinancialRecord" (
  "id" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "type" "FinancialRecordType" NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reference" TEXT,
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "FarmFinancialRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FarmFinancialRecord_farmId_deletedAt_occurredAt_idx" ON "FarmFinancialRecord"("farmId", "deletedAt", "occurredAt");
CREATE INDEX "FarmFinancialRecord_farmId_type_occurredAt_idx" ON "FarmFinancialRecord"("farmId", "type", "occurredAt");
CREATE INDEX "FarmFinancialRecord_category_occurredAt_idx" ON "FarmFinancialRecord"("category", "occurredAt");
CREATE INDEX "FarmFinancialRecord_createdBy_createdAt_idx" ON "FarmFinancialRecord"("createdBy", "createdAt");
ALTER TABLE "FarmFinancialRecord" ADD CONSTRAINT "FarmFinancialRecord_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmFinancialRecord" ADD CONSTRAINT "FarmFinancialRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

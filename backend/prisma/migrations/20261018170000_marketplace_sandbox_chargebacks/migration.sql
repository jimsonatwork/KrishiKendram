CREATE TABLE "MarketplaceChargeback" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "providerChargebackId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "evidenceDeadline" TIMESTAMP(3) NOT NULL,
  "externalEventId" TEXT,
  "outcomeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceChargeback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketplaceChargeback_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "MarketplacePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MarketplaceChargeback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
ALTER TABLE "MarketplaceLedgerEntry" ADD COLUMN "chargebackId" TEXT;
ALTER TABLE "MarketplaceLedgerEntry" ADD CONSTRAINT "MarketplaceLedgerEntry_chargebackId_fkey" FOREIGN KEY ("chargebackId") REFERENCES "MarketplaceChargeback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "MarketplaceChargeback_idempotencyKey_key" ON "MarketplaceChargeback"("idempotencyKey");
CREATE UNIQUE INDEX "MarketplaceChargeback_providerChargebackId_key" ON "MarketplaceChargeback"("providerChargebackId");
CREATE INDEX "MarketplaceChargeback_paymentId_status_createdAt_idx" ON "MarketplaceChargeback"("paymentId", "status", "createdAt");
CREATE INDEX "MarketplaceChargeback_orderId_status_createdAt_idx" ON "MarketplaceChargeback"("orderId", "status", "createdAt");
CREATE INDEX "MarketplaceLedgerEntry_chargebackId_idx" ON "MarketplaceLedgerEntry"("chargebackId");

CREATE TABLE "MarketplaceRefund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "providerRefundId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "externalEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceRefund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketplaceRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "MarketplacePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MarketplaceRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
ALTER TABLE "MarketplaceLedgerEntry" ADD COLUMN "refundId" TEXT;
ALTER TABLE "MarketplaceLedgerEntry" ADD CONSTRAINT "MarketplaceLedgerEntry_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "MarketplaceRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "MarketplaceRefund_idempotencyKey_key" ON "MarketplaceRefund"("idempotencyKey");
CREATE UNIQUE INDEX "MarketplaceRefund_providerRefundId_key" ON "MarketplaceRefund"("providerRefundId");
CREATE INDEX "MarketplaceRefund_paymentId_status_createdAt_idx" ON "MarketplaceRefund"("paymentId", "status", "createdAt");
CREATE INDEX "MarketplaceRefund_orderId_createdAt_idx" ON "MarketplaceRefund"("orderId", "createdAt");
CREATE INDEX "MarketplaceLedgerEntry_refundId_idx" ON "MarketplaceLedgerEntry"("refundId");

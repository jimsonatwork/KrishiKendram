CREATE TABLE "MarketplacePaymentEvent" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplacePaymentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketplacePaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "MarketplacePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MarketplacePaymentEvent_provider_externalEventId_key" ON "MarketplacePaymentEvent"("provider", "externalEventId");
CREATE INDEX "MarketplacePaymentEvent_paymentId_receivedAt_idx" ON "MarketplacePaymentEvent"("paymentId", "receivedAt");

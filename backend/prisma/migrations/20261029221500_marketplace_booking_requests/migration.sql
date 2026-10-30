CREATE TABLE "MarketplaceBookingRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "preferredDate" TIMESTAMP(3),
  "preferredTime" TEXT,
  "useLocation" TEXT,
  "details" JSONB,
  "confirmedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceBookingRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketplaceBookingRequest_orderId_key" ON "MarketplaceBookingRequest"("orderId");
CREATE INDEX "MarketplaceBookingRequest_listingId_kind_status_startDate_endDate_idx" ON "MarketplaceBookingRequest"("listingId", "kind", "status", "startDate", "endDate");
CREATE INDEX "MarketplaceBookingRequest_status_createdAt_idx" ON "MarketplaceBookingRequest"("status", "createdAt");
ALTER TABLE "MarketplaceBookingRequest" ADD CONSTRAINT "MarketplaceBookingRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBookingRequest" ADD CONSTRAINT "MarketplaceBookingRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

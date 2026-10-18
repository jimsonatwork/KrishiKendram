ALTER TABLE "MarketplaceOrder" ADD COLUMN "deliveryStatus" TEXT, ADD COLUMN "deliveryCarrier" TEXT, ADD COLUMN "deliveryTrackingNumber" TEXT, ADD COLUMN "deliveryTrackingUrl" TEXT, ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3), ADD COLUMN "dispatchedAt" TIMESTAMP(3), ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE INDEX "MarketplaceOrder_deliveryStatus_idx" ON "MarketplaceOrder"("deliveryStatus");

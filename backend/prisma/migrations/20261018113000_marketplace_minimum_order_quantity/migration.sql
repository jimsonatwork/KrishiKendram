ALTER TABLE "MarketplaceListing" ADD COLUMN "minOrderQuantity" DOUBLE PRECISION;
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_minOrderQuantity_positive_check" CHECK ("minOrderQuantity" IS NULL OR "minOrderQuantity" > 0);

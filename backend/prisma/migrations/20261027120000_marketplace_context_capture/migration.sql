ALTER TABLE "MarketplaceListing"
  ADD COLUMN "offeringType" TEXT NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN "sourceModule" TEXT,
  ADD COLUMN "sourceEntityId" TEXT,
  ADD COLUMN "contextPolicyKey" TEXT;

ALTER TABLE "MarketplaceOrder"
  ADD COLUMN "contextAnswers" JSONB,
  ADD COLUMN "contextPolicySnapshot" JSONB;

UPDATE "MarketplaceListing"
SET "contextPolicyKey" = 'AGRI_INPUT_USAGE'
WHERE "offeringType" = 'PRODUCT'
  AND (
    UPPER("category") = 'SEEDS'
    OR LOWER(COALESCE("title", '') || ' ' || COALESCE("description", '')) ~ '(fertili[sz]er|seed(s)?|pesticide|insecticide|herbicide|fungicide|micronutrient|biofertili[sz]er|soil amendment|plant nutrient|crop nutrient)'
  );

CREATE INDEX "MarketplaceListing_offeringType_status_publishedAt_idx"
  ON "MarketplaceListing"("offeringType", "status", "publishedAt");
CREATE INDEX "MarketplaceListing_sourceModule_sourceEntityId_idx"
  ON "MarketplaceListing"("sourceModule", "sourceEntityId");

-- Add nullable Entity bridge to existing Farm records
ALTER TABLE "Farm"
ADD COLUMN "entityId" TEXT;

-- Create one universal Entity for every existing Farm.
-- Entity.id reuses Farm.id for deterministic mapping.
INSERT INTO "Entity" ("id", "type", "createdAt", "updatedAt")
SELECT
    "id",
    'FARM',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Farm";

-- Connect every Farm to its corresponding Entity.
UPDATE "Farm"
SET "entityId" = "id";

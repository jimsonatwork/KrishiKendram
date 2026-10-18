ALTER TABLE "Notification"
  ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'INFO',
  ADD COLUMN "source" TEXT,
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "Notification"
SET "expiresAt" = "createdAt" + INTERVAL '180 days'
WHERE "expiresAt" IS NULL;

CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key"
  ON "Notification"("userId", "dedupeKey");

CREATE INDEX "Notification_userId_expiresAt_createdAt_idx"
  ON "Notification"("userId", "expiresAt", "createdAt");

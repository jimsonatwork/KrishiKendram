CREATE TABLE "GodConfigurationSnapshot" (
    "id" TEXT NOT NULL,
    "stableId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'GOD_MODE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GodConfigurationSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GodConfigurationSnapshot_stableId_version_idx" ON "GodConfigurationSnapshot"("stableId", "version");
CREATE INDEX "GodConfigurationSnapshot_configurationId_idx" ON "GodConfigurationSnapshot"("configurationId");
CREATE INDEX "GodConfigurationSnapshot_createdAt_idx" ON "GodConfigurationSnapshot"("createdAt");

-- God Mode Phase 2: canonical persistent configuration registry

CREATE TABLE "GodConfiguration" (
    "id" TEXT NOT NULL,
    "stableId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentValue" JSONB NOT NULL,
    "valueType" TEXT NOT NULL,
    "defaultValue" JSONB,
    "allowedValues" JSONB,
    "editable" BOOLEAN NOT NULL DEFAULT false,
    "godOnly" BOOLEAN NOT NULL DEFAULT true,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "restartRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "snapshotBeforeChange" BOOLEAN NOT NULL DEFAULT true,
    "auditPolicy" TEXT NOT NULL DEFAULT 'ALL',
    "lifecycle" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "ownerSource" TEXT NOT NULL,
    "lastActorId" TEXT,
    "lastChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GodConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GodConfigurationDependency" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'DEPENDS_ON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GodConfigurationDependency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GodConfiguration_stableId_key" ON "GodConfiguration"("stableId");
CREATE INDEX "GodConfiguration_category_idx" ON "GodConfiguration"("category");
CREATE INDEX "GodConfiguration_lifecycle_idx" ON "GodConfiguration"("lifecycle");
CREATE INDEX "GodConfiguration_ownerSource_idx" ON "GodConfiguration"("ownerSource");
CREATE INDEX "GodConfigurationDependency_configurationId_idx" ON "GodConfigurationDependency"("configurationId");
CREATE INDEX "GodConfigurationDependency_dependsOnId_idx" ON "GodConfigurationDependency"("dependsOnId");
CREATE UNIQUE INDEX "GodConfigurationDependency_configurationId_dependsOnId_key" ON "GodConfigurationDependency"("configurationId", "dependsOnId");

ALTER TABLE "GodConfigurationDependency" ADD CONSTRAINT "GodConfigurationDependency_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "GodConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GodConfigurationDependency" ADD CONSTRAINT "GodConfigurationDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "GodConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

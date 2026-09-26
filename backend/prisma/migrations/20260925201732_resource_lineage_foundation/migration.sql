-- CreateEnum
CREATE TYPE "ResourceLineageType" AS ENUM ('DERIVED_FROM', 'SPLIT_FROM', 'MERGED_FROM', 'TRANSFERRED_FROM');

-- CreateTable
CREATE TABLE "ResourceLineage" (
    "id" TEXT NOT NULL,
    "sourceResourceType" TEXT NOT NULL,
    "sourceResourceId" TEXT NOT NULL,
    "targetResourceType" TEXT NOT NULL,
    "targetResourceId" TEXT NOT NULL,
    "lineageType" "ResourceLineageType" NOT NULL,
    "movementId" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceLineage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceLineage_sourceResourceType_sourceResourceId_idx" ON "ResourceLineage"("sourceResourceType", "sourceResourceId");

-- CreateIndex
CREATE INDEX "ResourceLineage_targetResourceType_targetResourceId_idx" ON "ResourceLineage"("targetResourceType", "targetResourceId");

-- CreateIndex
CREATE INDEX "ResourceLineage_lineageType_idx" ON "ResourceLineage"("lineageType");

-- CreateIndex
CREATE INDEX "ResourceLineage_movementId_idx" ON "ResourceLineage"("movementId");

-- CreateIndex
CREATE INDEX "ResourceLineage_effectiveAt_idx" ON "ResourceLineage"("effectiveAt");

-- CreateIndex
CREATE INDEX "ResourceLineage_createdBy_idx" ON "ResourceLineage"("createdBy");

-- CreateIndex
CREATE INDEX "ResourceLineage_updatedBy_idx" ON "ResourceLineage"("updatedBy");

-- AddForeignKey
ALTER TABLE "ResourceLineage" ADD CONSTRAINT "ResourceLineage_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "ResourceMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLineage" ADD CONSTRAINT "ResourceLineage_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLineage" ADD CONSTRAINT "ResourceLineage_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

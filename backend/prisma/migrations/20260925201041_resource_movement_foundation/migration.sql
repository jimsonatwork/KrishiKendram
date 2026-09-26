-- CreateEnum
CREATE TYPE "ResourceMovementType" AS ENUM ('SALE', 'PARTIAL_SALE', 'TRANSFER', 'PARTIAL_TRANSFER', 'LEASE', 'LEASE_END', 'INHERITANCE', 'GIFT', 'DONATION', 'ALLOCATION', 'REALLOCATION', 'RETURN', 'MERGE', 'SPLIT', 'RECOVERY', 'LOCATION_CHANGE', 'CUSTODY_CHANGE');

-- CreateTable
CREATE TABLE "ResourceMovement" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "movementType" "ResourceMovementType" NOT NULL,
    "sourceUserId" TEXT,
    "destinationUserId" TEXT,
    "sourceResourceType" TEXT,
    "sourceResourceId" TEXT,
    "destinationResourceType" TEXT,
    "destinationResourceId" TEXT,
    "sourceRelationshipId" TEXT,
    "destinationRelationshipId" TEXT,
    "previousMovementId" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "transactionId" TEXT,
    "evidenceId" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceMovement_resourceType_resourceId_idx" ON "ResourceMovement"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ResourceMovement_movementType_idx" ON "ResourceMovement"("movementType");

-- CreateIndex
CREATE INDEX "ResourceMovement_sourceUserId_idx" ON "ResourceMovement"("sourceUserId");

-- CreateIndex
CREATE INDEX "ResourceMovement_destinationUserId_idx" ON "ResourceMovement"("destinationUserId");

-- CreateIndex
CREATE INDEX "ResourceMovement_sourceResourceType_sourceResourceId_idx" ON "ResourceMovement"("sourceResourceType", "sourceResourceId");

-- CreateIndex
CREATE INDEX "ResourceMovement_destinationResourceType_destinationResourc_idx" ON "ResourceMovement"("destinationResourceType", "destinationResourceId");

-- CreateIndex
CREATE INDEX "ResourceMovement_effectiveAt_idx" ON "ResourceMovement"("effectiveAt");

-- CreateIndex
CREATE INDEX "ResourceMovement_recordedAt_idx" ON "ResourceMovement"("recordedAt");

-- CreateIndex
CREATE INDEX "ResourceMovement_previousMovementId_idx" ON "ResourceMovement"("previousMovementId");

-- CreateIndex
CREATE INDEX "ResourceMovement_createdBy_idx" ON "ResourceMovement"("createdBy");

-- CreateIndex
CREATE INDEX "ResourceMovement_updatedBy_idx" ON "ResourceMovement"("updatedBy");

-- AddForeignKey
ALTER TABLE "ResourceMovement" ADD CONSTRAINT "ResourceMovement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceMovement" ADD CONSTRAINT "ResourceMovement_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceMovement" ADD CONSTRAINT "ResourceMovement_previousMovementId_fkey" FOREIGN KEY ("previousMovementId") REFERENCES "ResourceMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

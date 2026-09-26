-- CreateEnum
CREATE TYPE "ResourceRelationshipType" AS ENUM ('OWNER', 'CO_OWNER', 'LESSEE', 'MANAGER', 'WORKER', 'CUSTODIAN', 'CARETAKER', 'SERVICE_PROVIDER', 'ADVISOR', 'VETERINARIAN', 'AUTHORIZED_OPERATOR');

-- CreateEnum
CREATE TYPE "ResourceRelationshipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'TRANSFERRED', 'REVOKED', 'TERMINATED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "ResourceRelationship" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationshipType" "ResourceRelationshipType" NOT NULL,
    "status" "ResourceRelationshipStatus" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceRelationship_resourceType_resourceId_idx" ON "ResourceRelationship"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ResourceRelationship_userId_idx" ON "ResourceRelationship"("userId");

-- CreateIndex
CREATE INDEX "ResourceRelationship_relationshipType_idx" ON "ResourceRelationship"("relationshipType");

-- CreateIndex
CREATE INDEX "ResourceRelationship_status_idx" ON "ResourceRelationship"("status");

-- CreateIndex
CREATE INDEX "ResourceRelationship_validFrom_idx" ON "ResourceRelationship"("validFrom");

-- CreateIndex
CREATE INDEX "ResourceRelationship_validUntil_idx" ON "ResourceRelationship"("validUntil");

-- CreateIndex
CREATE INDEX "ResourceRelationship_createdBy_idx" ON "ResourceRelationship"("createdBy");

-- CreateIndex
CREATE INDEX "ResourceRelationship_updatedBy_idx" ON "ResourceRelationship"("updatedBy");

-- AddForeignKey
ALTER TABLE "ResourceRelationship" ADD CONSTRAINT "ResourceRelationship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRelationship" ADD CONSTRAINT "ResourceRelationship_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRelationship" ADD CONSTRAINT "ResourceRelationship_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

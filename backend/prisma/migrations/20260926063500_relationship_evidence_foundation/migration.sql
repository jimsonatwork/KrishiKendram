-- CreateEnum
CREATE TYPE "ResourceEvidenceType" AS ENUM ('DOCUMENT', 'TRANSACTION', 'REGISTRY', 'RECORD', 'PROOF');

-- AlterTable
ALTER TABLE "ResourceRelationship" ADD COLUMN     "evidenceId" TEXT;

-- CreateTable
CREATE TABLE "ResourceEvidence" (
    "id" TEXT NOT NULL,
    "evidenceType" "ResourceEvidenceType" NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceValue" TEXT NOT NULL,
    "documentNumber" TEXT,
    "issuer" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "integrityHash" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceEvidence_evidenceType_idx" ON "ResourceEvidence"("evidenceType");

-- CreateIndex
CREATE INDEX "ResourceEvidence_referenceType_referenceValue_idx" ON "ResourceEvidence"("referenceType", "referenceValue");

-- CreateIndex
CREATE INDEX "ResourceEvidence_documentNumber_idx" ON "ResourceEvidence"("documentNumber");

-- CreateIndex
CREATE INDEX "ResourceEvidence_issuedAt_idx" ON "ResourceEvidence"("issuedAt");

-- CreateIndex
CREATE INDEX "ResourceEvidence_expiresAt_idx" ON "ResourceEvidence"("expiresAt");

-- CreateIndex
CREATE INDEX "ResourceEvidence_createdBy_idx" ON "ResourceEvidence"("createdBy");

-- CreateIndex
CREATE INDEX "ResourceEvidence_updatedBy_idx" ON "ResourceEvidence"("updatedBy");

-- CreateIndex
CREATE INDEX "ResourceMovement_evidenceId_idx" ON "ResourceMovement"("evidenceId");

-- CreateIndex
CREATE INDEX "ResourceRelationship_evidenceId_idx" ON "ResourceRelationship"("evidenceId");

-- AddForeignKey
ALTER TABLE "ResourceRelationship" ADD CONSTRAINT "ResourceRelationship_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ResourceEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceEvidence" ADD CONSTRAINT "ResourceEvidence_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceEvidence" ADD CONSTRAINT "ResourceEvidence_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceMovement" ADD CONSTRAINT "ResourceMovement_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ResourceEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

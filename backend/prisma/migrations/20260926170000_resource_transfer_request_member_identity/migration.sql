ALTER TABLE "User" ADD COLUMN "memberId" TEXT;

CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");

CREATE TYPE "ResourceTransferRequestStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
  'APPROVED',
  'COMPLETED'
);

CREATE TABLE "ResourceTransferRequest" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "sourceUserId" TEXT NOT NULL,
  "destinationUserId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION,
  "unit" TEXT,
  "status" "ResourceTransferRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "effectiveAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "reason" TEXT,
  "transactionId" TEXT,
  "evidenceId" TEXT,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "acceptedBy" TEXT,
  "rejectedBy" TEXT,
  "approvedBy" TEXT,
  "approvalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ResourceTransferRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceTransferRequest_requestNumber_key" ON "ResourceTransferRequest"("requestNumber");
CREATE INDEX "ResourceTransferRequest_resourceType_resourceId_idx" ON "ResourceTransferRequest"("resourceType", "resourceId");
CREATE INDEX "ResourceTransferRequest_sourceUserId_status_idx" ON "ResourceTransferRequest"("sourceUserId", "status");
CREATE INDEX "ResourceTransferRequest_destinationUserId_status_idx" ON "ResourceTransferRequest"("destinationUserId", "status");
CREATE INDEX "ResourceTransferRequest_status_requestedAt_idx" ON "ResourceTransferRequest"("status", "requestedAt");
CREATE INDEX "ResourceTransferRequest_expiresAt_idx" ON "ResourceTransferRequest"("expiresAt");
ALTER TABLE "ResourceTransferRequest" ADD CONSTRAINT "ResourceTransferRequest_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "ResourceEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResourceTransferRequest" ADD CONSTRAINT "ResourceTransferRequest_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResourceTransferRequest" ADD CONSTRAINT "ResourceTransferRequest_sourceUserId_fkey"
  FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResourceTransferRequest" ADD CONSTRAINT "ResourceTransferRequest_destinationUserId_fkey"
  FOREIGN KEY ("destinationUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResourceTransferRequest" ADD CONSTRAINT "ResourceTransferRequest_acceptedBy_fkey"
  FOREIGN KEY ("acceptedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResourceTransferRequest" ADD CONSTRAINT "ResourceTransferRequest_rejectedBy_fkey"
  FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResourceTransferRequest" ADD CONSTRAINT "ResourceTransferRequest_approvedBy_fkey"
  FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

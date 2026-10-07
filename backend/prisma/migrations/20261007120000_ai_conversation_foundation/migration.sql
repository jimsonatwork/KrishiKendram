-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConversationSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConversationMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "ConversationMessageSource" AS ENUM ('TEXT', 'VOICE', 'IMAGE', 'DOCUMENT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "ConversationFactCandidateStatus" AS ENUM ('DETECTED', 'NORMALIZED', 'VALIDATION_PENDING', 'CONFLICT', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'APPLIED', 'SUPERSEDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConversationActionStatus" AS ENUM ('PROPOSED', 'PENDING', 'EXECUTED', 'REJECTED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT,
    "primaryLanguage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "status" "ConversationSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "interruptionState" TEXT,
    "discoveryState" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "role" "ConversationMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "source" "ConversationMessageSource" NOT NULL DEFAULT 'TEXT',
    "providerId" TEXT,
    "modelId" TEXT,
    "modelVersion" TEXT,
    "metadata" JSONB,
    "provenance" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationContext" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "moduleId" TEXT NOT NULL,
    "screenId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "policyId" TEXT,
    "policyVersion" TEXT,
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationReference" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationFactCandidate" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "targetEntityType" TEXT,
    "targetEntityId" TEXT,
    "targetFieldId" TEXT,
    "proposedValue" JSONB NOT NULL,
    "previousValue" JSONB,
    "confidence" DECIMAL(5,4),
    "source" TEXT NOT NULL,
    "status" "ConversationFactCandidateStatus" NOT NULL DEFAULT 'DETECTED',
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "validationResult" JSONB,
    "evidenceReference" TEXT,
    "provenance" JSONB,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "ConversationFactCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationAction" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetEntityType" TEXT,
    "targetEntityId" TEXT,
    "payload" JSONB,
    "status" "ConversationActionStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "executedBy" TEXT,
    "result" JSONB,

    CONSTRAINT "ConversationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_moduleId_idx" ON "Conversation"("moduleId");

-- CreateIndex
CREATE INDEX "Conversation_userId_moduleId_idx" ON "Conversation"("userId", "moduleId");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationSession_conversationId_idx" ON "ConversationSession"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationSession_status_idx" ON "ConversationSession"("status");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_sessionId_createdAt_idx" ON "ConversationMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_role_idx" ON "ConversationMessage"("role");

-- CreateIndex
CREATE INDEX "ConversationContext_conversationId_createdAt_idx" ON "ConversationContext"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationContext_moduleId_idx" ON "ConversationContext"("moduleId");

-- CreateIndex
CREATE INDEX "ConversationContext_moduleId_entityType_entityId_idx" ON "ConversationContext"("moduleId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ConversationReference_conversationId_idx" ON "ConversationReference"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationReference_moduleId_idx" ON "ConversationReference"("moduleId");

-- CreateIndex
CREATE INDEX "ConversationReference_entityType_entityId_idx" ON "ConversationReference"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ConversationFactCandidate_conversationId_idx" ON "ConversationFactCandidate"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationFactCandidate_sessionId_idx" ON "ConversationFactCandidate"("sessionId");

-- CreateIndex
CREATE INDEX "ConversationFactCandidate_userId_idx" ON "ConversationFactCandidate"("userId");

-- CreateIndex
CREATE INDEX "ConversationFactCandidate_moduleId_idx" ON "ConversationFactCandidate"("moduleId");

-- CreateIndex
CREATE INDEX "ConversationFactCandidate_userId_moduleId_idx" ON "ConversationFactCandidate"("userId", "moduleId");

-- CreateIndex
CREATE INDEX "ConversationFactCandidate_status_idx" ON "ConversationFactCandidate"("status");

-- CreateIndex
CREATE INDEX "ConversationFactCandidate_targetEntityType_targetEntityId_idx" ON "ConversationFactCandidate"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "ConversationFactCandidate_targetFieldId_idx" ON "ConversationFactCandidate"("targetFieldId");

-- CreateIndex
CREATE INDEX "ConversationAction_conversationId_idx" ON "ConversationAction"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationAction_moduleId_idx" ON "ConversationAction"("moduleId");

-- CreateIndex
CREATE INDEX "ConversationAction_status_idx" ON "ConversationAction"("status");

-- CreateIndex
CREATE INDEX "ConversationAction_targetEntityType_targetEntityId_idx" ON "ConversationAction"("targetEntityType", "targetEntityId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationContext" ADD CONSTRAINT "ConversationContext_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationContext" ADD CONSTRAINT "ConversationContext_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReference" ADD CONSTRAINT "ConversationReference_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationFactCandidate" ADD CONSTRAINT "ConversationFactCandidate_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationFactCandidate" ADD CONSTRAINT "ConversationFactCandidate_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationFactCandidate" ADD CONSTRAINT "ConversationFactCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationFactCandidate" ADD CONSTRAINT "ConversationFactCandidate_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAction" ADD CONSTRAINT "ConversationAction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


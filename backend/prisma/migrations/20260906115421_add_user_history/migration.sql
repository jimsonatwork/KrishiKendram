-- CreateTable
CREATE TABLE "UserHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "changedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserHistory_userId_createdAt_idx" ON "UserHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserHistory_actorId_idx" ON "UserHistory"("actorId");

-- CreateIndex
CREATE INDEX "UserHistory_action_idx" ON "UserHistory"("action");

-- CreateIndex
CREATE UNIQUE INDEX "UserHistory_userId_version_key" ON "UserHistory"("userId", "version");

-- AddForeignKey
ALTER TABLE "UserHistory" ADD CONSTRAINT "UserHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHistory" ADD CONSTRAINT "UserHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

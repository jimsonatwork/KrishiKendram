-- CreateTable
CREATE TABLE "Livestock" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "name" TEXT,
    "tag" TEXT,
    "breed" TEXT,
    "sex" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acquiredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Livestock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Livestock_farmId_idx" ON "Livestock"("farmId");

-- CreateIndex
CREATE INDEX "Livestock_species_idx" ON "Livestock"("species");

-- CreateIndex
CREATE INDEX "Livestock_status_idx" ON "Livestock"("status");

-- CreateIndex
CREATE INDEX "Livestock_tag_idx" ON "Livestock"("tag");

-- AddForeignKey
ALTER TABLE "Livestock" ADD CONSTRAINT "Livestock_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

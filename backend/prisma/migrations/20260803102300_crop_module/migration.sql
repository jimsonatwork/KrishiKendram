-- CreateEnum
CREATE TYPE "CropSeason" AS ENUM ('KHARIF', 'RABI', 'ZAID', 'PERENNIAL');

-- CreateEnum
CREATE TYPE "CropStatus" AS ENUM ('PLANNED', 'SOWN', 'GERMINATED', 'GROWING', 'FLOWERING', 'FRUITING', 'HARVEST_READY', 'HARVESTED', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variety" TEXT,
    "season" "CropSeason" NOT NULL,
    "status" "CropStatus" NOT NULL DEFAULT 'PLANNED',
    "sowingDate" TIMESTAMP(3),
    "harvestDate" TIMESTAMP(3),
    "area" DOUBLE PRECISION,
    "unit" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Crop_farmId_idx" ON "Crop"("farmId");

-- CreateIndex
CREATE INDEX "Crop_status_idx" ON "Crop"("status");

-- CreateIndex
CREATE INDEX "Crop_season_idx" ON "Crop"("season");

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

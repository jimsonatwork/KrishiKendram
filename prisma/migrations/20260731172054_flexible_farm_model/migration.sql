-- AlterTable
ALTER TABLE "Farm" ADD COLUMN     "type" TEXT;

-- CreateTable
CREATE TABLE "FarmAsset" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmRecord" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT,
    "inputMethod" "InputMethod" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FarmAsset" ADD CONSTRAINT "FarmAsset_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmRecord" ADD CONSTRAINT "FarmRecord_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - A unique constraint covering the columns `[entityId]` on the table `Farm` will be added. If there are existing duplicate values, this will fail.
  - Made the column `entityId` on table `Farm` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Farm" ALTER COLUMN "entityId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Farm_entityId_key" ON "Farm"("entityId");

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

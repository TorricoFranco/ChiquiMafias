/*
  Warnings:

  - A unique constraint covering the columns `[assetId]` on the table `StoreItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StoreItem_assetId_key" ON "StoreItem"("assetId");

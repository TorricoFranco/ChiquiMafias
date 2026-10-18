/*
  Warnings:

  - Made the column `assetId` on table `StoreItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StoreItem" ALTER COLUMN "assetId" SET NOT NULL;

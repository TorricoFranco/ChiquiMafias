/*
  Warnings:

  - Made the column `round` on table `Matches` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Matches" ALTER COLUMN "round" SET NOT NULL;

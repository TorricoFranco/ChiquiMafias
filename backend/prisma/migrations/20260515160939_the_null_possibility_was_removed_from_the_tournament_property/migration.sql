/*
  Warnings:

  - Made the column `tournament` on table `Matches` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Matches" ALTER COLUMN "tournament" SET NOT NULL;

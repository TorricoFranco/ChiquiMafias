-- AlterTable
ALTER TABLE "Matches" ADD COLUMN     "stats_fetched" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stats_finalized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Matches" ADD COLUMN     "market_created" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Matches_market_created_date_idx" ON "Matches"("market_created", "date");

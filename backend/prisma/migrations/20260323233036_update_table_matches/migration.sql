-- AlterTable
ALTER TABLE "Matches" ADD COLUMN     "is_live_finished" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Matches_tracked_is_live_finished_idx" ON "Matches"("tracked", "is_live_finished");

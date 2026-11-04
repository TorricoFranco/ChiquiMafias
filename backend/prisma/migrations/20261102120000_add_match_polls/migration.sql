-- CreateEnum
CREATE TYPE "MatchPollKind" AS ENUM ('REFEREE_RATING', 'MATCH_REVIEW');

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "matchId" TEXT,
ADD COLUMN     "matchKind" "MatchPollKind";

-- CreateIndex
CREATE UNIQUE INDEX "Poll_matchId_matchKind_key" ON "Poll"("matchId", "matchKind");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

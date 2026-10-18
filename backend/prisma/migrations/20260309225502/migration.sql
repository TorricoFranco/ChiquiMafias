/*
  Warnings:

  - You are about to drop the column `is_valid` on the `MatchEvents` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `MatchEvents` table. All the data in the column will be lost.
  - You are about to drop the `Goals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Goals" DROP CONSTRAINT "Goals_assist_player_id_fkey";

-- DropForeignKey
ALTER TABLE "Goals" DROP CONSTRAINT "Goals_match_id_fkey";

-- DropForeignKey
ALTER TABLE "Goals" DROP CONSTRAINT "Goals_player_id_fkey";

-- DropForeignKey
ALTER TABLE "Goals" DROP CONSTRAINT "Goals_team_id_fkey";

-- AlterTable
ALTER TABLE "MatchEvents" DROP COLUMN "is_valid",
DROP COLUMN "status",
ADD COLUMN     "assist_id" TEXT;

-- DropTable
DROP TABLE "Goals";

-- AddForeignKey
ALTER TABLE "MatchEvents" ADD CONSTRAINT "MatchEvents_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvents" ADD CONSTRAINT "MatchEvents_assist_id_fkey" FOREIGN KEY ("assist_id") REFERENCES "Players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvents" ADD CONSTRAINT "MatchEvents_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

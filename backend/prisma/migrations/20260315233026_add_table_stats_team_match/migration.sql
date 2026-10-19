/*
  Warnings:

  - You are about to drop the column `corners` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `expected_goals` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `fouls` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `offsides` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `pass_accuracy` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `passes_accurate` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `passes_total` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `possession` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `red_cards` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `shots_blocked` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `shots_off` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `shots_on` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `shots_total` on the `Stats_team_match` table. All the data in the column will be lost.
  - You are about to drop the column `yellow_cards` on the `Stats_team_match` table. All the data in the column will be lost.
  - Added the required column `data` to the `Stats_team_match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Stats_team_match` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Stats_team_match" DROP COLUMN "corners",
DROP COLUMN "expected_goals",
DROP COLUMN "fouls",
DROP COLUMN "offsides",
DROP COLUMN "pass_accuracy",
DROP COLUMN "passes_accurate",
DROP COLUMN "passes_total",
DROP COLUMN "possession",
DROP COLUMN "red_cards",
DROP COLUMN "shots_blocked",
DROP COLUMN "shots_off",
DROP COLUMN "shots_on",
DROP COLUMN "shots_total",
DROP COLUMN "yellow_cards",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Stats_team_match_match_id_idx" ON "Stats_team_match"("match_id");

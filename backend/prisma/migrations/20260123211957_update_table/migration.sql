/*
  Warnings:

  - A unique constraint covering the columns `[league_id,season,tournament,team_id]` on the table `LeagueSeasonGroups` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tournament` to the `LeagueSeasonGroups` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LeagueSeasonGroups_league_id_season_group_name_idx";

-- DropIndex
DROP INDEX "LeagueSeasonGroups_league_id_season_team_id_key";

-- AlterTable
ALTER TABLE "LeagueSeasonGroups" ADD COLUMN     "tournament" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "LeagueSeasonGroups_league_id_season_tournament_group_name_idx" ON "LeagueSeasonGroups"("league_id", "season", "tournament", "group_name");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSeasonGroups_league_id_season_tournament_team_id_key" ON "LeagueSeasonGroups"("league_id", "season", "tournament", "team_id");

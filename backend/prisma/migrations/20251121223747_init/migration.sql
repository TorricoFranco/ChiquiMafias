/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "stadium" TEXT,
    "foundation_year" INTEGER,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teams_nicknames" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "team_id" TEXT NOT NULL,

    CONSTRAINT "Teams_nicknames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matches" (
    "id" TEXT NOT NULL,
    "season" TEXT,
    "status" "MatchStatus",
    "date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,

    CONSTRAINT "Matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stats_team_match" (
    "id" TEXT NOT NULL,
    "shots_total" INTEGER,
    "fouls_total" INTEGER,
    "corners_total" INTEGER,
    "possession_pct" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "match_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,

    CONSTRAINT "Stats_team_match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goals" (
    "id" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "minute" INTEGER,
    "type" TEXT,
    "assistance" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "match_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,

    CONSTRAINT "Goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "team_id" TEXT NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Messages_global" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,

    CONSTRAINT "Messages_global_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatGlobal" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Messages_match" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,

    CONSTRAINT "Messages_match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMatch" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "match_id" TEXT NOT NULL,

    CONSTRAINT "ChatMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Teams_name_idx" ON "Teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Teams_name_key" ON "Teams"("name");

-- CreateIndex
CREATE INDEX "Teams_nicknames_team_id_idx" ON "Teams_nicknames"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "Teams_nicknames_team_id_nickname_key" ON "Teams_nicknames"("team_id", "nickname");

-- CreateIndex
CREATE INDEX "Matches_date_idx" ON "Matches"("date");

-- CreateIndex
CREATE INDEX "Matches_home_team_id_idx" ON "Matches"("home_team_id");

-- CreateIndex
CREATE INDEX "Matches_away_team_id_idx" ON "Matches"("away_team_id");

-- CreateIndex
CREATE INDEX "Stats_team_match_match_id_idx" ON "Stats_team_match"("match_id");

-- CreateIndex
CREATE INDEX "Stats_team_match_team_id_idx" ON "Stats_team_match"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "Stats_team_match_match_id_team_id_key" ON "Stats_team_match"("match_id", "team_id");

-- CreateIndex
CREATE INDEX "Goals_match_id_idx" ON "Goals"("match_id");

-- CreateIndex
CREATE INDEX "Goals_team_id_idx" ON "Goals"("team_id");

-- CreateIndex
CREATE INDEX "Users_team_id_idx" ON "Users"("team_id");

-- CreateIndex
CREATE INDEX "Messages_global_user_id_idx" ON "Messages_global"("user_id");

-- CreateIndex
CREATE INDEX "Messages_global_chat_id_idx" ON "Messages_global"("chat_id");

-- CreateIndex
CREATE INDEX "Messages_match_user_id_idx" ON "Messages_match"("user_id");

-- CreateIndex
CREATE INDEX "Messages_match_chat_id_idx" ON "Messages_match"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMatch_match_id_key" ON "ChatMatch"("match_id");

-- AddForeignKey
ALTER TABLE "Teams_nicknames" ADD CONSTRAINT "Teams_nicknames_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stats_team_match" ADD CONSTRAINT "Stats_team_match_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stats_team_match" ADD CONSTRAINT "Stats_team_match_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goals" ADD CONSTRAINT "Goals_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goals" ADD CONSTRAINT "Goals_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages_global" ADD CONSTRAINT "Messages_global_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages_global" ADD CONSTRAINT "Messages_global_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ChatGlobal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages_match" ADD CONSTRAINT "Messages_match_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages_match" ADD CONSTRAINT "Messages_match_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ChatMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMatch" ADD CONSTRAINT "ChatMatch_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

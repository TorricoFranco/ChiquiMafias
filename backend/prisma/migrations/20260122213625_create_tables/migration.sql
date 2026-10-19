-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED', 'ABANDONED', 'NOT_PLAYED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('NORMAL', 'PENALTY', 'OWN_GOAL');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "foundation_year" INTEGER,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "api_team_id" INTEGER NOT NULL,
    "short_code" TEXT,
    "venue_id" TEXT,

    CONSTRAINT "Teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venues" (
    "id" TEXT NOT NULL,
    "api_venue_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "capacity" INTEGER,
    "surface" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueTeams" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season" INTEGER NOT NULL,

    CONSTRAINT "LeagueTeams_pkey" PRIMARY KEY ("id")
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
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "api_fixture_id" INTEGER NOT NULL,
    "away_goals" INTEGER,
    "elapsed" INTEGER,
    "extra_time" INTEGER,
    "home_goals" INTEGER,
    "referee" TEXT,
    "round" TEXT,
    "status_long" TEXT NOT NULL,
    "status_short" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "timezone" TEXT,
    "venue_id" TEXT,
    "season" INTEGER NOT NULL,
    "tracked" BOOLEAN NOT NULL DEFAULT false,
    "lineup_fetched" BOOLEAN NOT NULL DEFAULT false,
    "events_fetched" BOOLEAN NOT NULL DEFAULT false,
    "events_fetched_at" TIMESTAMP(3),
    "lineup_fetched_at" TIMESTAMP(3),
    "events_finalized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goals" (
    "id" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "match_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "assist_player_id" TEXT,
    "extra_minute" INTEGER,
    "player_id" TEXT,
    "type" "GoalType" NOT NULL,
    "api_event_id" INTEGER NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leagues" (
    "id" TEXT NOT NULL,
    "api_league_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "country" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stats_team_match" (
    "id" TEXT NOT NULL,
    "shots_total" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "match_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "corners" INTEGER,
    "expected_goals" DOUBLE PRECISION,
    "fouls" INTEGER,
    "offsides" INTEGER,
    "pass_accuracy" DOUBLE PRECISION,
    "passes_accurate" INTEGER,
    "passes_total" INTEGER,
    "possession" DOUBLE PRECISION,
    "red_cards" INTEGER,
    "shots_blocked" INTEGER,
    "shots_off" INTEGER,
    "shots_on" INTEGER,
    "yellow_cards" INTEGER,

    CONSTRAINT "Stats_team_match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Players" (
    "id" TEXT NOT NULL,
    "api_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "age" INTEGER,
    "birth_date" TIMESTAMP(3),
    "nationality" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "position" TEXT,
    "photo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvents" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "team_id" TEXT,
    "player_id" TEXT,
    "minute" INTEGER NOT NULL,
    "extra_minute" INTEGER,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "api_event_id" INTEGER NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "MatchEvents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueSeasonGroups" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "group_name" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueSeasonGroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSeasonStats" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "team_id" TEXT NOT NULL,
    "group_name" TEXT,
    "form" TEXT,
    "status" TEXT,
    "description" TEXT,
    "last_update" TIMESTAMP(3),
    "matches_played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "goal_diff" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stage" TEXT NOT NULL,

    CONSTRAINT "TeamSeasonStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchLineup" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "formation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPlayer" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "lineup_id" TEXT,
    "player_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "is_starting" BOOLEAN NOT NULL,
    "position" TEXT,
    "grid" TEXT,

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "username" TEXT,
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "team" TEXT,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "options" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'USER',

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionId" INTEGER NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teams_api_team_id_key" ON "Teams"("api_team_id");

-- CreateIndex
CREATE INDEX "Teams_name_idx" ON "Teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Venues_api_venue_id_key" ON "Venues"("api_venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueTeams_league_id_team_id_season_key" ON "LeagueTeams"("league_id", "team_id", "season");

-- CreateIndex
CREATE INDEX "Teams_nicknames_team_id_idx" ON "Teams_nicknames"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "Teams_nicknames_team_id_nickname_key" ON "Teams_nicknames"("team_id", "nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Matches_api_fixture_id_key" ON "Matches"("api_fixture_id");

-- CreateIndex
CREATE INDEX "Matches_date_idx" ON "Matches"("date");

-- CreateIndex
CREATE INDEX "Matches_league_id_season_idx" ON "Matches"("league_id", "season");

-- CreateIndex
CREATE INDEX "Matches_status_short_idx" ON "Matches"("status_short");

-- CreateIndex
CREATE INDEX "Matches_tracked_timestamp_idx" ON "Matches"("tracked", "timestamp");

-- CreateIndex
CREATE INDEX "Matches_tracked_lineup_fetched_date_idx" ON "Matches"("tracked", "lineup_fetched", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Goals_api_event_id_key" ON "Goals"("api_event_id");

-- CreateIndex
CREATE INDEX "Goals_match_id_idx" ON "Goals"("match_id");

-- CreateIndex
CREATE INDEX "Goals_team_id_idx" ON "Goals"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "Leagues_api_league_id_key" ON "Leagues"("api_league_id");

-- CreateIndex
CREATE UNIQUE INDEX "Stats_team_match_match_id_team_id_key" ON "Stats_team_match"("match_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "Players_api_id_key" ON "Players"("api_id");

-- CreateIndex
CREATE INDEX "MatchEvents_match_id_idx" ON "MatchEvents"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvents_match_id_api_event_id_key" ON "MatchEvents"("match_id", "api_event_id");

-- CreateIndex
CREATE INDEX "LeagueSeasonGroups_league_id_season_group_name_idx" ON "LeagueSeasonGroups"("league_id", "season", "group_name");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSeasonGroups_league_id_season_team_id_key" ON "LeagueSeasonGroups"("league_id", "season", "team_id");

-- CreateIndex
CREATE INDEX "TeamSeasonStats_league_id_season_stage_idx" ON "TeamSeasonStats"("league_id", "season", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSeasonStats_league_id_season_stage_team_id_key" ON "TeamSeasonStats"("league_id", "season", "stage", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineup_match_id_team_id_key" ON "MatchLineup"("match_id", "team_id");

-- CreateIndex
CREATE INDEX "MatchPlayer_match_id_team_id_idx" ON "MatchPlayer"("match_id", "team_id");

-- CreateIndex
CREATE INDEX "MatchPlayer_match_id_is_starting_idx" ON "MatchPlayer"("match_id", "is_starting");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayer_match_id_player_id_key" ON "MatchPlayer"("match_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_googleId_key" ON "Users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_pollId_userId_key" ON "Vote"("pollId", "userId");

-- AddForeignKey
ALTER TABLE "Teams" ADD CONSTRAINT "Teams_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTeams" ADD CONSTRAINT "LeagueTeams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "Leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTeams" ADD CONSTRAINT "LeagueTeams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teams_nicknames" ADD CONSTRAINT "Teams_nicknames_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "Leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goals" ADD CONSTRAINT "Goals_assist_player_id_fkey" FOREIGN KEY ("assist_player_id") REFERENCES "Players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goals" ADD CONSTRAINT "Goals_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goals" ADD CONSTRAINT "Goals_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goals" ADD CONSTRAINT "Goals_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stats_team_match" ADD CONSTRAINT "Stats_team_match_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stats_team_match" ADD CONSTRAINT "Stats_team_match_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvents" ADD CONSTRAINT "MatchEvents_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSeasonGroups" ADD CONSTRAINT "LeagueSeasonGroups_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "Leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSeasonGroups" ADD CONSTRAINT "LeagueSeasonGroups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeasonStats" ADD CONSTRAINT "TeamSeasonStats_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "Leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeasonStats" ADD CONSTRAINT "TeamSeasonStats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_lineup_id_fkey" FOREIGN KEY ("lineup_id") REFERENCES "MatchLineup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

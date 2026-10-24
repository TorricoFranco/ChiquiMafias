-- CreateTable
CREATE TABLE "BracketSlot" (
    "id" TEXT NOT NULL,
    "competition_season_id" TEXT NOT NULL,
    "round_order" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "match_id" TEXT,
    "home_team_id" TEXT,
    "away_team_id" TEXT,
    "winner_team_id" TEXT,
    "manually_corrected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BracketSlot_match_id_key" ON "BracketSlot"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "BracketSlot_competition_season_id_round_order_position_key" ON "BracketSlot"("competition_season_id", "round_order", "position");

-- AddForeignKey
ALTER TABLE "BracketSlot" ADD CONSTRAINT "BracketSlot_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketSlot" ADD CONSTRAINT "BracketSlot_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketSlot" ADD CONSTRAINT "BracketSlot_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "Teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketSlot" ADD CONSTRAINT "BracketSlot_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "Teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketSlot" ADD CONSTRAINT "BracketSlot_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "Teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

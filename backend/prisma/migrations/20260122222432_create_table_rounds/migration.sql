-- CreateTable
CREATE TABLE "Rounds" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phase" TEXT,
    "type" TEXT NOT NULL,
    "order" INTEGER,

    CONSTRAINT "Rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rounds_league_id_season_name_key" ON "Rounds"("league_id", "season", "name");

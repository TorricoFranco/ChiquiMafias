-- CreateEnum
CREATE TYPE "BracketChangeAction" AS ENUM ('LOAD_DRAW', 'CORRECT_SLOT', 'CLEAR_CORRECTION');

-- CreateTable
CREATE TABLE "BracketDraw" (
    "id" TEXT NOT NULL,
    "competition_season_id" TEXT NOT NULL,
    "pairs" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketChangeLog" (
    "id" TEXT NOT NULL,
    "competition_season_id" TEXT NOT NULL,
    "action" "BracketChangeAction" NOT NULL,
    "round_order" INTEGER,
    "position" INTEGER,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "changedById" TEXT,
    "changedByUsername" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BracketChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BracketDraw_competition_season_id_key" ON "BracketDraw"("competition_season_id");

-- CreateIndex
CREATE INDEX "BracketChangeLog_competition_season_id_createdAt_idx" ON "BracketChangeLog"("competition_season_id", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BracketChangeLog_changedById_idx" ON "BracketChangeLog"("changedById");

-- AddForeignKey
ALTER TABLE "BracketDraw" ADD CONSTRAINT "BracketDraw_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketChangeLog" ADD CONSTRAINT "BracketChangeLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketChangeLog" ADD CONSTRAINT "BracketChangeLog_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

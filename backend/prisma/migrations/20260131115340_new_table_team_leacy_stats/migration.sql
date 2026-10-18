-- CreateTable
CREATE TABLE "TeamLegacyStats" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "points_2024" INTEGER NOT NULL DEFAULT 0,
    "played_2024" INTEGER NOT NULL DEFAULT 0,
    "points_2025" INTEGER NOT NULL DEFAULT 0,
    "played_2025" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamLegacyStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamLegacyStats_team_id_key" ON "TeamLegacyStats"("team_id");

-- CreateIndex
CREATE INDEX "TeamLegacyStats_team_id_idx" ON "TeamLegacyStats"("team_id");

-- AddForeignKey
ALTER TABLE "TeamLegacyStats" ADD CONSTRAINT "TeamLegacyStats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

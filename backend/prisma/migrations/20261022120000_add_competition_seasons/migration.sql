-- Soporte multi-competición (ERS §5.1, fase 1). Aditiva e idempotente: no
-- modifica ni borra datos existentes y se puede volver a correr.

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "CompetitionFormat" AS ENUM ('LIGA_DIVIDIDA', 'LIGA', 'ELIMINACION', 'GRUPOS_Y_ELIMINACION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- AlterTable
ALTER TABLE "Leagues" ADD COLUMN IF NOT EXISTS "current_season_id" TEXT;
ALTER TABLE "Leagues" ADD COLUMN IF NOT EXISTS "neutral_venue" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Leagues" ADD COLUMN IF NOT EXISTS "short_name" TEXT;
ALTER TABLE "Leagues" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CompetitionSeason" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "format" "CompetitionFormat" NOT NULL,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "bets_enabled" BOOLEAN NOT NULL DEFAULT false,
    "fixtures_sync_minutes" INTEGER NOT NULL DEFAULT 10,
    "standings_sync_minutes" INTEGER,
    "starts_on" TIMESTAMP(3),
    "ends_on" TIMESTAMP(3),
    "last_fixtures_sync_at" TIMESTAMP(3),
    "last_standings_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionSeason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CompetitionSeason_league_id_season_key" ON "CompetitionSeason"("league_id", "season");
CREATE UNIQUE INDEX IF NOT EXISTS "Leagues_slug_key" ON "Leagues"("slug");
-- Una sola temporada actual por competición: la liga apunta a ella y el valor es único.
CREATE UNIQUE INDEX IF NOT EXISTS "Leagues_current_season_id_key" ON "Leagues"("current_season_id");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "Leagues" ADD CONSTRAINT "Leagues_current_season_id_fkey" FOREIGN KEY ("current_season_id") REFERENCES "CompetitionSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "Leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Backfill: la Liga Profesional (hoy identificada por api_league_id = 128)
-- recibe su slug y su temporada 2026 con la configuración que ya usa el código:
-- Apertura/Clausura, sincronización cada 10 minutos y apuestas activas.
UPDATE "Leagues"
SET "slug" = 'liga-profesional',
    "short_name" = COALESCE("short_name", 'Liga Profesional')
WHERE "api_league_id" = 128 AND "slug" IS NULL;

INSERT INTO "CompetitionSeason" (
  "id", "league_id", "season", "label", "format",
  "sync_enabled", "bets_enabled", "fixtures_sync_minutes", "standings_sync_minutes",
  "updated_at"
)
SELECT gen_random_uuid()::text, "id", 2026, '2026', 'LIGA_DIVIDIDA'::"CompetitionFormat",
       true, true, 10, 10, CURRENT_TIMESTAMP
FROM "Leagues"
WHERE "api_league_id" = 128
ON CONFLICT ("league_id", "season") DO NOTHING;

UPDATE "Leagues" l
SET "current_season_id" = cs."id"
FROM "CompetitionSeason" cs
WHERE cs."league_id" = l."id"
  AND cs."season" = 2026
  AND l."api_league_id" = 128
  AND l."current_season_id" IS NULL;

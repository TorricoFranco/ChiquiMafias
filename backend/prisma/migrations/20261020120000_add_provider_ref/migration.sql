-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "FootballEntity" AS ENUM ('TEAM', 'MATCH', 'LEAGUE', 'PLAYER', 'VENUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProviderRef" (
    "id" TEXT NOT NULL,
    "entity" "FootballEntity" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProviderRef_entity_entity_id_idx" ON "ProviderRef"("entity", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderRef_entity_provider_external_id_key" ON "ProviderRef"("entity", "provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderRef_entity_entity_id_provider_key" ON "ProviderRef"("entity", "entity_id", "provider");

-- Backfill: los IDs que hoy viven en columnas api_* son los de API-Football.
-- Solo agrega; no modifica ni borra ninguna tabla existente. Se puede volver a
-- correr sin duplicar (ON CONFLICT DO NOTHING).
INSERT INTO "ProviderRef" ("id", "entity", "entity_id", "provider", "external_id")
SELECT gen_random_uuid()::text, 'TEAM'::"FootballEntity", "id", 'api-football', "api_team_id"
FROM "Teams"
ON CONFLICT DO NOTHING;

INSERT INTO "ProviderRef" ("id", "entity", "entity_id", "provider", "external_id")
SELECT gen_random_uuid()::text, 'MATCH'::"FootballEntity", "id", 'api-football', "api_fixture_id"
FROM "Matches"
ON CONFLICT DO NOTHING;

INSERT INTO "ProviderRef" ("id", "entity", "entity_id", "provider", "external_id")
SELECT gen_random_uuid()::text, 'LEAGUE'::"FootballEntity", "id", 'api-football', "api_league_id"
FROM "Leagues"
ON CONFLICT DO NOTHING;

INSERT INTO "ProviderRef" ("id", "entity", "entity_id", "provider", "external_id")
SELECT gen_random_uuid()::text, 'PLAYER'::"FootballEntity", "id", 'api-football', "api_id"
FROM "Players"
ON CONFLICT DO NOTHING;

INSERT INTO "ProviderRef" ("id", "entity", "entity_id", "provider", "external_id")
SELECT gen_random_uuid()::text, 'VENUE'::"FootballEntity", "id", 'api-football', "api_venue_id"
FROM "Venues"
WHERE "api_venue_id" IS NOT NULL
ON CONFLICT DO NOTHING;

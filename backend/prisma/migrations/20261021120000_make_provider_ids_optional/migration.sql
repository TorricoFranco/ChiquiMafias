-- Los IDs de API-Football dejan de ser obligatorios: las entidades creadas desde
-- otro proveedor se identifican por "ProviderRef". Los UNIQUE se mantienen y no
-- se modifica ningún dato. Es idempotente (DROP NOT NULL repetido no falla).
ALTER TABLE "Teams" ALTER COLUMN "api_team_id" DROP NOT NULL;
ALTER TABLE "Matches" ALTER COLUMN "api_fixture_id" DROP NOT NULL;
ALTER TABLE "Leagues" ALTER COLUMN "api_league_id" DROP NOT NULL;
ALTER TABLE "Players" ALTER COLUMN "api_id" DROP NOT NULL;

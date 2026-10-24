-- Copa Argentina: eliminación directa a partido único y siempre en cancha
-- neutral. Se crea apagada (sin sincronizar ni apuestas): los crons la
-- saltean y el usuario no la ve hasta que se prepare la temporada (ERS fase 7).
-- El ID del proveedor no va acá: lo vincula el script de vinculación.
INSERT INTO "Leagues" (
  "id", "name", "type", "country", "slug", "short_name", "neutral_venue", "updated_at"
)
SELECT gen_random_uuid()::text, 'Copa Argentina', 'Cup', 'Argentina',
       'copa-argentina', 'Copa Argentina', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Leagues" WHERE "slug" = 'copa-argentina');

INSERT INTO "CompetitionSeason" (
  "id", "league_id", "season", "label", "format",
  "sync_enabled", "bets_enabled", "fixtures_sync_minutes", "standings_sync_minutes",
  "updated_at"
)
SELECT gen_random_uuid()::text, "id", 2026, '2026', 'ELIMINACION'::"CompetitionFormat",
       false, false, 1440, NULL, CURRENT_TIMESTAMP
FROM "Leagues"
WHERE "slug" = 'copa-argentina'
ON CONFLICT ("league_id", "season") DO NOTHING;

UPDATE "Leagues" l
SET "current_season_id" = cs."id"
FROM "CompetitionSeason" cs
WHERE cs."league_id" = l."id"
  AND cs."season" = 2026
  AND l."slug" = 'copa-argentina'
  AND l."current_season_id" IS NULL;

-- Fase 2 del ERS (RF-A12): los mercados automáticos se vinculan al partido por
-- su id interno. Aditiva e idempotente; no modifica fixtureId ni otros datos.

-- AlterTable
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "matchId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Market_matchId_idx" ON "Market"("matchId");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "Market" ADD CONSTRAINT "Market_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Backfill: solo mercados automáticos (los manuales no se atan a partidos).
-- Los que no encuentren su partido quedan con matchId NULL y se siguen
-- liquidando por fixtureId.
UPDATE "Market" m
SET "matchId" = mt."id"
FROM "Matches" mt
WHERE mt."api_fixture_id" = m."fixtureId"
  AND m."isManual" = false
  AND m."matchId" IS NULL;

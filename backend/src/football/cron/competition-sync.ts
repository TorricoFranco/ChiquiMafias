import { CompetitionSeason, Leagues } from '@prisma/client'

/** Temporada a sincronizar, con su competición. */
export type SyncSeason = CompetitionSeason & { league: Leagues }

// Los crons corren cada minuto y el scheduler se atrasa unos ms: sin esta
// tolerancia una temporada de 10 minutos se sincronizaría cada 11.
const DUE_TOLERANCE_MS = 30_000

/** true si ya pasó el intervalo de la temporada desde la última sincronización. */
export function isSyncDue(
  lastSyncAt: Date | null,
  everyMinutes: number,
  now: Date,
): boolean {
  if (lastSyncAt === null) return true
  return (
    now.getTime() - lastSyncAt.getTime() >=
    everyMinutes * 60_000 - DUE_TOLERANCE_MS
  )
}

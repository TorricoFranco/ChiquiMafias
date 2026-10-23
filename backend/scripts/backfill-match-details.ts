/**
 * Completa eventos, estadísticas (y, si se pide, alineaciones) de los partidos
 * ya terminados de una temporada, con el proveedor Highlightly.
 *
 * Los crons solo miran partidos recientes (eventos: 3 días, estadísticas: 3
 * horas): los partidos viejos que entran por el sync del fixture, como los de
 * una copa que se activa a mitad de temporada, quedan sin esos datos.
 *
 * Por defecto NO escribe ni pide nada (dry-run): cuenta qué falta y cuántos
 * pedidos gastaría. Con --apply consulta y guarda; se puede repetir, no duplica.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-match-details.ts \
 *     --slug copa-argentina [--season 2026] [--lineups] [--limit 100] [--apply]
 *
 * - Necesita HIGHLIGHTLY_API_KEY y que los partidos estén vinculados en
 *   `ProviderRef` (script link-provider-ids).
 * - Cuesta 2 pedidos por partido (eventos y estadísticas), o 3 con --lineups.
 *   --limit (100 por defecto) corta la cantidad de partidos por corrida.
 * - Las alineaciones son opcionales: Highlightly no las tiene para varios
 *   partidos de copa. Si vienen vacías no se guarda nada.
 */
import { Prisma } from '@prisma/client'
import { PrismaService } from '../src/prisma/prisma.service'
import { buildEventKey } from '../src/football/cron/events-fetch.cron'
import { FootballLineupPlayer } from '../src/football/football.types'
import { HighlightlyHttp } from '../src/football/providers/highlightly/highlightly.http'
import { HighlightlyProvider } from '../src/football/providers/highlightly/highlightly.provider'
import { FootballRefsService } from '../src/football/services/refs.service'
import { upsertMatchEvent } from '../src/football/upserts/upsert-events'
import {
  upsertMatchLineup,
  upsertMatchPlayer,
} from '../src/football/upserts/upsert-lineups'
import { upsertMatchStats } from '../src/football/upserts/upsert-stats'

const FINISHED = ['FT', 'AET', 'PEN']

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)

async function main() {
  const slug = arg('slug')
  const apply = flag('apply')
  const withLineups = flag('lineups')
  const limit = Number(arg('limit') ?? 100)
  if (!slug) throw new Error('Falta --slug <competición> (ej. copa-argentina)')
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('--limit tiene que ser un entero positivo')
  }

  const key = process.env.HIGHLIGHTLY_API_KEY
  if (!key) throw new Error('Falta HIGHLIGHTLY_API_KEY')

  const prisma = new PrismaService()
  const provider = new HighlightlyProvider(
    new HighlightlyHttp({ get: () => key } as never),
  )
  const refs = new FootballRefsService(prisma, provider)

  try {
    const league = await prisma.leagues.findUnique({
      where: { slug },
      include: { current_season: true },
    })
    if (!league) throw new Error(`No existe la competición "${slug}"`)
    const season = Number(arg('season') ?? league.current_season?.season)

    const pending = await prisma.matches.findMany({
      where: {
        league_id: league.id,
        season,
        status_short: { in: FINISHED },
        OR: [
          { events_finalized: false },
          { stats_finalized: false },
          ...(withLineups
            ? [{ lineups: { none: {} } } as Prisma.MatchesWhereInput]
            : []),
        ],
      },
      select: {
        id: true,
        date: true,
        events_finalized: true,
        stats_finalized: true,
        lineups: { select: { id: true }, take: 1 },
        home_team: { select: { name: true } },
        away_team: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })

    const batch = pending.slice(0, limit)
    const requests = batch.reduce(
      (n, m) =>
        n +
        (m.events_finalized ? 0 : 1) +
        (m.stats_finalized ? 0 : 1) +
        (withLineups && m.lineups.length === 0 ? 1 : 0),
      0,
    )
    console.log(
      `${slug} ${season}: ${pending.length} partidos terminados con datos pendientes; esta corrida toma ${batch.length} y gastaría ${requests} pedidos.`,
    )
    if (!apply) {
      console.log('Dry-run: no se pidió ni se guardó nada. Usá --apply.')
      return
    }

    const done = { events: 0, stats: 0, lineups: 0, sinDatos: 0, errores: 0 }

    for (const m of batch) {
      const label = `${m.home_team.name} vs ${m.away_team.name} (${m.date.toISOString().slice(0, 10)})`
      try {
        const externalId = await refs.externalId('MATCH', m.id, null)
        if (externalId === null) {
          console.log(`  SIN VINCULAR ${label}`)
          done.errores++
          continue
        }

        if (!m.events_finalized) {
          const events = await provider.getEvents(externalId)
          const keys: string[] = []
          await prisma.$transaction(async (tx) => {
            for (const event of events) {
              const apiEventId = buildEventKey(event)
              keys.push(apiEventId)
              const team = event.team
                ? await refs.resolveTeam(tx, event.team)
                : null
              if (!team) continue
              const player = event.player
                ? await refs.resolvePlayer(tx, event.player)
                : null
              const assist = event.assist
                ? await refs.resolvePlayer(tx, event.assist)
                : null
              await upsertMatchEvent(
                tx,
                m.id,
                event,
                team.id,
                player?.id ?? null,
                assist?.id ?? null,
                apiEventId,
              )
            }
            await tx.matchEvents.deleteMany({
              where: { match_id: m.id, api_event_id: { notIn: keys } },
            })
            await tx.matches.update({
              where: { id: m.id },
              data: {
                events_fetched: true,
                events_fetched_at: new Date(),
                events_finalized: true,
              },
            })
          })
          done.events++
          if (events.length === 0) done.sinDatos++
        }

        if (!m.stats_finalized) {
          const stats = await provider.getMatchStatistics(externalId)
          await prisma.$transaction(async (tx) => {
            await upsertMatchStats(tx, m.id, stats, (team) =>
              refs.findTeam(tx, team),
            )
            // Sin estadísticas del proveedor no se marca como completo: quedaría
            // oculto un dato que todavía puede llegar.
            if (stats.length > 0) {
              await tx.matches.update({
                where: { id: m.id },
                data: { stats_fetched: true, stats_finalized: true },
              })
            }
          })
          if (stats.length > 0) done.stats++
          else done.sinDatos++
        }

        if (withLineups && m.lineups.length === 0) {
          const lineups = await provider.getLineups(externalId)
          if (lineups.length > 0) {
            await prisma.$transaction(async (tx) => {
              for (const lineup of lineups) {
                const team = await refs.resolveTeam(tx, {
                  externalId: lineup.team.externalId,
                  name: lineup.team.name,
                })
                if (!team) continue
                const matchLineup = await upsertMatchLineup(
                  tx,
                  m.id,
                  team.id,
                  lineup,
                )
                const saveGroup = async (
                  players: FootballLineupPlayer[],
                  isStarting: boolean,
                ) => {
                  for (const p of players) {
                    const player = await refs.resolvePlayer(tx, {
                      externalId: p.externalId,
                      name: p.name,
                      position: p.position,
                    })
                    if (!player) continue
                    await upsertMatchPlayer(
                      tx,
                      m.id,
                      team.id,
                      matchLineup.id,
                      player.id,
                      p,
                      isStarting,
                    )
                  }
                }
                await saveGroup(lineup.startXI, true)
                await saveGroup(lineup.substitutes, false)
              }
              await tx.matches.update({
                where: { id: m.id },
                data: { lineup_fetched: true, lineup_fetched_at: new Date() },
              })
            })
            done.lineups++
          }
        }
        console.log(`  OK ${label}`)
      } catch (error) {
        done.errores++
        console.log(
          `  ERROR ${label}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    console.log(
      `Listo: eventos ${done.events}, estadísticas ${done.stats}, alineaciones ${done.lineups}, sin datos en el proveedor ${done.sinDatos}, errores ${done.errores}.`,
    )
    if (pending.length > batch.length) {
      console.log(
        `Quedan ${pending.length - batch.length} partidos: repetí el comando.`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : error)
  process.exit(1)
})

/**
 * Corrige los partidos que quedaron congelados: ya pasó su hora y siguen en
 * SCHEDULED/LIVE porque se jugaron fuera de la ventana del sync del fixture
 * (10 días hacia atrás en la Liga) y ningún cron los volvió a mirar. Pasa
 * cuando el servidor estuvo apagado o en medio de un cambio de proveedor.
 *
 * Por defecto NO escribe nada (dry-run): pide el rango al proveedor, muestra qué
 * partidos cambiarían de estado y cuánto. Con --apply actualiza solo esos
 * partidos (estado, goles, penales, minuto y fecha), con los mismos campos que
 * el sync del fixture; se puede repetir, no duplica.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/resync-stale-fixtures.ts \
 *     --slug liga-profesional [--season 2026] [--from 2026-10-01] [--to 2026-10-31] [--apply]
 *
 * - Necesita HIGHLIGHTLY_API_KEY y los partidos vinculados en `ProviderRef`.
 * - Sin --from/--to usa el rango de los partidos congelados (un día de margen).
 * - Cuesta unos pocos pedidos (la lista de partidos del rango, paginada).
 * - No crea partidos, no toca rondas ni estadios, y no emite `match.finished`
 *   (igual que el sync del fixture). Después hay que correr
 *   backfill-match-details.ts para completar eventos y estadísticas.
 * - Si los partidos tienen mercados de apuestas, al quedar FINISHED el cron de
 *   apuestas los liquida: el dry-run lo avisa antes.
 */
import Redis from 'ioredis'
import { PrismaService } from '../src/prisma/prisma.service'
import { HighlightlyHttp } from '../src/football/providers/highlightly/highlightly.http'
import { HighlightlyProvider } from '../src/football/providers/highlightly/highlightly.provider'
import { mapStatus } from '../src/football/mappers/mapStatus'
import { FootballRefsService } from '../src/football/services/refs.service'

const GRACE_HOURS = 3

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)
const day = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

async function main() {
  const slug = arg('slug')
  const apply = flag('apply')
  if (!slug) throw new Error('Falta --slug <competición> (ej. liga-profesional)')

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

    const cutoff = new Date(Date.now() - GRACE_HOURS * 3_600_000)
    const stale = await prisma.matches.findMany({
      where: {
        league_id: league.id,
        season,
        status: { in: ['SCHEDULED', 'LIVE'] },
        date: { lt: cutoff },
      },
      select: {
        id: true,
        date: true,
        round: true,
        status: true,
        status_short: true,
        home_goals: true,
        away_goals: true,
        home_team: { select: { name: true } },
        away_team: { select: { name: true } },
        markets: { select: { id: true, status: true } },
      },
      orderBy: { date: 'asc' },
    })

    console.log(
      `${slug} ${season}: ${stale.length} partidos pasados sin terminar en la base.`,
    )
    if (stale.length === 0) return

    const withMarkets = stale.filter((m) => m.markets.length > 0)
    if (withMarkets.length > 0) {
      console.log(
        `ATENCIÓN: ${withMarkets.length} de esos partidos tienen mercados de apuestas; al quedar FINISHED el cron los liquida.`,
      )
    }

    const from = arg('from') ?? day(addDays(stale[0].date, -1))
    const to = arg('to') ?? day(addDays(stale[stale.length - 1].date, 1))

    const leagueExt = await refs.leagueExternalId(league)
    if (leagueExt === null) {
      throw new Error(`"${slug}" no tiene ID en ${refs.providerName}`)
    }
    const fixtures = await provider.getFixtures({
      leagueExternalId: leagueExt,
      season,
      from,
      to,
      includeDetails: false,
    })
    console.log(`Proveedor: ${fixtures.length} partidos entre ${from} y ${to}.`)

    const staleById = new Map(stale.map((m) => [m.id, m]))
    const changes: {
      id: string
      label: string
      data: Record<string, unknown>
    }[] = []
    let unlinked = 0
    let unchanged = 0
    const seen = new Set<string>()

    for (const f of fixtures) {
      const id = await refs.findInternalId('MATCH', f.externalId)
      if (!id) {
        unlinked++
        continue
      }
      const m = staleById.get(id)
      if (!m) continue
      seen.add(id)

      const data = {
        date: new Date(f.date),
        timestamp: f.timestamp,
        status: mapStatus(f.status.short),
        status_short: f.status.short,
        status_long: f.status.long,
        elapsed: f.status.elapsed,
        home_goals: f.goals.home ?? 0,
        away_goals: f.goals.away ?? 0,
        home_penalty_goals: f.penalty.home ?? null,
        away_penalty_goals: f.penalty.away ?? null,
      }
      if (data.status_short === m.status_short && data.status === m.status) {
        unchanged++
        continue
      }
      changes.push({
        id,
        label:
          `${m.round}: ${m.home_team.name} ${data.home_goals}-${data.away_goals} ${m.away_team.name} ` +
          `(${m.date.toISOString().slice(0, 10)}) ${m.status_short}->${data.status_short}`,
        data,
      })
    }

    const missing = stale.filter((m) => !seen.has(m.id))
    for (const c of changes) console.log(`  CAMBIA ${c.label}`)
    for (const m of missing) {
      console.log(
        `  SIN DATO ${m.round}: ${m.home_team.name} vs ${m.away_team.name} (${m.date.toISOString().slice(0, 10)})`,
      )
    }
    console.log(
      `Resumen: cambian ${changes.length} | sin cambios en el proveedor ${unchanged} | no aparecen en el rango ${missing.length} | del proveedor sin vincular ${unlinked}.`,
    )

    if (!apply) {
      console.log('Dry-run: no se escribió nada. Usá --apply.')
      return
    }

    for (const c of changes) {
      await prisma.matches.update({ where: { id: c.id }, data: c.data })
    }
    console.log(`APLICADO: ${changes.length} partidos actualizados.`)

    await clearCaches(changes.map((c) => c.id))
  } finally {
    await prisma.$disconnect()
  }
}

/** Borra los caches de fixtures y detalle para que el front vea el cambio ya. */
async function clearCaches(matchIds: string[]) {
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'redis',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  })
  try {
    await redis.connect()
    const keys = matchIds.map((id) => `match:details:v2:${id}`)
    let cursor = '0'
    do {
      const [next, found] = await redis.scan(
        cursor,
        'MATCH',
        'fixtures:*',
        'COUNT',
        200,
      )
      cursor = next
      keys.push(...found)
    } while (cursor !== '0')
    if (keys.length > 0) await redis.del(...keys)
    console.log(`Caches borrados: ${keys.length}.`)
  } catch (error) {
    console.log(
      `No pude borrar los caches (${error instanceof Error ? error.message : String(error)}); se renuevan solos al vencer su TTL.`,
    )
  } finally {
    redis.disconnect()
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})

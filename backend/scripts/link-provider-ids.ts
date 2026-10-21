/**
 * Vincula los equipos, partidos y la liga de la base con los IDs de otro proveedor
 * de datos deportivos (hoy: Highlightly) y los guarda en `ProviderRef`.
 *
 * Por defecto NO escribe nada (dry-run): calcula el plan y muestra el informe.
 * Con --apply escribe en `ProviderRef` solo filas nuevas y sin conflicto; se puede
 * repetir sin duplicar. Nunca modifica Teams, Matches ni Leagues.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/link-provider-ids.ts \
 *     --league-ext 109712 [--anchor 128] [--season 2026] \
 *     [--source-file matches.json] [--apply]
 *
 * Sin --source-file pide la temporada al proveedor (necesita HIGHLIGHTLY_API_KEY).
 * Con --source-file lee un JSON con los partidos crudos de Highlightly (array, o
 * un objeto con la propiedad `hl`), y no hace ningún pedido.
 */
import { FootballEntity, PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { FootballFixture } from '../src/football/football.types'
import { planLinks } from '../src/football/linking/plan-links'
import { mapMatch } from '../src/football/providers/highlightly/highlightly.mappers'
import { HighlightlyHttp } from '../src/football/providers/highlightly/highlightly.http'
import { HighlightlyProvider } from '../src/football/providers/highlightly/highlightly.provider'
import { HlMatch } from '../src/football/providers/highlightly/raw/highlightly.raw'

const PROVIDER = 'highlightly'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)

async function loadSource(
  leagueExt: number,
  season: number,
): Promise<FootballFixture[]> {
  const file = arg('source-file')
  if (file) {
    const json = JSON.parse(readFileSync(file, 'utf8')) as
      HlMatch[] | { hl: HlMatch[] }
    const raw = Array.isArray(json) ? json : json.hl
    console.log(`Origen: archivo ${file} (${raw.length} partidos, sin pedidos)`)
    return raw.map((m) => mapMatch(m))
  }

  const key = process.env.HIGHLIGHTLY_API_KEY
  if (!key) throw new Error('Falta HIGHLIGHTLY_API_KEY (o usá --source-file)')
  const http = new HighlightlyHttp({ get: () => key } as never)
  const provider = new HighlightlyProvider(http)
  const fixtures = await provider.getFixtures({
    leagueExternalId: leagueExt,
    season,
    from: `${season}-01-01`,
    to: `${season}-12-31`,
    includeDetails: false,
  })
  console.log(`Origen: ${PROVIDER} (${fixtures.length} partidos)`)
  return fixtures
}

async function main() {
  const leagueExt = Number(arg('league-ext'))
  const anchor = Number(arg('anchor') ?? 128)
  const season = Number(arg('season') ?? 2026)
  const apply = flag('apply')
  if (!leagueExt)
    throw new Error('Falta --league-ext <ID de la liga en el proveedor>')

  const prisma = new PrismaClient()
  try {
    const league = await prisma.leagues.findUnique({
      where: { api_league_id: anchor },
      select: { id: true, name: true },
    })
    if (!league)
      throw new Error(`No existe la liga con api_league_id=${anchor}`)

    const matchRows = await prisma.matches.findMany({
      where: { league_id: league.id, season },
      select: {
        id: true,
        home_team_id: true,
        away_team_id: true,
        round: true,
        date: true,
      },
    })
    const teamIds = new Set<string>()
    for (const m of matchRows) {
      teamIds.add(m.home_team_id)
      teamIds.add(m.away_team_id)
    }
    const standingsTeams = await prisma.teamSeasonStats.findMany({
      where: { league_id: league.id, season },
      select: { team_id: true },
      distinct: ['team_id'],
    })
    for (const s of standingsTeams) teamIds.add(s.team_id)

    const dbTeams = await prisma.teams.findMany({
      where: { id: { in: [...teamIds] } },
      select: { id: true, name: true },
    })
    const dbMatches = matchRows.map((m) => ({
      id: m.id,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      round: m.round,
      date: m.date,
    }))

    console.log(
      `Base: liga "${league.name}" ${season} — ${dbTeams.length} equipos, ${dbMatches.length} partidos`,
    )
    const source = await loadSource(leagueExt, season)
    const plan = planLinks(dbTeams, dbMatches, source)

    // ---------- informe ----------
    const by = (how: string) => plan.teams.filter((t) => t.how === how)
    console.log(`\nEQUIPOS: ${plan.teams.length}/${dbTeams.length} vinculados`)
    console.log(`  por nombre: ${by('nombre').length}`)
    for (const t of [...by('nombre aproximado'), ...by('calendario')]) {
      console.log(`  ${t.how}: ${t.teamName}  <->  ${t.externalName}`)
    }
    if (plan.teamsWithoutLink.length) {
      console.log(
        '  SIN VINCULAR:',
        plan.teamsWithoutLink.map((t) => t.name),
      )
    }
    if (plan.sourceTeamsUnused.length) {
      console.log(
        '  del proveedor sin usar:',
        plan.sourceTeamsUnused.map((t) => t.name),
      )
    }

    console.log(
      `\nPARTIDOS: ${plan.matches.length}/${dbMatches.length} vinculables` +
        ` | a revisar: ${plan.matchesToReview.length}` +
        ` | sin equivalente: ${plan.matchesWithoutLink.length}` +
        ` | solo en el proveedor: ${plan.sourceOnly.length}`,
    )
    const exact = plan.matches.filter((m) => m.diffHours < 0.01).length
    console.log(
      `  mismo horario: ${exact} | horario distinto: ${plan.matches.length - exact}` +
        ` | otra ronda: ${plan.matches.filter((m) => !m.sameRound).length}`,
    )
    for (const r of plan.matchesToReview.slice(0, 10)) {
      console.log(`  A REVISAR ${r.matchId}: ${r.reason}`)
    }
    for (const u of plan.matchesWithoutLink.slice(0, 10)) {
      console.log(
        `  SIN EQUIVALENTE ${u.match.id} (${u.match.round}): ${u.reason}`,
      )
    }

    // ---------- filas a escribir ----------
    const rows: {
      entity: FootballEntity
      entity_id: string
      external_id: number
    }[] = [
      { entity: 'LEAGUE', entity_id: league.id, external_id: leagueExt },
      ...plan.teams.map((t) => ({
        entity: 'TEAM' as const,
        entity_id: t.teamId,
        external_id: t.externalId,
      })),
      ...plan.matches.map((m) => ({
        entity: 'MATCH' as const,
        entity_id: m.matchId,
        external_id: m.externalId,
      })),
    ]

    const existing = await prisma.providerRef.findMany({
      where: { provider: PROVIDER },
      select: { entity: true, entity_id: true, external_id: true },
    })
    const sameEntity = new Map(
      existing.map((e) => [`${e.entity}|${e.entity_id}`, e.external_id]),
    )
    const sameExternal = new Map(
      existing.map((e) => [`${e.entity}|${e.external_id}`, e.entity_id]),
    )

    const toInsert: typeof rows = []
    const conflicts: string[] = []
    let already = 0
    for (const r of rows) {
      const byEntity = sameEntity.get(`${r.entity}|${r.entity_id}`)
      const byExternal = sameExternal.get(`${r.entity}|${r.external_id}`)
      if (byEntity === r.external_id && byExternal === r.entity_id) already += 1
      else if (byEntity !== undefined || byExternal !== undefined) {
        conflicts.push(
          `${r.entity} ${r.entity_id} -> ${r.external_id} (ya hay otro vínculo)`,
        )
      } else toInsert.push(r)
    }

    const count = (e: FootballEntity) =>
      toInsert.filter((r) => r.entity === e).length
    console.log(
      `\nESCRITURA en ProviderRef (${PROVIDER}): nuevas ${toInsert.length}` +
        ` (liga ${count('LEAGUE')}, equipos ${count('TEAM')}, partidos ${count('MATCH')})` +
        ` | ya vinculadas ${already} | conflictos ${conflicts.length}`,
    )
    for (const c of conflicts.slice(0, 10)) console.log('  CONFLICTO', c)

    if (!apply) {
      console.log(
        '\nDRY-RUN: no se escribió nada. Agregá --apply para aplicar.',
      )
      return
    }

    const result = await prisma.providerRef.createMany({
      data: toInsert.map((r) => ({ ...r, provider: PROVIDER })),
      skipDuplicates: true,
    })
    console.log(`\nAPLICADO: ${result.count} filas insertadas.`)

    const totals = await prisma.providerRef.groupBy({
      by: ['entity'],
      where: { provider: PROVIDER },
      _count: { _all: true },
    })
    console.log(
      'ProviderRef (highlightly) por entidad:',
      totals.map((t) => `${t.entity}=${t._count._all}`).join(' '),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : error)
  process.exit(1)
})

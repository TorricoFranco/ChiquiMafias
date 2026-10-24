/**
 * Prepara una temporada con los datos de otro proveedor deportivo (hoy:
 * Highlightly): vincula liga, equipos y partidos en `ProviderRef`, da de alta
 * los equipos nuevos con su escudo en Cloudinary y registra los participantes
 * en `LeagueTeams` (ERS RF-A09 a RF-A11b).
 *
 * Por defecto NO escribe nada (dry-run): calcula el plan y muestra el informe.
 * Con --apply escribe; se puede repetir sin duplicar.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/link-provider-ids.ts \
 *     --slug copa-argentina --season 2026 [--league-ext 111414] \
 *     [--source-file matches.json] [--decisions decisiones.json] [--apply]
 *
 * - La competición y la temporada tienen que existir en la base.
 * - --league-ext hace falta solo la primera vez; después sale de ProviderRef.
 * - Sin --source-file pide la temporada al proveedor (necesita
 *   HIGHLIGHTLY_API_KEY). Con --source-file lee un JSON con los partidos crudos
 *   de Highlightly (array, o un objeto con `hl` o `data`) y no hace pedidos.
 * - --decisions: si el archivo no existe, la pasada en seco lo escribe con los
 *   equipos a confirmar (`pending`) y a crear (`create`). Se edita a mano
 *   (`link` + `teamId`, `create` + `name`, `skip`) y se aplica con --apply.
 *   Sin archivo, los dudosos quedan sin vincular y los nuevos se crean.
 * - Los escudos se copian a Cloudinary para todos los participantes cuyo
 *   `logo_url` no esté ya en nuestra cuenta (necesita CLOUDINARY_*).
 */
import { FootballEntity, Prisma, PrismaClient } from '@prisma/client'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { CloudinaryService } from '../src/cloudinary/cloudinary.service'
import { FootballFixture } from '../src/football/football.types'
import { getFormatStrategy } from '../src/football/formats/format-registry'
import {
  buildDecisionsTemplate,
  parseDecisionsFile,
} from '../src/football/linking/decisions-file'
import {
  LinkPlan,
  planLinks,
  sourceTeamsOf,
  TeamDecision,
} from '../src/football/linking/plan-links'
import { mapMatch } from '../src/football/providers/highlightly/highlightly.mappers'
import { HighlightlyHttp } from '../src/football/providers/highlightly/highlightly.http'
import { HighlightlyProvider } from '../src/football/providers/highlightly/highlightly.provider'
import { HlMatch } from '../src/football/providers/highlightly/raw/highlightly.raw'

const PROVIDER = 'highlightly'
const BADGES_FOLDER = 'team-badges'

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
      HlMatch[] | { hl?: HlMatch[]; data?: HlMatch[] }
    const raw = Array.isArray(json) ? json : (json.hl ?? json.data ?? [])
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
    to: `${season + 1}-12-31`,
    includeDetails: false,
  })
  console.log(`Origen: ${PROVIDER} (${fixtures.length} partidos)`)
  return fixtures
}

/** Cloudinary con las variables de entorno, o null si faltan. */
function cloudinaryFromEnv(): CloudinaryService | null {
  const keys = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ]
  if (keys.some((k) => !process.env[k])) return null
  return new CloudinaryService({
    get: (key: string) => process.env[key],
  } as never)
}

function printPlan(plan: LinkPlan) {
  const by = (how: string) => plan.teams.filter((t) => t.how === how)
  console.log(
    `\nEQUIPOS: ya vinculados ${by('vínculo').length}` +
      ` | por nombre exacto ${by('nombre').length}` +
      ` | confirmados ${by('confirmado').length}` +
      ` | a confirmar ${plan.teamsToConfirm.length}` +
      ` | a crear ${plan.teamsToCreate.length}` +
      ` | salteados ${plan.teamsSkipped.length}`,
  )
  for (const t of [...by('nombre'), ...by('confirmado')]) {
    console.log(`  ${t.how}: ${t.externalName}  ->  ${t.teamName}`)
  }
  for (const t of plan.teamsToConfirm) {
    const options = t.candidates
      .map((c) => `${c.name} [${c.reason} ${c.score.toFixed(2)}]`)
      .join(', ')
    console.log(
      `  A CONFIRMAR: ${t.source.name} (${t.source.externalId}) ~ ${options}`,
    )
  }
  for (const t of plan.teamsToCreate) {
    const renamed = t.name !== t.source.name ? ` como "${t.name}"` : ''
    const closest = t.closest
      ? ` | más parecido: ${t.closest.name} (${t.closest.score.toFixed(2)})`
      : ''
    console.log(`  NUEVO: ${t.source.name}${renamed}${closest}`)
  }
  for (const e of plan.decisionErrors) console.log(`  ERROR DE DECISIÓN: ${e}`)

  console.log(
    `\nPARTIDOS: ${plan.matches.length} vinculables` +
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
}

async function main() {
  const slug = arg('slug')
  const apply = flag('apply')
  const decisionsPath = arg('decisions')
  if (!slug)
    throw new Error('Falta --slug <competición> (ej. liga-profesional)')

  const prisma = new PrismaClient()
  try {
    const league = await prisma.leagues.findUnique({
      where: { slug },
      include: { current_season: true },
    })
    if (!league) throw new Error(`No existe la competición "${slug}"`)

    const seasonYear = Number(arg('season') ?? league.current_season?.season)
    const season = await prisma.competitionSeason.findUnique({
      where: { league_id_season: { league_id: league.id, season: seasonYear } },
    })
    if (!season) {
      throw new Error(`No existe la temporada ${seasonYear} de "${slug}"`)
    }

    // ---------- ID de la liga en el proveedor ----------
    const leagueRef = await prisma.providerRef.findUnique({
      where: {
        entity_entity_id_provider: {
          entity: 'LEAGUE',
          entity_id: league.id,
          provider: PROVIDER,
        },
      },
    })
    const leagueExtArg = arg('league-ext') ? Number(arg('league-ext')) : null
    if (leagueRef && leagueExtArg && leagueRef.external_id !== leagueExtArg) {
      throw new Error(
        `"${slug}" ya está vinculada a ${leagueRef.external_id} en ${PROVIDER}; --league-ext ${leagueExtArg} no coincide`,
      )
    }
    const leagueExt = leagueRef?.external_id ?? leagueExtArg
    if (!leagueExt) {
      throw new Error(
        `"${slug}" no tiene ID en ${PROVIDER}: pasalo con --league-ext la primera vez`,
      )
    }

    // ---------- base ----------
    const teamRefs = await prisma.providerRef.findMany({
      where: { provider: PROVIDER, entity: 'TEAM' },
      select: { entity_id: true, external_id: true },
    })
    const externalOfTeam = new Map(
      teamRefs.map((r) => [r.entity_id, r.external_id]),
    )
    const allTeams = await prisma.teams.findMany({
      select: { id: true, name: true },
    })
    const dbTeams = allTeams.map((t) => ({
      ...t,
      linkedExternalId: externalOfTeam.get(t.id) ?? null,
    }))

    const matchRows = await prisma.matches.findMany({
      where: { league_id: league.id, season: seasonYear },
      select: {
        id: true,
        home_team_id: true,
        away_team_id: true,
        round: true,
        date: true,
      },
    })
    const dbMatches = matchRows.map((m) => ({
      id: m.id,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      round: m.round,
      date: m.date,
    }))

    console.log(
      `Base: ${league.name} ${season.label} (${season.format}) — ${dbTeams.length} equipos en total, ${dbMatches.length} partidos de la temporada`,
    )
    const source = await loadSource(leagueExt, seasonYear)

    // ---------- decisiones ----------
    const meta = { competition: slug, season: seasonYear, provider: PROVIDER }
    let decisions: Record<number, TeamDecision> = {}
    const decisionsExist = !!decisionsPath && existsSync(decisionsPath)
    if (decisionsExist) {
      decisions = parseDecisionsFile(
        JSON.parse(readFileSync(decisionsPath, 'utf8')),
        meta,
      )
      console.log(
        `Decisiones: ${decisionsPath} (${Object.keys(decisions).length})`,
      )
    }

    // Ronda traducida por la estrategia del formato, para cruzar partidos.
    const strategy = getFormatStrategy(season.format)
    const rounds = strategy?.resolveRounds(source).map((r) => r.round)
    const plan = planLinks(dbTeams, dbMatches, source, { decisions, rounds })
    printPlan(plan)

    if (decisionsPath && !decisionsExist) {
      const template = buildDecisionsTemplate(plan, meta)
      if (template.teams.length === 0) {
        console.log('\nDecisiones: no hay equipos para decidir.')
      } else {
        writeFileSync(decisionsPath, JSON.stringify(template, null, 2) + '\n')
        console.log(
          `\nDecisiones: escribí ${decisionsPath}. Editalo y volvé a correr con --decisions ${decisionsPath}.`,
        )
      }
    }

    // ---------- vínculos a escribir ----------
    const rows: {
      entity: FootballEntity
      entity_id: string
      external_id: number
    }[] = [
      ...(leagueRef
        ? []
        : [
            {
              entity: 'LEAGUE' as const,
              entity_id: league.id,
              external_id: leagueExt,
            },
          ]),
      ...plan.teams
        .filter((t) => t.how !== 'vínculo')
        .map((t) => ({
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

    const participants = plan.teams.map((t) => t.teamId)
    console.log(
      `PARTICIPANTES (LeagueTeams ${seasonYear}): ${participants.length} vinculados + ${plan.teamsToCreate.length} nuevos`,
    )

    const cloudinary = cloudinaryFromEnv()
    if (!cloudinary) {
      console.log('ESCUDOS: faltan las variables CLOUDINARY_*; no se copian.')
    }

    if (!apply) {
      console.log(
        '\nDRY-RUN: no se escribió nada. Agregá --apply para aplicar.',
      )
      return
    }
    if (plan.decisionErrors.length) {
      throw new Error(
        'Hay decisiones que no se pueden aplicar (ver ERROR DE DECISIÓN): corregí el archivo.',
      )
    }

    // 1. Equipos nuevos: el equipo y su vínculo en la misma transacción.
    const logoOf = new Map(
      sourceTeamsOf(source).map((t) => [t.externalId, t.logo]),
    )
    const sourceLogoOfTeam = new Map(
      plan.teams.map((t) => [t.teamId, logoOf.get(t.externalId) ?? null]),
    )
    let created = 0
    for (const t of plan.teamsToCreate) {
      try {
        const team = await prisma.$transaction(async (tx) => {
          const row = await tx.teams.create({
            data: { name: t.name, country: t.source.country },
            select: { id: true },
          })
          await tx.providerRef.create({
            data: {
              entity: 'TEAM',
              entity_id: row.id,
              provider: PROVIDER,
              external_id: t.source.externalId,
            },
          })
          return row
        })
        participants.push(team.id)
        sourceLogoOfTeam.set(team.id, t.source.logo)
        created += 1
      } catch (error) {
        const reason =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
            ? 'su ID ya está vinculado a otro equipo'
            : error instanceof Error
              ? error.message
              : String(error)
        console.log(
          `  NO SE CREÓ ${t.name} (${t.source.externalId}): ${reason}`,
        )
      }
    }

    // 2. Vínculos de liga, equipos y partidos.
    const result = await prisma.providerRef.createMany({
      data: toInsert.map((r) => ({ ...r, provider: PROVIDER })),
      skipDuplicates: true,
    })

    // 3. Participantes de la temporada.
    const leagueTeams = await prisma.leagueTeams.createMany({
      data: participants.map((teamId) => ({
        league_id: league.id,
        team_id: teamId,
        season: seasonYear,
      })),
      skipDuplicates: true,
    })

    console.log(
      `\nAPLICADO: ${created} equipos creados, ${result.count} vínculos, ${leagueTeams.count} participantes nuevos.`,
    )

    // 4. Escudos: se copia el actual (o el del proveedor) a Cloudinary.
    if (cloudinary) {
      const teams = await prisma.teams.findMany({
        where: { id: { in: participants } },
        select: { id: true, name: true, logo_url: true },
      })
      let copied = 0
      const failed: string[] = []
      for (const team of teams) {
        if (cloudinary.isHostedUrl(team.logo_url)) continue
        const from = team.logo_url?.startsWith('https://')
          ? team.logo_url
          : sourceLogoOfTeam.get(team.id)
        if (!from) {
          failed.push(`${team.name}: sin imagen de origen`)
          continue
        }
        try {
          const url = await cloudinary.uploadRemoteImage(
            from,
            BADGES_FOLDER,
            `team_${team.id}`,
          )
          await prisma.teams.update({
            where: { id: team.id },
            data: { logo_url: url },
          })
          copied += 1
        } catch (error) {
          failed.push(
            `${team.name}: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
      console.log(
        `ESCUDOS: ${copied} copiados a Cloudinary | fallidos ${failed.length}`,
      )
      for (const f of failed) console.log(`  SIN ESCUDO ${f}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : error)
  process.exit(1)
})

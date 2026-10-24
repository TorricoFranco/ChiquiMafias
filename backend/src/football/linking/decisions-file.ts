import { LinkPlan, TeamDecision } from './plan-links'

/**
 * Archivo de decisiones del script de vinculación. La pasada en seco lo escribe
 * con los equipos a confirmar (`pending`) y a crear (`create`); se edita a mano
 * y se aplica con `--apply --decisions <archivo>`.
 *
 * Acciones: `link` (con `teamId`), `create` (con `name` opcional para corregir
 * el nombre del proveedor), `skip` y `pending` (sin decidir todavía).
 */
export interface DecisionsFile {
  competition: string
  season: number
  provider: string
  teams: DecisionEntry[]
}

export interface DecisionEntry {
  externalId: number
  providerName: string
  action: TeamDecision['action']
  teamId?: string | null
  name?: string
  /** Solo informativo: no se lee al aplicar. */
  candidates?: { teamId: string; name: string; score: number; reason: string }[]
  /** Solo informativo: equipo de la base más parecido a uno nuevo. */
  closest?: string | null
}

const ACTIONS: TeamDecision['action'][] = ['link', 'create', 'skip', 'pending']

export function buildDecisionsTemplate(
  plan: LinkPlan,
  meta: Omit<DecisionsFile, 'teams'>,
): DecisionsFile {
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    ...meta,
    teams: [
      ...plan.teamsToConfirm.map((t): DecisionEntry => ({
        externalId: t.source.externalId,
        providerName: t.source.name,
        action: 'pending',
        teamId: null,
        candidates: t.candidates.map((c) => ({ ...c, score: round(c.score) })),
      })),
      ...plan.teamsToCreate.map((t): DecisionEntry => ({
        externalId: t.source.externalId,
        providerName: t.source.name,
        action: 'create',
        name: t.name,
        closest: t.closest
          ? `${t.closest.name} (${round(t.closest.score)})`
          : null,
      })),
    ],
  }
}

/**
 * Valida el archivo editado. Cualquier error rechaza el archivo entero: nunca
 * se aplica la mitad de las decisiones.
 */
export function parseDecisionsFile(
  json: unknown,
  expected: Omit<DecisionsFile, 'teams'>,
): Record<number, TeamDecision> {
  const file = json as Partial<DecisionsFile> | null
  const errors: string[] = []

  if (!file || typeof file !== 'object' || !Array.isArray(file.teams)) {
    throw new Error('El archivo de decisiones no tiene la lista "teams".')
  }
  for (const key of ['competition', 'season', 'provider'] as const) {
    if (file[key] !== expected[key]) {
      errors.push(
        `"${key}" es ${JSON.stringify(file[key])} y se esperaba ${JSON.stringify(expected[key])}`,
      )
    }
  }

  const decisions: Record<number, TeamDecision> = {}
  for (const [i, entry] of file.teams.entries()) {
    const where = `teams[${i}]`
    if (!Number.isInteger(entry?.externalId)) {
      errors.push(`${where}: falta "externalId"`)
      continue
    }
    if (decisions[entry.externalId]) {
      errors.push(`${where}: el ID ${entry.externalId} está repetido`)
      continue
    }
    if (!ACTIONS.includes(entry.action)) {
      errors.push(
        `${where} (${entry.providerName}): acción "${entry.action}" inválida; usá ${ACTIONS.join(', ')}`,
      )
      continue
    }

    if (entry.action === 'link') {
      if (typeof entry.teamId !== 'string' || !entry.teamId) {
        errors.push(
          `${where} (${entry.providerName}): "link" necesita "teamId"`,
        )
        continue
      }
      decisions[entry.externalId] = { action: 'link', teamId: entry.teamId }
    } else if (entry.action === 'create') {
      if (entry.name !== undefined && typeof entry.name !== 'string') {
        errors.push(`${where} (${entry.providerName}): "name" debe ser texto`)
        continue
      }
      decisions[entry.externalId] = { action: 'create', name: entry.name }
    } else {
      decisions[entry.externalId] = { action: entry.action }
    }
  }

  if (errors.length) {
    throw new Error(`Archivo de decisiones inválido:\n  ${errors.join('\n  ')}`)
  }
  return decisions
}

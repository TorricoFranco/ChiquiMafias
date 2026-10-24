/**
 * Armado del cuadro de una eliminación directa a partir de los partidos (ERS
 * §6.3). Funciones puras: `BracketService` lee la base y guarda el resultado.
 *
 * Rondas numeradas desde 1 (32avos) hasta `roundCount` (final). La ronda `r`
 * tiene 2^(roundCount - r) llaves, y el ganador de la llave `p` (desde 1) va a
 * la llave ceil(p / 2) de la ronda siguiente: local si `p` es impar.
 */

export interface KnockoutMatch {
  id: string
  roundOrder: number
  date: Date
  homeTeamId: string
  awayTeamId: string
  statusShort: string
  homeGoals: number | null
  awayGoals: number | null
  homePenalties: number | null
  awayPenalties: number | null
}

export interface BracketSlotState {
  roundOrder: number
  position: number
  matchId: string | null
  homeTeamId: string | null
  awayTeamId: string | null
  winnerTeamId: string | null
}

const FINISHED = ['FT', 'AET', 'PEN', 'AWD', 'WO']

export const slotsInRound = (roundCount: number, roundOrder: number) =>
  2 ** (roundCount - roundOrder)

/**
 * Ganador de un partido terminado: el de más goles y, si empataron, el de más
 * penales (ERS RF-B06). Un resultado en escritorio sin marcador que lo defina
 * queda sin ganador: lo corrige el presidente (RF-B12).
 */
export function matchWinner(m: KnockoutMatch): string | null {
  if (!FINISHED.includes(m.statusShort)) return null
  const goals = [m.homeGoals ?? 0, m.awayGoals ?? 0]
  if (goals[0] !== goals[1]) {
    return goals[0] > goals[1] ? m.homeTeamId : m.awayTeamId
  }
  if (m.homePenalties !== null && m.awayPenalties !== null) {
    if (m.homePenalties !== m.awayPenalties) {
      return m.homePenalties > m.awayPenalties ? m.homeTeamId : m.awayTeamId
    }
  }
  return null
}

const byDate = (a: KnockoutMatch, b: KnockoutMatch) =>
  a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id)

/**
 * Ubica cada partido en su llave, reconstruyendo el cuadro desde lo jugado:
 *
 * 1. La ronda más alta con partidos se ordena por fecha.
 * 2. Hacia abajo, los dos partidos de los que salió cada llave ya ubicada van
 *    debajo de ella: el del local en la llave impar y el del visitante en la par.
 * 3. Los que no se pueden ubicar así (su ronda siguiente todavía no se jugó)
 *    ocupan, por fecha, los lugares que cuelgan de llaves sin partido.
 *
 * El cuadro queda con las llaves reales; puede quedar espejado respecto del
 * dibujo oficial. Devuelve el partido de cada llave, por ronda (índice 0 =
 * llave 1). Los que no entran en ningún lugar se devuelven aparte.
 *
 * Las llaves corregidas a mano quedan ocupadas: nunca se pisan, y los partidos
 * de los que salieron sus equipos se ubican debajo de ellas.
 */
export function layoutFromMatches(
  matches: KnockoutMatch[],
  roundCount: number,
  corrected: CorrectedSlots = new Map(),
): { positions: (KnockoutMatch | null)[][]; unplaced: KnockoutMatch[] } {
  const byRound = new Map<number, KnockoutMatch[]>()
  for (const m of matches) {
    if (m.roundOrder < 1 || m.roundOrder > roundCount) continue
    const list = byRound.get(m.roundOrder) ?? []
    list.push(m)
    byRound.set(m.roundOrder, list)
  }
  for (const list of byRound.values()) list.sort(byDate)

  const positions: (KnockoutMatch | null)[][] = []
  for (let r = 1; r <= roundCount; r++) {
    positions[r] = Array<KnockoutMatch | null>(
      slotsInRound(roundCount, r),
    ).fill(null)
  }
  const unplaced: KnockoutMatch[] = []

  // Desde la ronda más alta con partidos o con una corrección: la corrección
  // también reparte equipos hacia abajo.
  const rounds = [
    ...byRound.keys(),
    ...[...corrected.values()].map((s) => s.roundOrder),
  ].filter((r) => r >= 1 && r <= roundCount)
  if (rounds.length === 0) return { positions, unplaced }
  const top = Math.max(...rounds)

  const isCorrected = (r: number, i: number) => corrected.has(`${r}:${i + 1}`)

  const placeInFree = (r: number, list: KnockoutMatch[], allowed: number[]) => {
    for (const m of list) {
      const free = allowed.find(
        (i) => positions[r][i] === null && !isCorrected(r, i),
      )
      if (free === undefined) unplaced.push(m)
      else positions[r][free] = m
    }
  }

  placeInFree(
    top,
    byRound.get(top) ?? [],
    positions[top].map((_, i) => i),
  )

  for (let r = top - 1; r >= 1; r--) {
    const pending = [...(byRound.get(r) ?? [])]
    const take = (teamId: string) => {
      const i = pending.findIndex(
        (m) => m.homeTeamId === teamId || m.awayTeamId === teamId,
      )
      return i === -1 ? null : pending.splice(i, 1)[0]
    }

    const underEmptyParent: number[] = []
    positions[r + 1].forEach((parent, q) => {
      // Una llave corregida reparte sus equipos como si tuviera partido.
      const fixed = corrected.get(`${r + 1}:${q + 1}`)
      const teams = fixed
        ? [fixed.homeTeamId, fixed.awayTeamId]
        : parent
          ? [parent.homeTeamId, parent.awayTeamId]
          : [null, null]
      teams.forEach((teamId, side) => {
        const child = 2 * q + side
        if (isCorrected(r, child)) return
        if (teamId) positions[r][child] = take(teamId)
        else underEmptyParent.push(child)
      })
    })
    placeInFree(r, pending, underEmptyParent)
  }

  return { positions, unplaced }
}

/** Cruces de la primera ronda según el sorteo, de arriba hacia abajo: [local, visitante]. */
export type DrawPairs = readonly (readonly [string, string])[]

/** Llaves corregidas a mano, por `${ronda}:${lugar}`. */
export type CorrectedSlots = Map<string, BracketSlotState>

/**
 * Ubica cada partido según el sorteo: la llave `p` de la ronda `r` reúne a los
 * equipos de los cruces de primera ronda que cuelgan de ella, así que un
 * partido va a la única llave que contiene a sus dos equipos. Si sus equipos
 * no pueden cruzarse en esa ronda según el sorteo (o no están en él), o si su
 * llave está corregida a mano, queda aparte para revisar.
 */
export function layoutFromDraw(
  matches: KnockoutMatch[],
  roundCount: number,
  pairs: DrawPairs,
  corrected: CorrectedSlots = new Map(),
): { positions: (KnockoutMatch | null)[][]; unplaced: KnockoutMatch[] } {
  const positions: (KnockoutMatch | null)[][] = []
  for (let r = 1; r <= roundCount; r++) {
    positions[r] = Array<KnockoutMatch | null>(
      slotsInRound(roundCount, r),
    ).fill(null)
  }
  const firstRoundIndex = new Map<string, number>()
  pairs.forEach(([home, away], i) => {
    firstRoundIndex.set(home, i)
    firstRoundIndex.set(away, i)
  })

  const unplaced: KnockoutMatch[] = []
  for (const m of [...matches].sort(byDate)) {
    const h = firstRoundIndex.get(m.homeTeamId)
    const a = firstRoundIndex.get(m.awayTeamId)
    if (m.roundOrder < 1 || m.roundOrder > roundCount) continue
    const size = 2 ** (m.roundOrder - 1)
    const slot = h === undefined ? -1 : Math.floor(h / size)
    if (
      h === undefined ||
      a === undefined ||
      slot !== Math.floor(a / size) ||
      positions[m.roundOrder][slot] !== null ||
      corrected.has(`${m.roundOrder}:${slot + 1}`)
    ) {
      unplaced.push(m)
      continue
    }
    positions[m.roundOrder][slot] = m
  }
  return { positions, unplaced }
}

/**
 * Estado de cada llave: con partido, sus equipos y su ganador; sin partido,
 * los ganadores de las dos llaves de las que sale (el cuadro avanza solo).
 */
export function computeSlots(
  positions: (KnockoutMatch | null)[][],
  roundCount: number,
  /** Llaves corregidas a mano: se respetan y su ganador avanza. */
  corrected: CorrectedSlots = new Map(),
  /** Con sorteo, los equipos de las llaves de primera ronda que todavía no tienen partido. */
  firstRoundPairs?: DrawPairs,
): BracketSlotState[] {
  const slots: BracketSlotState[][] = []
  for (let r = 1; r <= roundCount; r++) {
    slots[r] = positions[r].map((m, i) => {
      const fixed = corrected.get(`${r}:${i + 1}`)
      if (fixed) return fixed
      if (m) {
        return {
          roundOrder: r,
          position: i + 1,
          matchId: m.id,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          winnerTeamId: matchWinner(m),
        }
      }
      const children = r > 1 ? slots[r - 1] : null
      const drawn = r === 1 ? firstRoundPairs?.[i] : undefined
      return {
        roundOrder: r,
        position: i + 1,
        matchId: null,
        homeTeamId: drawn?.[0] ?? children?.[2 * i]?.winnerTeamId ?? null,
        awayTeamId: drawn?.[1] ?? children?.[2 * i + 1]?.winnerTeamId ?? null,
        winnerTeamId: null,
      }
    })
  }
  return slots.slice(1).flat()
}

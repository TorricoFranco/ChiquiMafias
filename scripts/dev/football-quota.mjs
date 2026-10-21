// Calculadora de cuota diaria de pedidos al proveedor de datos deportivos.
//
//   node scripts/dev/football-quota.mjs
//
// Para sumar una liga (Copa Argentina, B Nacional, Libertadores...) completá un
// bloque en LEAGUES con `enabled: true` y sus números. No hace ningún pedido.
// Los intervalos salen de los crons de backend/src/football/cron/*.

const DAILY_LIMIT = 7500 // x-ratelimit-requests-limit de Highlightly (plan PRO)
const PAGE_SIZE = 100

// --- Intervalos actuales de los crons (minutos) ---
const CRON = {
  fixturesSyncMin: 10, // FixturesSyncCron: temporada completa paginada
  standingsMin: 10, // StandingCron: 1 pedido por vuelta
  liveRefreshMin: 1, // LiveScoreCron con Highlightly (la API refresca cada ~1 min)
  eventsMin: 1, // EventsFetchCron: 1 pedido por partido seguido
  statsMin: 3, // StatsSyncCron: 1 pedido por partido en juego
  lineupsMin: 5, // LineupsFetchCron: hasta que aparece la alineación
}

// --- Duración de un partido dentro del sistema (minutos) ---
const MATCH = {
  preKickoffTrackedMin: 30, // PrematchTracker lo marca `tracked` 30 min antes
  playMin: 110, // 90 + descanso + descuento (sin alargue)
  lineupCallsPerMatch: 6, // ~30 min de espera / 5 min
  prematchCallsPerMatch: 3, // h2h + forma local + forma visitante (cache 1 h)
}

// --- Ligas ---
// seasonMatches: partidos de la temporada (define cuántas páginas de 100 hay)
// roundMatches: partidos por fecha
// liveCallsPerTick: 1, o 2 si hay partidos que cruzan la medianoche UTC (21:00 ART)
const LEAGUES = [
  {
    name: 'Liga Profesional',
    enabled: true,
    seasonMatches: 495,
    roundMatches: 15,
    liveCallsPerTick: 2,
  },
  {
    name: 'Copa Argentina',
    enabled: false, // ESTIMADO: completá con el dato real
    seasonMatches: 63,
    roundMatches: 16,
    liveCallsPerTick: 2,
  },
  {
    name: 'B Nacional',
    enabled: false, // ESTIMADO: completá con el dato real
    seasonMatches: 700,
    roundMatches: 18,
    liveCallsPerTick: 2,
  },
  {
    name: 'Copa Libertadores',
    enabled: false, // ESTIMADO: completá con el dato real
    seasonMatches: 190,
    roundMatches: 8,
    liveCallsPerTick: 2,
  },
  {
    name: 'Copa Sudamericana',
    enabled: false, // ESTIMADO: completá con el dato real
    seasonMatches: 190,
    roundMatches: 8,
    liveCallsPerTick: 2,
  },
]

// --- Escenarios de un día con partidos ---
// `maxSimultaneous` es cuántos partidos se juegan a la vez (olas de ese tamaño).
const SCENARIOS = [
  { name: 'Día tranquilo (3 partidos, 3 a la vez)', matches: 3, maxSimultaneous: 3 },
  { name: 'Día normal (7 partidos, 4 a la vez)', matches: 7, maxSimultaneous: 4 },
  { name: 'Pico: 7 a la vez (14 partidos en 2 olas)', matches: 14, maxSimultaneous: 7 },
  { name: 'Tope: fecha completa en un día (15 partidos, 7 a la vez)', matches: 15, maxSimultaneous: 7 },
]

const perDay = (everyMin) => 1440 / everyMin
const pages = (n) => Math.ceil(n / PAGE_SIZE)

/** Pedidos de un día sin partidos de la liga. */
function baseDay(league, opts) {
  return {
    fixturesSync: perDay(opts.fixturesSyncMin) * pages(league.seasonMatches),
    standingsCron: perDay(CRON.standingsMin),
  }
}

/** Pedidos extra de un día con `matches` partidos de la liga. */
function matchDay(league, matches, maxSimultaneous, opts) {
  const waves = Math.ceil(matches / maxSimultaneous)
  const trackedMin = opts.skipPreKickoffEvents
    ? MATCH.playMin
    : MATCH.preKickoffTrackedMin + MATCH.playMin
  const liveMinutes = waves * (MATCH.preKickoffTrackedMin + MATCH.playMin)

  return {
    live: (liveMinutes / CRON.liveRefreshMin) * league.liveCallsPerTick,
    events: matches * (trackedMin / CRON.eventsMin),
    stats: opts.sharedMatchDetail
      ? 0
      : matches * Math.ceil(MATCH.playMin / CRON.statsMin),
    lineups: matches * MATCH.lineupCallsPerMatch,
    standingsAfterMatch: matches,
    prematch: matches * MATCH.prematchCallsPerMatch,
    details: matches, // estadio y árbitro, una vez por partido
    peakPerMinute:
      maxSimultaneous / CRON.eventsMin +
      (opts.sharedMatchDetail ? 0 : maxSimultaneous / CRON.statsMin) +
      league.liveCallsPerTick / CRON.liveRefreshMin,
  }
}

const sum = (o) =>
  Object.entries(o)
    .filter(([k]) => k !== 'peakPerMinute')
    .reduce((a, [, v]) => a + v, 0)

function report(title, opts) {
  const leagues = LEAGUES.filter((l) => l.enabled)
  console.log(`\n=== ${title} ===`)
  console.log(`Ligas activas: ${leagues.map((l) => l.name).join(', ')}`)

  const base = leagues.reduce((a, l) => a + sum(baseDay(l, opts)), 0)
  console.log(
    `Día SIN partidos: ${Math.round(base)} pedidos (${((base / DAILY_LIMIT) * 100).toFixed(1)}% de ${DAILY_LIMIT})`,
  )

  for (const s of SCENARIOS) {
    // Los partidos del escenario se reparten entre las ligas por igual (peor caso:
    // todos en la misma liga se calcula con la liga más cara).
    const worst = leagues.map((l) => ({
      league: l,
      day: matchDay(l, s.matches, s.maxSimultaneous, opts),
    }))
    const extra = Math.max(...worst.map((w) => sum(w.day)))
    const peakMin = Math.max(...worst.map((w) => w.day.peakPerMinute))
    const total = base + extra
    const pct = ((total / DAILY_LIMIT) * 100).toFixed(1)
    console.log(
      `${s.name}: ${Math.round(total)} pedidos/día (${pct}%), pico ~${peakMin.toFixed(1)}/min` +
        (total > DAILY_LIMIT ? '  ⚠ SUPERA EL LÍMITE' : ''),
    )
  }
}

report('Configuración ACTUAL de los crons', {
  fixturesSyncMin: CRON.fixturesSyncMin,
  skipPreKickoffEvents: false,
  sharedMatchDetail: false,
})

report('Optimizada (fixtures cada 30 min, eventos desde el pitazo, stats del detalle)', {
  fixturesSyncMin: 30,
  skipPreKickoffEvents: true,
  sharedMatchDetail: true,
})

// Desglose de un día pico, para ver qué cron pesa más.
const l0 = LEAGUES.find((l) => l.enabled)
const peak = SCENARIOS[2]
console.log(`\nDesglose "${peak.name}" en ${l0.name} (config actual):`)
console.table({
  ...Object.fromEntries(
    Object.entries(baseDay(l0, { fixturesSyncMin: CRON.fixturesSyncMin })).map(
      ([k, v]) => [k, Math.round(v)],
    ),
  ),
  ...Object.fromEntries(
    Object.entries(
      matchDay(l0, peak.matches, peak.maxSimultaneous, {
        skipPreKickoffEvents: false,
        sharedMatchDetail: false,
      }),
    )
      .filter(([k]) => k !== 'peakPerMinute')
      .map(([k, v]) => [k, Math.round(v)]),
  ),
})

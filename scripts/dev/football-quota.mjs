// Calculadora de cuota diaria de pedidos al proveedor de datos deportivos.
//
//   node scripts/dev/football-quota.mjs
//
// Para sumar una liga (B Nacional, Libertadores...) completá un bloque en
// LEAGUES con `enabled: true` y sus números. No hace ningún pedido.
// Los intervalos salen de los crons de backend/src/football/cron/* y, desde la
// fase 4 del ERS, la frecuencia del fixture y de la tabla es de cada temporada
// (`CompetitionSeason.fixtures_sync_minutes` / `standings_sync_minutes`).

const DAILY_LIMIT = 7500 // x-ratelimit-requests-limit de Highlightly (plan PRO)
const PAGE_SIZE = 100

// --- Intervalos actuales de los crons (minutos) ---
const CRON = {
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
// fixturesSyncMin / standingsMin: frecuencia de la temporada (null = sin tabla)
// liveCallsPerTick: 1, o 2 si hay partidos que cruzan la medianoche UTC (21:00 ART)
const LEAGUES = [
  {
    name: 'Liga Profesional',
    enabled: true,
    seasonMatches: 495,
    roundMatches: 15,
    fixturesSyncMin: 10,
    standingsMin: 10,
    liveCallsPerTick: 2,
  },
  {
    // Datos reales de Highlightly (2025 y 2026): 63 partidos, la ronda más grande
    // es 32avos, una vez por día y sin tabla (migración add_copa_argentina).
    name: 'Copa Argentina',
    enabled: true,
    seasonMatches: 63,
    roundMatches: 32,
    fixturesSyncMin: 1440,
    standingsMin: null,
    liveCallsPerTick: 2,
  },
  {
    name: 'B Nacional',
    enabled: false, // ESTIMADO: completá con el dato real
    seasonMatches: 700,
    roundMatches: 18,
    fixturesSyncMin: 10,
    standingsMin: 10,
    liveCallsPerTick: 2,
  },
  {
    name: 'Copa Libertadores',
    enabled: false, // ESTIMADO: completá con el dato real
    seasonMatches: 190,
    roundMatches: 8,
    fixturesSyncMin: 60,
    standingsMin: 60,
    liveCallsPerTick: 2,
  },
  {
    name: 'Copa Sudamericana',
    enabled: false, // ESTIMADO: completá con el dato real
    seasonMatches: 190,
    roundMatches: 8,
    fixturesSyncMin: 60,
    standingsMin: 60,
    liveCallsPerTick: 2,
  },
]

// --- Escenarios de un día con partidos ---
// `maxSimultaneous` es cuántos partidos se juegan a la vez (olas de ese tamaño).
// Con `perLeague`, cada liga juega sus partidos ese mismo día y se suman.
const SCENARIOS = [
  { name: 'Día tranquilo (3 partidos, 3 a la vez)', matches: 3, maxSimultaneous: 3 },
  { name: 'Día normal (7 partidos, 4 a la vez)', matches: 7, maxSimultaneous: 4 },
  { name: 'Pico: 7 a la vez (14 partidos en 2 olas)', matches: 14, maxSimultaneous: 7 },
  { name: 'Tope: fecha completa en un día (15 partidos, 7 a la vez)', matches: 15, maxSimultaneous: 7 },
  {
    name: 'Liga + Copa el mismo día (7 de Liga 4 a la vez + 2 de Copa)',
    perLeague: {
      'Liga Profesional': { matches: 7, maxSimultaneous: 4 },
      'Copa Argentina': { matches: 2, maxSimultaneous: 1 },
    },
  },
  {
    name: 'Peor día con Copa (15 de Liga 7 a la vez + 4 de Copa 2 a la vez)',
    perLeague: {
      'Liga Profesional': { matches: 15, maxSimultaneous: 7 },
      'Copa Argentina': { matches: 4, maxSimultaneous: 2 },
    },
  },
]

const perDay = (everyMin) => 1440 / everyMin
const pages = (n) => Math.ceil(n / PAGE_SIZE)

/** Pedidos de un día sin partidos de la liga. */
function baseDay(league, opts) {
  // La optimización estira el fixture a `opts.minFixturesSyncMin`, nunca lo acorta.
  const fixturesMin = Math.max(league.fixturesSyncMin, opts.minFixturesSyncMin ?? 0)
  return {
    fixturesSync: perDay(fixturesMin) * pages(league.seasonMatches),
    standingsCron: league.standingsMin ? perDay(league.standingsMin) : 0,
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
    standingsAfterMatch: league.standingsMin ? matches : 0,
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
    let extra
    let peakMin
    if (s.perLeague) {
      // Cada liga juega sus partidos el mismo día: se suman, y el pico también.
      const days = leagues
        .filter((l) => s.perLeague[l.name])
        .map((l) => matchDay(l, s.perLeague[l.name].matches, s.perLeague[l.name].maxSimultaneous, opts))
      extra = days.reduce((a, d) => a + sum(d), 0)
      peakMin = days.reduce((a, d) => a + d.peakPerMinute, 0)
    } else {
      // Todos los partidos en la misma liga: se calcula con la liga más cara.
      const worst = leagues.map((l) => matchDay(l, s.matches, s.maxSimultaneous, opts))
      extra = Math.max(...worst.map(sum))
      peakMin = Math.max(...worst.map((d) => d.peakPerMinute))
    }
    const total = base + extra
    const pct = ((total / DAILY_LIMIT) * 100).toFixed(1)
    console.log(
      `${s.name}: ${Math.round(total)} pedidos/día (${pct}%), pico ~${peakMin.toFixed(1)}/min` +
        (total > DAILY_LIMIT ? '  ⚠ SUPERA EL LÍMITE' : ''),
    )
  }
}

report('Configuración ACTUAL de los crons', {
  skipPreKickoffEvents: false,
  sharedMatchDetail: false,
})

report('Optimizada (fixtures cada 30 min como mínimo, eventos desde el pitazo, stats del detalle)', {
  minFixturesSyncMin: 30,
  skipPreKickoffEvents: true,
  sharedMatchDetail: true,
})

// Desglose de un día pico, para ver qué cron pesa más.
const l0 = LEAGUES.find((l) => l.enabled)
const peak = SCENARIOS[2]
console.log(`\nDesglose "${peak.name}" en ${l0.name} (config actual):`)
console.table({
  ...Object.fromEntries(
    Object.entries(baseDay(l0, {})).map(
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

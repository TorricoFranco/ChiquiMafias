import {
  mapEvents,
  mapLineups,
  mapMatch,
  mapStandingRow,
  mapStatistics,
  mapStatusShort,
  parseEventTime,
  parseScore,
} from './highlightly.mappers'
import { HlMatch } from './raw/highlightly.raw'

const home = { id: 1, name: 'Local', logo: 'l.png' }
const away = { id: 2, name: 'Visita', logo: 'v.png' }

const match = (over: Partial<HlMatch['state']> = {}): HlMatch => ({
  id: 100,
  round: 'Clausura - 13',
  date: '2026-10-20T00:15:00.000Z',
  homeTeam: home,
  awayTeam: away,
  league: { id: 109712, season: 2026 },
  state: {
    clock: 90,
    score: { current: '2 - 1', penalties: null },
    description: 'Finished',
    ...over,
  },
})

describe('Highlightly mappers', () => {
  describe('estado', () => {
    it.each([
      ['Not started', 'NS'],
      ['First half', '1H'],
      ['Half time', 'HT'],
      ['Second half', '2H'],
      ['Extra time', 'ET'],
      ['Break time', 'BT'],
      ['Penalties', 'P'],
      ['Finished', 'FT'],
      ['Finished after extra time', 'AET'],
      ['Finished after penalties', 'PEN'],
      ['Postponed', 'PST'],
      ['Cancelled', 'CANC'],
      ['Abandoned', 'ABD'],
      ['Awarded', 'AWD'],
      ['In progress', 'LIVE'],
    ])('Debe traducir "%s" al código %s', (description, short) => {
      expect(mapStatusShort(description)).toBe(short)
    })

    it('Debe tratar como en juego un estado desconocido con el reloj en marcha', () => {
      const f = mapMatch({
        ...match(),
        state: {
          clock: 37,
          score: { current: '1 - 0', penalties: null },
          description: 'Descripción nueva',
        },
      })

      expect(f.status.short).toBe('LIVE')
      expect(f.status.elapsed).toBe(37)
    })

    it('Debe dejar como TBD un estado desconocido sin reloj', () => {
      const f = mapMatch({
        ...match(),
        state: {
          clock: null,
          score: { current: null, penalties: null },
          description: 'Descripción nueva',
        },
      })

      expect(f.status.short).toBe('TBD')
    })

    it('Debe tratar un estado desconocido como TBD (programado)', () => {
      expect(mapStatusShort('Algo nuevo')).toBe('TBD')
      expect(mapStatusShort(undefined)).toBe('TBD')
    })
  })

  describe('marcador', () => {
    it('Debe parsear "2 - 1" y devolver null si no hay marcador', () => {
      expect(parseScore('2 - 1')).toEqual({ home: 2, away: 1 })
      expect(parseScore(null)).toEqual({ home: null, away: null })
    })

    it('Debe mapear un partido terminado con ganador', () => {
      const f = mapMatch(match())

      expect(f).toMatchObject({
        externalId: 100,
        timezone: 'UTC',
        venue: null,
        referee: null,
        status: { short: 'FT', long: 'Finished', elapsed: 90 },
        league: { externalId: 109712, season: 2026, round: 'Clausura - 13' },
        goals: { home: 2, away: 1 },
        penalty: { home: null, away: null },
      })
      expect(f.home.winner).toBe(true)
      expect(f.away.winner).toBe(false)
      expect(f.timestamp).toBe(1792455300)
    })

    it('Debe dejar el ganador en null en un empate', () => {
      const f = mapMatch(
        match({ score: { current: '1 - 1', penalties: null } }),
      )

      expect(f.home.winner).toBeNull()
      expect(f.away.winner).toBeNull()
    })

    it('Debe decidir el ganador por penales si el marcador está empatado', () => {
      const f = mapMatch(
        match({
          description: 'Finished after penalties',
          score: { current: '1 - 1', penalties: '3 - 4' },
        }),
      )

      expect(f.status.short).toBe('PEN')
      expect(f.penalty).toEqual({ home: 3, away: 4 })
      expect(f.home.winner).toBe(false)
      expect(f.away.winner).toBe(true)
    })

    it('No debe marcar ganador si el partido no terminó', () => {
      const f = mapMatch(match({ description: 'Second half', clock: 70 }))

      expect(f.home.winner).toBeNull()
      expect(f.status.elapsed).toBe(70)
    })

    it('Debe tomar estadio y árbitro del detalle', () => {
      const f = mapMatch({
        ...match(),
        venue: { name: 'Estadio X', city: 'Flores', capacity: '3000' },
        referee: { name: 'Pérez, Juan' },
      })

      expect(f.venue).toEqual({
        externalId: null,
        name: 'Estadio X',
        city: 'Flores',
        capacity: 3000,
        surface: null,
        image: null,
      })
      expect(f.referee).toBe('Pérez, Juan')
    })

    it('Debe dejar un partido sin empezar con goles en null', () => {
      const f = mapMatch(
        match({
          description: 'Not started',
          clock: null,
          score: { current: null, penalties: null },
        }),
      )

      expect(f.goals).toEqual({ home: null, away: null })
      expect(f.status.short).toBe('NS')
    })
  })

  describe('eventos', () => {
    const team = { id: 1, name: 'Local', logo: 'l.png' }
    const ev = (over: Record<string, unknown>) => ({
      team,
      time: '10',
      type: 'Goal',
      player: 'Jugador',
      playerId: 11,
      assist: null,
      assistingPlayerId: null,
      substituted: null,
      ...over,
    })

    it('Debe separar el minuto del tiempo extra', () => {
      expect(parseEventTime('45+2')).toEqual({ minute: 45, extra: 2 })
      expect(parseEventTime('50')).toEqual({ minute: 50, extra: null })
    })

    it('Debe usar el vocabulario type/detail que guarda la DB', () => {
      const result = mapEvents([
        ev({ type: 'Goal', assist: 'Asistente', assistingPlayerId: 12 }),
        ev({ type: 'Own Goal' }),
        ev({ type: 'Penalty' }),
        ev({ type: 'Missed Penalty' }),
        ev({ type: 'Yellow Card' }),
        ev({ type: 'Red Card' }),
        ev({ type: 'VAR Goal Cancelled - Offside' }),
      ])

      expect(result.map((e) => [e.type, e.detail])).toEqual([
        ['Goal', 'Normal Goal'],
        ['Goal', 'Own Goal'],
        ['Goal', 'Penalty'],
        ['Goal', 'Missed Penalty'],
        ['Card', 'Yellow Card'],
        ['Card', 'Red Card'],
        ['Var', 'Goal Disallowed - offside'],
      ])
      expect(result[0].assist).toEqual({ externalId: 12, name: 'Asistente' })
      expect(result[0].team).toMatchObject({ externalId: 1, name: 'Local' })
    })

    it('Debe numerar las sustituciones por equipo y poner al que entra como assist', () => {
      const result = mapEvents([
        ev({
          type: 'Substitution',
          player: 'Sale',
          playerId: 20,
          substituted: 'Entra',
          assistingPlayerId: 21,
        }),
        ev({ type: 'Substitution', player: 'Sale 2', playerId: 22 }),
        ev({
          type: 'Substitution',
          team: { id: 2, name: 'Visita' },
          player: 'Otro',
          playerId: 30,
        }),
      ])

      expect(result.map((e) => e.detail)).toEqual([
        'Substitution 1',
        'Substitution 2',
        'Substitution 1',
      ])
      expect(result[0].type).toBe('subst')
      expect(result[0].player).toEqual({ externalId: 20, name: 'Sale' })
      expect(result[0].assist).toEqual({ externalId: 21, name: 'Entra' })
    })

    it('Debe conservar el nombre del jugador aunque falte el id', () => {
      const [e] = mapEvents([ev({ playerId: null })])

      expect(e.player).toEqual({ externalId: null, name: 'Jugador' })
    })

    it('Debe conservar un tipo desconocido sin inventar detalle', () => {
      const [e] = mapEvents([ev({ type: 'Algo Nuevo' })])

      expect(e.type).toBe('Algo Nuevo')
      expect(e.detail).toBeNull()
    })
  })

  describe('alineaciones', () => {
    const lineupTeam = (id: number) => ({
      id,
      name: `Equipo ${id}`,
      logo: 'x.png',
      formation: '4-4-2',
      initialLineup: [
        [{ id: 1, name: 'Arquero', number: 1, position: 'Goalkeeper' }],
        [
          { id: 2, name: 'Zaguero A', number: 2, position: 'Defender' },
          { id: 3, name: 'Zaguero B', number: 3, position: 'Defender' },
        ],
        [{ id: 4, name: 'Delantero', number: 9, position: 'Forward' }],
      ],
      substitutes: [
        { id: 5, name: 'Suplente', number: 12, position: 'Midfielder' },
        { name: 'Sin id', number: 13, position: 'Midfielder' },
      ],
    })

    it('Debe armar el grid fila:columna desde initialLineup', () => {
      const [homeLineup] = mapLineups({
        homeTeam: lineupTeam(1),
        awayTeam: lineupTeam(2),
      })

      expect(homeLineup.formation).toBe('4-4-2')
      expect(
        homeLineup.startXI.map((p) => [p.name, p.position, p.grid]),
      ).toEqual([
        ['Arquero', 'G', '1:1'],
        ['Zaguero A', 'D', '2:1'],
        ['Zaguero B', 'D', '2:2'],
        ['Delantero', 'F', '3:1'],
      ])
    })

    it('Debe devolver los suplentes sin grid y omitir a los que no tienen id', () => {
      const lineups = mapLineups({
        homeTeam: lineupTeam(1),
        awayTeam: lineupTeam(2),
      })

      expect(lineups).toHaveLength(2)
      expect(lineups[0].substitutes).toEqual([
        {
          externalId: 5,
          name: 'Suplente',
          number: 12,
          position: 'M',
          grid: null,
        },
      ])
      expect(lineups[0].coachName).toBeNull()
    })

    it('Debe devolver una lista vacía si no hay alineaciones', () => {
      expect(mapLineups(null)).toEqual([])
    })
  })

  describe('estadísticas', () => {
    it('Debe traducir los nombres a las claves que lee el front', () => {
      const stats = mapStatistics({
        team: home,
        statistics: [
          { displayName: 'Shots on target', value: 3 },
          { displayName: 'Shots off target', value: 5 },
          { displayName: 'Blocked shots', value: 5 },
          { displayName: 'Possession', value: 0.35 },
          { displayName: 'Successful passes', value: 148 },
          { displayName: 'Total passes', value: 278 },
          { displayName: 'Expected Goals', value: 0.8 },
          { displayName: 'Corners', value: 3 },
          { displayName: 'Attacks', value: 114 },
        ],
      })

      expect(stats.statistics).toMatchObject({
        shots_on_goal: 3,
        shots_off_goal: 5,
        blocked_shots: 5,
        total_shots: 13,
        ball_possession: '35%',
        passes_accurate: 148,
        total_passes: 278,
        'passes_%': '53%',
        expected_goals: '0.80',
        corner_kicks: 3,
      })
      expect(stats.statistics).not.toHaveProperty('attacks')
    })

    it('Debe dar siempre las mismas claves en el mismo orden', () => {
      const a = mapStatistics({ team: home, statistics: [] })
      const b = mapStatistics({
        team: home,
        statistics: [{ displayName: 'Fouls', value: 9 }],
      })

      expect(Object.keys(a.statistics)).toEqual(Object.keys(b.statistics))
      expect(a.statistics.fouls).toBeNull()
      expect(a.statistics.total_shots).toBeNull()
    })
  })

  describe('tabla de posiciones', () => {
    it('Debe mapear una fila y calcular la diferencia de gol', () => {
      const row = mapStandingRow('Clausura - Group A', {
        team: home,
        position: 3,
        points: 20,
        total: {
          games: 10,
          wins: 6,
          draws: 2,
          loses: 2,
          scoredGoals: 15,
          receivedGoals: 9,
        },
      })

      expect(row).toMatchObject({
        rank: 3,
        group: 'Clausura - Group A',
        points: 20,
        goalsDiff: 6,
        played: 10,
        wins: 6,
        draws: 2,
        losses: 2,
        goalsFor: 15,
        goalsAgainst: 9,
        form: '',
        description: null,
      })
    })
  })
})

import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { CompetitionContext } from 'src/competitions/competitions.service'
import { getFormatStrategy } from 'src/football/formats/format-registry'
import { BracketAdminService } from './bracket-admin.service'

const copa = {
  slug: 'copa-argentina',
  leagueId: 'league-copa',
  season: 2026,
  strategy: getFormatStrategy('ELIMINACION'),
} as CompetitionContext

const president = {
  id: 'u-pres',
  username: 'presi',
  role: 'PRESIDENT',
  status: 'ACTIVE',
}

/** 32 cruces Equipo 0-Equipo 1, Equipo 2-Equipo 3… con su partido de 32avos. */
const teams = Array.from({ length: 64 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  name: `Equipo ${i}`,
}))
const draw = Array.from({ length: 32 }, (_, i) => [
  teams[2 * i].name,
  teams[2 * i + 1].name,
])
const firstRoundMatches = Array.from({ length: 32 }, (_, i) => ({
  home_team_id: teams[2 * i + 1].id,
  away_team_id: teams[2 * i].id,
}))

const slotRow = (over: Record<string, unknown> = {}) => ({
  id: 'slot-final',
  competition_season_id: 'season-copa',
  round_order: 6,
  position: 1,
  match_id: 'm-final',
  home_team_id: 'h',
  away_team_id: 'a',
  winner_team_id: null,
  manually_corrected: false,
  ...over,
})

describe('BracketAdminService', () => {
  const tx = {
    bracketDraw: { findUnique: jest.fn(), upsert: jest.fn() },
    bracketSlot: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    bracketChangeLog: { create: jest.fn() },
    leagueTeams: { count: jest.fn() },
  }
  const prisma = {
    user: { findUnique: jest.fn() },
    competitionSeason: { findUniqueOrThrow: jest.fn() },
    leagueTeams: { findMany: jest.fn() },
    matches: { findMany: jest.fn() },
    bracketChangeLog: { findMany: jest.fn() },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) =>
      Promise.resolve(cb(tx)),
    ),
  }
  const bracket = {
    runExclusive: jest.fn((_id: string, fn: () => Promise<unknown>) => fn()),
    rebuildInsideLock: jest.fn(),
  }
  let service: BracketAdminService

  const logged = (action: string) =>
    (
      tx.bracketChangeLog.create.mock.calls as [
        { data: { action: string } & Record<string, unknown> },
      ][]
    )
      .map(([arg]) => arg.data)
      .filter((d) => d.action === action)

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue(president)
    prisma.competitionSeason.findUniqueOrThrow.mockResolvedValue({
      id: 'season-copa',
    })
    prisma.leagueTeams.findMany.mockResolvedValue(
      teams.map((team) => ({ team })),
    )
    prisma.matches.findMany.mockResolvedValue(firstRoundMatches)
    tx.bracketDraw.findUnique.mockResolvedValue(null)
    tx.bracketSlot.findMany.mockResolvedValue([])
    tx.bracketSlot.findFirst.mockResolvedValue(null)
    tx.bracketSlot.findUnique.mockResolvedValue(slotRow())
    tx.leagueTeams.count.mockResolvedValue(2)
    service = new BracketAdminService(prisma as never, bracket as never)
  })

  describe('permisos', () => {
    it.each([
      ['un admin', { ...president, role: 'ADMIN' }],
      ['un presidente suspendido', { ...president, status: 'SUSPENDED' }],
      ['un usuario que no existe', null],
    ])('Debe rechazar a %s aunque el JWT diga otra cosa', async (_, user) => {
      prisma.user.findUnique.mockResolvedValue(user)

      await expect(service.loadDraw('u-1', copa, draw)).rejects.toThrow(
        ForbiddenException,
      )
      await expect(
        service.correctSlot('u-1', copa, 6, 1, {
          reason: 'Prueba de permisos',
        }),
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('loadDraw', () => {
    it('Debe guardar el sorteo con los ids, auditarlo y rearmar dentro del bloqueo', async () => {
      await service.loadDraw('u-pres', copa, draw)

      expect(prisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            league_id: 'league-copa',
            season: 2026,
            round: '32avos de final',
          },
        }),
      )
      const pairs = draw.map((_, i) => [teams[2 * i].id, teams[2 * i + 1].id])
      expect(tx.bracketDraw.upsert).toHaveBeenCalledWith({
        where: { competition_season_id: 'season-copa' },
        create: { competition_season_id: 'season-copa', pairs },
        update: { pairs },
      })
      expect(logged('LOAD_DRAW')).toEqual([
        expect.objectContaining({
          after: draw,
          competition_season_id: 'season-copa',
          changedById: 'u-pres',
          changedByUsername: 'presi',
        }),
      ])
      expect(bracket.runExclusive).toHaveBeenCalledWith(
        'season-copa',
        expect.any(Function),
      )
      expect(bracket.rebuildInsideLock).toHaveBeenCalledWith('season-copa')
    })

    it('Debe quitar las correcciones anteriores y auditar cada una', async () => {
      tx.bracketSlot.findMany.mockResolvedValue([
        slotRow({
          id: 's1',
          round_order: 1,
          position: 1,
          manually_corrected: true,
        }),
        slotRow({
          id: 's2',
          round_order: 6,
          position: 1,
          manually_corrected: true,
        }),
      ])

      const result = await service.loadDraw('u-pres', copa, draw)

      expect(result).toEqual({ pairs: 32, clearedCorrections: 2 })
      expect(tx.bracketSlot.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { manually_corrected: false },
      })
      expect(logged('CLEAR_CORRECTION')).toEqual([
        expect.objectContaining({ round_order: 1, position: 1 }),
        expect.objectContaining({ round_order: 6, position: 1 }),
      ])
    })

    it('Debe aceptar nombres con otras mayúsculas y espacios', async () => {
      const shouted = draw.map(([h, a]) => [h.toUpperCase(), ` ${a} `])

      await expect(
        service.loadDraw('u-pres', copa, shouted),
      ).resolves.toMatchObject({ pairs: 32 })
    })

    const rejected = async (firstRound: string[][]) => {
      try {
        await service.loadDraw('u-pres', copa, firstRound)
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException)
        expect(prisma.$transaction).not.toHaveBeenCalled()
        expect(bracket.rebuildInsideLock).not.toHaveBeenCalled()
        return (
          (error as BadRequestException).getResponse() as { errors: string[] }
        ).errors
      }
      throw new Error('Se esperaba que rechace el sorteo')
    }

    it('Debe rechazar todo si faltan cruces', async () => {
      expect(await rejected(draw.slice(0, 31))).toContain(
        'Tienen que ser 32 cruces y llegaron 31',
      )
    })

    it('Debe rechazar un equipo que no participa', async () => {
      const bad = draw.map((p, i) => (i === 3 ? ['Club Fantasma', p[1]] : p))

      expect(await rejected(bad)).toContain(
        '"Club Fantasma" no es un participante de la temporada',
      )
    })

    it('Debe rechazar un nombre ambiguo', async () => {
      prisma.leagueTeams.findMany.mockResolvedValue([
        ...teams.map((team) => ({ team })),
        { team: { id: 'otro', name: 'Equipo 0' } },
      ])

      expect(await rejected(draw)).toContain(
        '"Equipo 0" es ambiguo: hay 2 participantes con ese nombre',
      )
    })

    it('Debe rechazar un equipo repetido', async () => {
      const bad = draw.map((p, i) => (i === 5 ? [draw[0][0], p[1]] : p))

      expect(await rejected(bad)).toContain(
        '"Equipo 0" aparece en más de un cruce',
      )
    })

    it('Debe rechazar un cruce que no es un partido real', async () => {
      // Equipo 0 y Equipo 2 son de cruces distintos: se intercambian rivales.
      const swapped = draw.map((p, i) =>
        i === 0 ? [p[0], draw[1][0]] : i === 1 ? [draw[0][1], p[1]] : p,
      )

      expect(await rejected(swapped)).toEqual([
        'El cruce 1 (Equipo 0 vs Equipo 2) no coincide con ningún partido de 32avos de final',
        'El cruce 2 (Equipo 1 vs Equipo 3) no coincide con ningún partido de 32avos de final',
      ])
    })

    it('Debe rechazar un nombre vacío', async () => {
      const bad = draw.map((p, i) => (i === 0 ? ['  ', p[1]] : p))

      await expect(service.loadDraw('u-pres', copa, bad)).rejects.toThrow(
        'Cada equipo va por nombre',
      )
    })
  })

  describe('correctSlot', () => {
    it('Debe leer la llave dentro de la transacción, corregirla, auditarla y rearmar', async () => {
      await service.correctSlot('u-pres', copa, 6, 1, {
        winnerTeamId: 'a',
        reason: 'Ganó en escritorio',
      })

      expect(tx.bracketSlot.findUnique).toHaveBeenCalledWith({
        where: {
          competition_season_id_round_order_position: {
            competition_season_id: 'season-copa',
            round_order: 6,
            position: 1,
          },
        },
      })
      expect(tx.bracketSlot.update).toHaveBeenCalledWith({
        where: { id: 'slot-final' },
        data: {
          home_team_id: 'h',
          away_team_id: 'a',
          winner_team_id: 'a',
          manually_corrected: true,
        },
      })
      expect(logged('CORRECT_SLOT')).toEqual([
        expect.objectContaining({
          round_order: 6,
          position: 1,
          reason: 'Ganó en escritorio',
          before: expect.objectContaining({ winner_team_id: null }) as unknown,
          after: expect.objectContaining({ winner_team_id: 'a' }) as unknown,
        }),
      ])
      expect(bracket.runExclusive).toHaveBeenCalledWith(
        'season-copa',
        expect.any(Function),
      )
      expect(bracket.rebuildInsideLock).toHaveBeenCalledWith('season-copa')
    })

    const rejectsWith = async (
      dto: Parameters<BracketAdminService['correctSlot']>[4],
      message: string,
    ) => {
      await expect(
        service.correctSlot('u-pres', copa, 6, 1, dto),
      ).rejects.toThrow(message)
      expect(tx.bracketSlot.update).not.toHaveBeenCalled()
      expect(bracket.rebuildInsideLock).not.toHaveBeenCalled()
    }

    it('Debe rechazar un ganador que no juega la llave', async () => {
      await rejectsWith(
        { winnerTeamId: 'otro', reason: 'Error del proveedor' },
        'uno de los dos equipos',
      )
    })

    it('Debe rechazar equipos que no participan', async () => {
      tx.leagueTeams.count.mockResolvedValue(1)

      await rejectsWith(
        { homeTeamId: 'z', reason: 'Error del proveedor' },
        'participantes',
      )
    })

    it('Debe rechazar un equipo contra sí mismo', async () => {
      await rejectsWith(
        { awayTeamId: 'h', reason: 'Error del proveedor' },
        'sí mismo',
      )
    })

    it('Debe rechazar un equipo que ya juega otra llave de la misma ronda', async () => {
      tx.bracketSlot.findFirst.mockResolvedValue({ position: 2 })

      await rejectsWith(
        { homeTeamId: 'e', reason: 'Error del proveedor' },
        'ya juega la llave 2',
      )
      expect(tx.bracketSlot.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            round_order: 6,
            position: { not: 1 },
          }) as unknown,
        }),
      )
    })

    it('Debe dar 404 si la llave no existe', async () => {
      tx.bracketSlot.findUnique.mockResolvedValue(null)

      await rejectsWith({ reason: 'No existe' }, 'La llave no existe')
    })
  })

  describe('clearCorrection', () => {
    it('Debe quitar la corrección, auditarlo y rearmar', async () => {
      tx.bracketSlot.findUnique.mockResolvedValue(
        slotRow({ manually_corrected: true, winner_team_id: 'a' }),
      )

      await service.clearCorrection(
        'u-pres',
        copa,
        6,
        1,
        'Ya lo informa el proveedor',
      )

      expect(tx.bracketSlot.update).toHaveBeenCalledWith({
        where: { id: 'slot-final' },
        data: { manually_corrected: false },
      })
      expect(logged('CLEAR_CORRECTION')).toHaveLength(1)
      expect(bracket.rebuildInsideLock).toHaveBeenCalled()
    })

    it('Debe rechazar una llave sin corrección', async () => {
      await expect(
        service.clearCorrection('u-pres', copa, 6, 1, 'No hay corrección'),
      ).rejects.toThrow('no tiene una corrección')
      expect(bracket.rebuildInsideLock).not.toHaveBeenCalled()
    })
  })

  it('Una competición sin cuadro debe dar 404', async () => {
    const liga = { ...copa, strategy: getFormatStrategy('LIGA_DIVIDIDA') }

    await expect(service.changes('u-pres', liga)).rejects.toThrow(
      'no tiene cuadro',
    )
  })
})

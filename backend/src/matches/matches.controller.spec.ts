import { NotFoundException } from '@nestjs/common'
import { MatchesController } from './matches.controller'

describe('MatchesController (ruta vieja del detalle)', () => {
  const matches = {
    getMatchDetails: jest.fn(),
    findCurrentSeasonMatch: jest.fn(),
    getMatchEvents: jest.fn(),
    getAggregatedData: jest.fn(),
  }
  const competitions = { resolveLegacy: jest.fn() }
  let controller: MatchesController

  beforeEach(() => {
    jest.clearAllMocks()
    competitions.resolveLegacy.mockResolvedValue({
      competition: { leagueId: 'league-liga', season: 2026 },
    })
    controller = new MatchesController(matches as never, competitions as never)
  })

  it('Debe devolver el detalle de un partido de la Liga actual', async () => {
    await controller.getMatchDetails('league-liga', '2026', 'match-1')

    expect(competitions.resolveLegacy).toHaveBeenCalledWith('2026')
    expect(matches.getMatchDetails).toHaveBeenCalledWith(
      'league-liga',
      '2026',
      'match-1',
    )
  })

  it('Debe dar 404 con otra liga sin leer el detalle cacheado', async () => {
    await expect(
      controller.getMatchDetails('league-copa', '2026', 'match-1'),
    ).rejects.toThrow(NotFoundException)
    expect(matches.getMatchDetails).not.toHaveBeenCalled()
  })

  it('Debe dar 404 con una temporada que no es la actual', async () => {
    competitions.resolveLegacy.mockRejectedValue(
      new NotFoundException('No hay datos de la temporada 2025'),
    )

    await expect(
      controller.getMatchDetails('league-liga', '2025', 'match-1'),
    ).rejects.toThrow(NotFoundException)
    expect(matches.getMatchDetails).not.toHaveBeenCalled()
  })
})

describe('MatchesController (eventos y pre-match)', () => {
  const matches = {
    findCurrentSeasonMatch: jest.fn(),
    getMatchEvents: jest.fn(),
    getAggregatedData: jest.fn(),
  }
  let controller: MatchesController

  beforeEach(() => {
    jest.clearAllMocks()
    matches.findCurrentSeasonMatch.mockResolvedValue({})
    matches.getMatchEvents.mockResolvedValue([{ id: 'e1' }])
    controller = new MatchesController(matches as never, {} as never)
  })

  it('Debe devolver los eventos de un partido de la temporada actual', async () => {
    await expect(controller.getMatchEvents('match-1')).resolves.toEqual([
      { id: 'e1' },
    ])
    expect(matches.findCurrentSeasonMatch).toHaveBeenCalledWith('match-1')
  })

  it('No debe devolver eventos de un partido de otra temporada', async () => {
    matches.findCurrentSeasonMatch.mockRejectedValue(
      new NotFoundException('Partido no encontrado'),
    )

    await expect(controller.getMatchEvents('match-1')).rejects.toThrow(
      NotFoundException,
    )
    expect(matches.getMatchEvents).not.toHaveBeenCalled()
  })

  it('No debe leer el pre-match cacheado de un partido de otra temporada', async () => {
    matches.findCurrentSeasonMatch.mockRejectedValue(
      new NotFoundException('Partido no encontrado'),
    )

    await expect(controller.getPreMatchInfo('match-1')).rejects.toThrow(
      NotFoundException,
    )
    expect(matches.getAggregatedData).not.toHaveBeenCalled()
  })
})

import { NotFoundException } from '@nestjs/common'
import { MatchesController } from './matches.controller'

describe('MatchesController (ruta vieja del detalle)', () => {
  const matches = { getMatchDetails: jest.fn() }
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

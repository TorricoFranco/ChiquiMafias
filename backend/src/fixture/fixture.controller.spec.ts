import { NotFoundException } from '@nestjs/common'
import { FixtureController } from './fixture.controller'

describe('FixtureController (rutas viejas de la Liga)', () => {
  const liga = { slug: 'liga-profesional', season: 2026 }
  const fixtures = {
    getFixtureByMatchday: jest.fn(),
    getYearlyCalendar: jest.fn(),
    getLiveLeagueScores: jest.fn(),
  }
  const competitions = {
    resolveLegacy: jest.fn(),
    resolveCurrent: jest.fn(),
  }
  let controller: FixtureController

  beforeEach(() => {
    jest.clearAllMocks()
    competitions.resolveLegacy.mockResolvedValue({
      competition: liga,
      stage: 'CLAUSURA',
    })
    competitions.resolveCurrent.mockResolvedValue(liga)
    controller = new FixtureController(fixtures as never, competitions as never)
  })

  it.each(['14', 'cuartos', 'FINAL', ' semifinal '])(
    'Debe aceptar la fecha "%s"',
    async (matchday) => {
      await controller.getByMatchday('2026', 'clausura', matchday)

      expect(competitions.resolveLegacy).toHaveBeenCalledWith(
        '2026',
        'clausura',
      )
      expect(fixtures.getFixtureByMatchday).toHaveBeenCalledWith(
        liga,
        'CLAUSURA',
        matchday.toLowerCase().trim(),
      )
    },
  )

  it.each(['999', 'fecha:1', '1 OR 1', 'octavos:x', ''])(
    'Debe dar 404 con la fecha "%s" sin consultar ni cachear',
    async (matchday) => {
      await expect(
        controller.getByMatchday('2026', 'clausura', matchday),
      ).rejects.toThrow(NotFoundException)
      expect(fixtures.getFixtureByMatchday).not.toHaveBeenCalled()
    },
  )

  it('Debe propagar el 404 de una temporada que no es la actual', async () => {
    competitions.resolveLegacy.mockRejectedValue(
      new NotFoundException('No hay datos de la temporada 2025'),
    )

    await expect(controller.getYearlyCalendar('2025')).rejects.toThrow(
      NotFoundException,
    )
    expect(fixtures.getYearlyCalendar).not.toHaveBeenCalled()
  })

  it('Los marcadores en vivo deben ser los de la Liga', async () => {
    await controller.getLiveScores()

    expect(competitions.resolveCurrent).toHaveBeenCalledWith('liga-profesional')
    expect(fixtures.getLiveLeagueScores).toHaveBeenCalledWith(liga)
  })
})

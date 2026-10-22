import { NotFoundException } from '@nestjs/common'
import { CompetitionsService } from './competitions.service'

const liga = {
  id: 'league-liga',
  name: 'Liga Profesional Argentina',
  slug: 'liga-profesional',
  short_name: 'Liga Profesional',
  logo_url: null,
  country: 'Argentina',
  neutral_venue: false,
  api_league_id: 128,
  current_season: {
    season: 2026,
    label: '2026',
    format: 'LIGA_DIVIDIDA',
  },
}

const copa = {
  ...liga,
  id: 'league-copa',
  name: 'Copa Argentina',
  slug: 'copa-argentina',
  short_name: 'Copa Argentina',
  neutral_venue: true,
  api_league_id: null,
  current_season: { season: 2026, label: '2026', format: 'ELIMINACION' },
}

describe('CompetitionsService', () => {
  const prisma = { leagues: { findMany: jest.fn() } }
  let service: CompetitionsService

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.leagues.findMany.mockResolvedValue([liga, copa])
    service = new CompetitionsService(prisma as never)
  })

  it('Debe listar las competiciones con temporada actual', async () => {
    const list = await service.listCurrent()

    expect(prisma.leagues.findMany).toHaveBeenCalledWith({
      where: { slug: { not: null }, current_season_id: { not: null } },
      include: { current_season: true },
    })
    expect(list.map((c) => c.slug)).toEqual([
      'copa-argentina',
      'liga-profesional',
    ])
  })

  it('Debe armar la clave de Redis de siempre para la Liga y el uuid para la Copa', async () => {
    expect((await service.resolveCurrent('liga-profesional')).cacheKey).toBe(
      128,
    )
    expect((await service.resolveCurrent('copa-argentina')).cacheKey).toBe(
      'league-copa',
    )
  })

  it('Debe incluir la estrategia solo si el formato la tiene', async () => {
    expect(
      (await service.resolveCurrent('liga-profesional')).strategy?.stages,
    ).toEqual(['APERTURA', 'CLAUSURA'])
    expect((await service.resolveCurrent('copa-argentina')).strategy).toBeNull()
  })

  it.each([
    'no-existe',
    'Liga-Profesional',
    'liga profesional',
    'liga:profesional',
    '../liga',
    'a'.repeat(65),
  ])('Debe dar 404 con el slug "%s"', async (slug) => {
    await expect(service.resolveCurrent(slug)).rejects.toThrow(
      NotFoundException,
    )
  })

  it('No debe consultar la base por cada pedido', async () => {
    await service.resolveCurrent('liga-profesional')
    await service.resolveCurrent('no-existe').catch(() => undefined)
    await service.listCurrent()

    expect(prisma.leagues.findMany).toHaveBeenCalledTimes(1)
  })

  it('Debe hacer una sola consulta aunque lleguen pedidos juntos', async () => {
    await Promise.all([
      service.listCurrent(),
      service.resolveCurrent('liga-profesional'),
      service.resolveCurrent('copa-argentina'),
    ])

    expect(prisma.leagues.findMany).toHaveBeenCalledTimes(1)
  })

  it('Debe volver a leer la base después de un minuto', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
    await service.listCurrent()
    now.mockReturnValue(1_000_000 + 61_000)
    await service.listCurrent()

    expect(prisma.leagues.findMany).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })

  it('Si la base falla debe seguir con lo último que leyó', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
    await service.listCurrent()
    now.mockReturnValue(1_000_000 + 61_000)
    prisma.leagues.findMany.mockRejectedValueOnce(new Error('DB caída'))

    expect((await service.resolveCurrent('liga-profesional')).slug).toBe(
      'liga-profesional',
    )
    now.mockRestore()
  })

  it('Tras un error de la base no debe reintentar en cada pedido', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
    await service.listCurrent()
    now.mockReturnValue(1_000_000 + 61_000)
    prisma.leagues.findMany.mockRejectedValueOnce(new Error('DB caída'))
    await service.listCurrent()

    now.mockReturnValue(1_000_000 + 63_000)
    await service.listCurrent()
    expect(prisma.leagues.findMany).toHaveBeenCalledTimes(2)

    now.mockReturnValue(1_000_000 + 67_000)
    await service.listCurrent()
    expect(prisma.leagues.findMany).toHaveBeenCalledTimes(3)
    now.mockRestore()
  })

  it('Debe encontrar la competición por uuid y por clave de Redis', async () => {
    expect((await service.findCurrentByLeagueId('league-copa'))?.slug).toBe(
      'copa-argentina',
    )
    expect((await service.findCurrentByCacheKey('128'))?.slug).toBe(
      'liga-profesional',
    )
    expect(await service.findCurrentByCacheKey('999')).toBeNull()
  })

  describe('resolveLegacy', () => {
    it('Debe resolver la Liga con la temporada actual y la fase en mayúsculas', async () => {
      const { competition, stage } = await service.resolveLegacy(
        '2026',
        'clausura',
      )

      expect(competition.slug).toBe('liga-profesional')
      expect(stage).toBe('CLAUSURA')
    })

    it('Debe dar 404 con una temporada que no es la actual', async () => {
      await expect(service.resolveLegacy('2025')).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.resolveLegacy('2026abc')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('Debe dar 404 con una fase que no es del formato', async () => {
      await expect(
        service.resolveLegacy('2026', 'APERTURA:fecha:1'),
      ).rejects.toThrow(NotFoundException)
      await expect(service.resolveLegacy('2026', 'ANNUAL')).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { MatchesService } from './matches.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { PrematchServiceApi } from '../football/services/prematch.api'
import { StandingsService } from '../standings/standings.service'
import { FootballRefsService } from '../football/services/refs.service'
import { CompetitionsService } from '../competitions/competitions.service'

describe('MatchesService (getAggregatedData)', () => {
  let service: MatchesService

  const mockPrisma = { matches: { findUnique: jest.fn() } }
  const mockRedisService = { redis: { get: jest.fn(), set: jest.fn() } }
  const mockApi = { getH2H: jest.fn(), getLatestResults: jest.fn() }
  const mockStandingsService = { getCachedFullStandings: jest.fn() }
  const mockCompetitions = { findCurrentByLeagueId: jest.fn() }
  const mockRefs = {
    teamExternalId: jest.fn((team: { api_team_id: number | null }) =>
      Promise.resolve(team.api_team_id),
    ),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrematchServiceApi, useValue: mockApi },
        { provide: StandingsService, useValue: mockStandingsService },
        { provide: FootballRefsService, useValue: mockRefs },
        { provide: CompetitionsService, useValue: mockCompetitions },
      ],
    }).compile()

    service = module.get<MatchesService>(MatchesService)

    jest.clearAllMocks()
  })

  it('Debe devolver el pre-match cacheado sin llamar a API-Football ni a la DB', async () => {
    const cached = { h2h: [], form: {} }
    mockRedisService.redis.get.mockResolvedValue(JSON.stringify(cached))

    const result = await service.getAggregatedData('match-1')

    expect(result).toEqual(cached)
    expect(mockRedisService.redis.get).toHaveBeenCalledWith(
      'pre_match:v2:match-1',
    )
    expect(mockPrisma.matches.findUnique).not.toHaveBeenCalled()
    expect(mockApi.getH2H).not.toHaveBeenCalled()
    expect(mockApi.getLatestResults).not.toHaveBeenCalled()
  })

  it('Debe servir la copia de respaldo si API-Football falla y la key principal ya venció', async () => {
    const stale = { h2h: ['viejo'] }
    mockRedisService.redis.get.mockImplementation((key: string) =>
      Promise.resolve(
        key === 'pre_match:v2:stale:match-1' ? JSON.stringify(stale) : null,
      ),
    )
    mockPrisma.matches.findUnique.mockResolvedValue({
      league_id: 'league-1',
      season: 2026,
      home_team: { id: 'h', api_team_id: 1 },
      away_team: { id: 'a', api_team_id: 2 },
    })
    mockApi.getH2H.mockRejectedValue(new Error('API caída'))

    const result = await service.getAggregatedData('match-1')

    expect(result).toEqual(stale)
  })

  it('Debe propagar el error si API-Football falla y no hay copia de respaldo', async () => {
    mockRedisService.redis.get.mockResolvedValue(null)
    mockPrisma.matches.findUnique.mockResolvedValue({
      league_id: 'league-1',
      season: 2026,
      home_team: { id: 'h', api_team_id: 1 },
      away_team: { id: 'a', api_team_id: 2 },
    })
    mockApi.getH2H.mockRejectedValue(new Error('API caída'))

    await expect(service.getAggregatedData('match-1')).rejects.toThrow(
      'API caída',
    )
  })
})

describe('MatchesService (getMatchDetailsById)', () => {
  let service: MatchesService
  const mockPrisma = { matches: { findUnique: jest.fn() } }
  const mockCompetitions = { findCurrentByLeagueId: jest.fn() }
  const liga = {
    leagueId: 'league-liga',
    slug: 'liga-profesional',
    name: 'Liga Profesional Argentina',
    shortName: 'Liga Profesional',
    neutralVenue: false,
    season: 2026,
    seasonLabel: '2026',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: {} },
        { provide: PrematchServiceApi, useValue: {} },
        { provide: StandingsService, useValue: {} },
        { provide: FootballRefsService, useValue: {} },
        { provide: CompetitionsService, useValue: mockCompetitions },
      ],
    }).compile()

    service = module.get<MatchesService>(MatchesService)
    jest.clearAllMocks()
  })

  it('Debe devolver el detalle con la competición del partido', async () => {
    mockPrisma.matches.findUnique.mockResolvedValue({
      league_id: 'league-liga',
      season: 2026,
    })
    mockCompetitions.findCurrentByLeagueId.mockResolvedValue(liga)
    const details = jest
      .spyOn(service, 'getMatchDetails')
      .mockResolvedValue({ isLive: false } as never)

    const result = await service.getMatchDetailsById('match-1')

    expect(details).toHaveBeenCalledWith('league-liga', '2026', 'match-1')
    expect(result).toEqual({
      isLive: false,
      competition: {
        slug: 'liga-profesional',
        name: 'Liga Profesional Argentina',
        shortName: 'Liga Profesional',
        neutralVenue: false,
        seasonLabel: '2026',
      },
    })
  })

  it('Debe dar 404 si el partido no existe', async () => {
    mockPrisma.matches.findUnique.mockResolvedValue(null)

    await expect(service.getMatchDetailsById('match-1')).rejects.toThrow(
      'Partido no encontrado',
    )
  })

  it('Debe dar 404 si el partido es de una temporada anterior', async () => {
    mockPrisma.matches.findUnique.mockResolvedValue({
      league_id: 'league-liga',
      season: 2025,
    })
    mockCompetitions.findCurrentByLeagueId.mockResolvedValue(liga)
    const details = jest.spyOn(service, 'getMatchDetails')

    await expect(service.getMatchDetailsById('match-1')).rejects.toThrow(
      'Partido no encontrado',
    )
    expect(details).not.toHaveBeenCalled()
  })

  it('Debe dar 404 si su competición no tiene temporada actual', async () => {
    mockPrisma.matches.findUnique.mockResolvedValue({
      league_id: 'league-vieja',
      season: 2026,
    })
    mockCompetitions.findCurrentByLeagueId.mockResolvedValue(null)

    await expect(service.getMatchDetailsById('match-1')).rejects.toThrow(
      'Partido no encontrado',
    )
  })
})

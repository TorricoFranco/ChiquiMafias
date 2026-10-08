import { Test, TestingModule } from '@nestjs/testing'
import { MatchesService } from './matches.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { PrematchServiceApi } from '../api-football/services/prematch.api'
import { StandingsService } from '../standings/standings.service'

describe('MatchesService (getAggregatedData)', () => {
  let service: MatchesService

  const mockPrisma = { matches: { findUnique: jest.fn() } }
  const mockRedisService = { redis: { get: jest.fn(), set: jest.fn() } }
  const mockApi = { getH2H: jest.fn(), getLatestResults: jest.fn() }
  const mockStandingsService = { getCachedFullStandings: jest.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrematchServiceApi, useValue: mockApi },
        { provide: StandingsService, useValue: mockStandingsService },
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

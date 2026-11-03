import { Test, TestingModule } from '@nestjs/testing'
import { StatsService } from './stats.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { publicUserSelect } from 'src/prisma/constants/publicUserSelect'

describe('StatsService', () => {
  let service: StatsService

  const mockPrisma = { userStats: { findMany: jest.fn() } }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockPrisma.userStats.findMany.mockResolvedValue([])

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<StatsService>(StatsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe.each([
    ['getTopEarners', 'totalCoinsWon'],
    ['getTopStreaks', 'longestWinStreak'],
    ['getHighestMultipliers', 'highestMultiplier'],
    ['getMostActive', 'totalBetsPlaced'],
    ['getTopStakers', 'totalCoinsStaked'],
  ] as const)('%s', (method, column) => {
    it(`Debe traer el límite pedido ordenado por ${column} descendente, con el usuario público`, async () => {
      await service[method](25)

      expect(mockPrisma.userStats.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.userStats.findMany).toHaveBeenCalledWith({
        take: 25,
        orderBy: { [column]: 'desc' },
        include: { user: { select: publicUserSelect } },
      })
    })

    it('Debe traer 10 resultados si no se le pasa el límite', async () => {
      await service[method]()

      expect(mockPrisma.userStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      )
    })
  })
})

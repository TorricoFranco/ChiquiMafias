import { Test, TestingModule } from '@nestjs/testing'
import { instanceToPlain } from 'class-transformer'
import { UsersService } from './users.service'
import { UserEntity } from './entities/user.entity'
import { PrismaService } from '../prisma/prisma.service'
import { ChatService } from '../chat/chat.service'
import { RedisService } from '../redis/redis.service'

describe('UsersService (updateProfile)', () => {
  let service: UsersService

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    footballTeam: {
      findUnique: jest.fn(),
    },
  }

  const mockChatService = { updateActiveUserProfile: jest.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChatService, useValue: mockChatService },
        { provide: RedisService, useValue: {} },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)

    jest.clearAllMocks()
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.footballTeam.findUnique.mockResolvedValue({ id: 'team-1' })
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'Juan',
      email: 'juan@test.com',
      username: 'messi_10',
      googleId: 'google-secret-id',
      hashedRefreshToken: 'hash-secret',
      team: { id: 'team-1', name: 'Racing Club', badgeUrl: 'https://x/y.png' },
    })
  })

  it('Debe devolver un UserEntity sin googleId ni hashedRefreshToken al serializar', async () => {
    const result = await service.updateProfile('user-1', {
      username: 'messi_10',
    })

    expect(result).toBeInstanceOf(UserEntity)

    const serialized = instanceToPlain(result)
    expect(serialized).not.toHaveProperty('googleId')
    expect(serialized).not.toHaveProperty('hashedRefreshToken')
    expect(serialized).toMatchObject({
      id: 'user-1',
      username: 'messi_10',
      team: { name: 'Racing Club' },
    })
  })

  it('Debe seguir avisando al chat del cambio de username y equipo', async () => {
    await service.updateProfile('user-1', { teamId: 'team-1' })

    expect(mockChatService.updateActiveUserProfile).toHaveBeenCalledWith(
      'user-1',
      {
        username: 'messi_10',
        teamName: 'Racing Club',
        badgeUrl: 'https://x/y.png',
      },
    )
  })
})

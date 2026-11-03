import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { PollsService } from './polls.service'
import { TasksService } from './task.service'

describe('TasksService', () => {
  let service: TasksService
  let logSpy: jest.SpyInstance

  const NOW = new Date('2026-11-03T12:00:00.000Z')

  const mockPrisma = {
    poll: { updateMany: jest.fn(), findMany: jest.fn() },
  }

  const mockPollsService = { executePollClosure: jest.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PollsService, useValue: mockPollsService },
      ],
    }).compile()

    service = module.get<TasksService>(TasksService)

    jest.clearAllMocks()
    mockPrisma.poll.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.poll.findMany.mockResolvedValue([])
    mockPollsService.executePollClosure.mockResolvedValue(undefined)
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    jest.useFakeTimers({ now: NOW })
  })

  afterEach(() => {
    jest.useRealTimers()
    logSpy.mockRestore()
  })

  describe('handlePollStatus', () => {
    it('Debe abrir las encuestas PENDING cuya hora de inicio ya llegó', async () => {
      mockPrisma.poll.updateMany.mockResolvedValue({ count: 2 })

      await service.handlePollStatus()

      expect(mockPrisma.poll.updateMany).toHaveBeenCalledWith({
        where: { status: 'PENDING', startsAt: { lte: NOW } },
        data: { status: 'ACTIVE' },
      })
    })

    it('Debe cerrar, una por una, las encuestas ACTIVE que ya vencieron', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        { id: 'poll-1' },
        { id: 'poll-2' },
      ])

      await service.handlePollStatus()

      expect(mockPrisma.poll.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', endsAt: { lte: NOW } },
      })
      expect(mockPollsService.executePollClosure.mock.calls).toEqual([
        ['poll-1'],
        ['poll-2'],
      ])
    })

    it('No debe cerrar nada si ninguna encuesta venció', async () => {
      await service.handlePollStatus()

      expect(mockPollsService.executePollClosure).not.toHaveBeenCalled()
    })
  })
})

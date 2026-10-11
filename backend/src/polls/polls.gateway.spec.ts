import { Test, TestingModule } from '@nestjs/testing'
import { PollsGateway } from './polls.gateway'
import { VoteService } from './vote.service'
import type { SocketWithUser } from 'src/auth/interfaces/active-user.interface'

describe('PollsGateway', () => {
  let gateway: PollsGateway

  const mockVoteService = {
    castVote: jest.fn(),
    hasVoted: jest.fn(),
  }

  const emit = jest.fn()
  const except = jest.fn(() => ({ emit }))
  const to = jest.fn(() => ({ emit, except }))

  /** Socket falso, con las salas a las que entró y salió a la vista. */
  const buildClient = () => {
    const join = jest.fn()
    const leave = jest.fn()
    const socket = {
      join,
      leave,
      data: { user: { id: 'user-1' } },
    } as unknown as SocketWithUser

    return { socket, join, leave }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollsGateway,
        { provide: VoteService, useValue: mockVoteService },
      ],
    }).compile()

    gateway = module.get<PollsGateway>(PollsGateway)
    gateway.server = { to } as never

    jest.clearAllMocks()
    mockVoteService.hasVoted.mockResolvedValue(false)
    mockVoteService.castVote.mockResolvedValue({ '1': '7', '2': '3' })
  })

  describe('joinPoll', () => {
    it('Debe sumar a la sala de votantes solo si el usuario ya votó', async () => {
      mockVoteService.hasVoted.mockResolvedValue(true)
      const { socket, join } = buildClient()

      await gateway.handleJoinRoom({ pollId: 'poll-1' }, socket)

      expect(join).toHaveBeenCalledWith('poll_poll-1')
      expect(join).toHaveBeenCalledWith('poll_poll-1_voted')
    })

    it('No debe sumar a la sala de votantes a quien no votó', async () => {
      const { socket, join } = buildClient()

      await gateway.handleJoinRoom({ pollId: 'poll-1' }, socket)

      expect(join).toHaveBeenCalledWith('poll_poll-1')
      expect(join).not.toHaveBeenCalledWith('poll_poll-1_voted')
    })
  })

  describe('castVote', () => {
    it('Debe mandar los resultados por opción solo a la sala de votantes', async () => {
      const { socket, join } = buildClient()

      await gateway.handleVote({ pollId: 'poll-1', optionId: 1 }, socket)

      expect(join).toHaveBeenCalledWith('poll_poll-1_voted')
      expect(to).toHaveBeenCalledWith('poll_poll-1_voted')
      expect(emit).toHaveBeenCalledWith('votoActualizado_poll-1', {
        '1': '7',
        '2': '3',
      })
    })

    it('Debe mandar solo el total a los que todavía no votaron', async () => {
      const { socket } = buildClient()

      await gateway.handleVote({ pollId: 'poll-1', optionId: 1 }, socket)

      expect(to).toHaveBeenCalledWith('poll_poll-1')
      expect(except).toHaveBeenCalledWith('poll_poll-1_voted')
      expect(emit).toHaveBeenCalledWith('totalActualizado_poll-1', {
        totalVotes: 10,
      })
    })

    it('Debe devolver el ack de éxito', async () => {
      const { socket } = buildClient()

      const ack = await gateway.handleVote(
        { pollId: 'poll-1', optionId: 1 },
        socket,
      )

      expect(ack).toEqual({ status: 'success' })
    })
  })

  describe('leavePoll', () => {
    it('Debe sacar al cliente de las dos salas', async () => {
      const { socket, leave } = buildClient()

      await gateway.handleLeaveRoom({ pollId: 'poll-1' }, socket)

      expect(leave).toHaveBeenCalledWith('poll_poll-1')
      expect(leave).toHaveBeenCalledWith('poll_poll-1_voted')
    })
  })
})

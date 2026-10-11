import {
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketGateway,
} from '@nestjs/websockets'
import { Server } from 'socket.io'
import { VoteService } from './vote.service'
import {
  UseGuards,
  UseFilters,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard'
import type { SocketWithUser } from 'src/auth/interfaces/active-user.interface'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'
import { WsException } from '@nestjs/websockets'
import { CastVoteDto } from './dto/cast-vote.dto'
import { JoinPollDto } from './dto/join-poll.dto'

/** Sala de los que ya votaron: son los únicos que reciben los resultados. */
const votedRoom = (pollId: string) => `poll_${pollId}_voted`

@WebSocketGateway()
export class PollsGateway {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(PollsGateway.name)

  constructor(private readonly voteService: VoteService) {}

  @UseGuards(WsJwtGuard)
  @UseFilters(AllWsExceptionFilter)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @SubscribeMessage('joinPoll')
  async handleJoinRoom(
    @MessageBody() data: JoinPollDto,
    @ConnectedSocket() client: SocketWithUser,
  ) {
    const { pollId } = data
    const userId = client.data.user.id

    this.logger.debug(`Cliente ${userId} se unió a la poll: ${pollId}`)

    await client.join(`poll_${pollId}`)

    // Los resultados por opción solo viajan a los que ya votaron.
    if (await this.voteService.hasVoted(pollId, userId)) {
      await client.join(votedRoom(pollId))
    }
  }

  @UseGuards(WsJwtGuard)
  @UseFilters(AllWsExceptionFilter)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @SubscribeMessage('leavePoll')
  async handleLeaveRoom(
    @MessageBody() data: JoinPollDto,
    @ConnectedSocket() client: SocketWithUser,
  ) {
    await client.leave(`poll_${data.pollId}`)
    await client.leave(votedRoom(data.pollId))
  }

  @UseGuards(WsJwtGuard)
  @UseFilters(AllWsExceptionFilter)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @SubscribeMessage('castVote')
  async handleVote(
    @MessageBody() data: CastVoteDto,
    @ConnectedSocket() client: SocketWithUser,
  ) {
    if (data.optionId === undefined && !data.ranking?.length) {
      throw new WsException('No elegiste ninguna opción')
    }

    const { pollId, optionId, ranking } = data
    const userId = client.data.user.id

    // El podio llega como una lista ordenada; el resto de los tipos, con una opción.
    const { results, ranking: rankingMatrix } = ranking?.length
      ? await this.voteService.castRankingVote(pollId, userId, ranking)
      : await this.voteService.castVote(pollId, userId, optionId as number)

    await client.join(votedRoom(pollId))

    // Resultados completos solo para los que ya votaron...
    this.server.to(votedRoom(pollId)).emit(`votoActualizado_${pollId}`, results)

    if (rankingMatrix) {
      this.server
        .to(votedRoom(pollId))
        .emit(`rankingActualizado_${pollId}`, rankingMatrix)
    }

    // ...y para el resto, solo cuántos votaron.
    const totalVotes = Object.values(results).reduce(
      (total, votes) => total + Number(votes),
      0,
    )

    this.server
      .to(`poll_${pollId}`)
      .except(votedRoom(pollId))
      .emit(`totalActualizado_${pollId}`, { totalVotes })

    return { status: 'success' }
  }
}

import {
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketGateway,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
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
import { CastVoteDto } from './dto/cast-vote.dto'

@WebSocketGateway()
export class PollsGateway {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(PollsGateway.name)

  constructor(private readonly voteService: VoteService) { }

  @SubscribeMessage('joinPoll')
  handleJoinRoom(
    @MessageBody() pollId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Cliente ${client.id} se unió a la poll: ${pollId}`)
    client.join(`poll_${pollId}`)
  }

  @UseGuards(WsJwtGuard)
  @UseFilters(AllWsExceptionFilter)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @SubscribeMessage('castVote')
  async handleVote(
    @MessageBody() data: CastVoteDto,
    @ConnectedSocket() client: SocketWithUser,
  ) {
    const updatedResults = await this.voteService.castVote(
      data.pollId,
      client.data.user.id,
      data.optionId,
    )

    this.server
      .to(`poll_${data.pollId}`)
      .emit('votoActualizado', updatedResults)

    return { status: 'success' }
  }
}

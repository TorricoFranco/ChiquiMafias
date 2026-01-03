import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { VoteService } from './vote.service'
import { UseGuards, UseFilters } from '@nestjs/common'
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard'
import type { SocketWithUser } from 'src/auth/interfaces/jwt-payload.interface'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL },
  credentials: true,
})
export class PollsGateway {
  @WebSocketServer()
  server: Server
  constructor(private readonly voteService: VoteService) {}

  @SubscribeMessage('joinPoll')
  handleJoinRoom(
    @MessageBody() pollId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Cliente ${client.id} se unió a la poll: ${pollId}`)
    client.join(`poll_${pollId}`)
  }

  //evento de votación
  @UseGuards(WsJwtGuard)
  @UseFilters(AllWsExceptionFilter)
  @SubscribeMessage('castVote')
  async handleVote(
    @MessageBody() data: any,
    @ConnectedSocket() client: SocketWithUser,
  ) {
    // Si VoteService lanza una excepción,salta el Filter
    const updatedResults = await this.voteService.castVote(
      data.pollId,
      client.data.user.id,
      data.optionId,
    )

    this.server
      .to(`poll_${data.pollId}`)
      .emit('votoActualizado', updatedResults)

    // Return para el callback del front
    return { status: 'success' }
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { VoteService } from './vote.service'

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL },
})
export class PollsGateway {
  @WebSocketServer()
  server: Server

  constructor(private readonly voteService: VoteService) {}

  // Cuando un usuario entra a una votación en Next.js, lo unimos a una "sala" (room)
  @SubscribeMessage('joinPoll')
  handleJoinRoom(
    @MessageBody() pollId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`poll_${pollId}`)
  }

  // Escuchamos el evento de votación
  @SubscribeMessage('castVote')
  async handleVote(
    @MessageBody() data: { pollId: string; optionId: number; userId: string },
  ) {
    try {
      // 1. Guardamos en Redis y validamos
      const updatedResults = await this.voteService.castVote(
        data.pollId,
        data.userId,
        data.optionId,
      )

      // 2. Emitimos los nuevos resultados SOLO a la gente que está viendo esa poll
      this.server
        .to(`poll_${data.pollId}`)
        .emit('votoActualizado', updatedResults)

      return { status: 'success' }
    } catch (error) {
      return { status: 'error', message: error.message }
    }
  }
}

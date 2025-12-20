import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import {
  OnModuleInit,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseFilters,
} from '@nestjs/common'

import { Server, Socket } from 'socket.io'
import { ChatService } from './chat.service'
import { AuthService } from 'src/auth/auth.service'
import { SendMessageDto } from './send-message.dto'
import type { SocketWithUser } from 'src/auth/interfaces/jwt-payload.interface'
import { WsJwtGuard } from 'src/auth/ws-jwt.guard'

import { WsException } from '@nestjs/websockets'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'
import { SanitizeMessagePipe } from 'src/pipes/sanitize-message.pipe'

@WebSocketGateway()
export class ChatGateway implements OnModuleInit {
  @WebSocketServer()
  public server: Server

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) {}

  onModuleInit() {
    this.server.on('connection', (socket: Socket) => {
      this.chatService.onClientConnected({
        id: socket.id,
      })

      this.server.emit(
        'on-clients-changed',
        this.chatService.getConnectedClients(),
      )

      socket.emit('welcome-message', 'Bienvenido paaaaadreee')

      socket.on('disconnect', () => {
        this.chatService.onClientDisconnected(socket.id)
        this.server.emit(
          'on-clients-changed',
          this.chatService.getConnectedClients(),
        )
      })
    })
  }

  @UseGuards(WsJwtGuard)
  @UseFilters(AllWsExceptionFilter)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new SanitizeMessagePipe(),
  )
  @SubscribeMessage('send-message')
  handleMessage(
    @MessageBody() body: SendMessageDto,
    @ConnectedSocket() client: SocketWithUser,
  ) {
    const user = client.data.user

    const rate = this.chatService.checkMessageRate(user.sub)

    if (!rate.allowed) {
      throw new WsException({
        code: 'RATE_LIMIT',
        message: 'Demasiados mensajes, bajá un cambio 😅',
        data: {
          retryIn: rate.retryIn,
          strike: rate.strike,
        },
      })
    }

    this.server.emit('on-message', {
      userId: user.sub,
      name: user.name,
      message: body.body,
    })
  }
}

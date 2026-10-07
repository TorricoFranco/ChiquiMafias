import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets'
import { UseFilters, Logger, UseGuards } from '@nestjs/common'
import { Namespace, Server, Socket } from 'socket.io'
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'
import { AuthService } from '../auth/auth.service'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'

@WebSocketGateway({
  namespace: 'bets',
})
@UseFilters(AllWsExceptionFilter)
@UseGuards(WsJwtGuard)
export class BetsGateway implements OnGatewayInit {
  private readonly logger = new Logger(BetsGateway.name)

  @WebSocketServer()
  public server: Server

  private readonly DASHBOARD_ROOM = 'bets_dashboard'
  constructor(private readonly authService: AuthService) {}

  // La auth va en un middleware y no en handleConnection: así el cliente
  // recibe `connect` con el usuario ya cargado y ningún mensaje (por ejemplo
  // join_dashboard) llega antes de terminar de autenticar. Si se rechaza,
  // el cliente recibe connect_error y no reintenta solo.
  afterInit(namespace: Namespace) {
    namespace.use((socket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch((error: Error) => next(error))
    })
  }

  private async authenticate(socket: Socket) {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      socket.handshake.headers['authorization']

    if (!token) {
      this.logger.warn(`Intento de conexión a apuestas sin token: ${socket.id}`)
      throw new Error('No autorizado')
    }

    // authenticateSocket rechaza usuarios BANNED (verifyToken no)
    const user = await this.authService.authenticateSocket(token)
    if (!user) {
      this.logger.warn(
        `Usuario no válido intentando conectar a apuestas: ${socket.id}`,
      )
      throw new Error('No autorizado')
    }

    const socketData = socket.data as { user?: typeof user }
    socketData.user = user
    this.logger.log(`Cliente autenticado en apuestas: ${user.id}`)
  }

  @SubscribeMessage('join_dashboard')
  handleJoinDashboard(@ConnectedSocket() client: Socket) {
    client.join(this.DASHBOARD_ROOM)
    this.logger.log(`Socket ${client.id} entró al Dashboard`)
    return { status: 'subscribed_to_dashboard' }
  }

  @SubscribeMessage('leave_dashboard')
  handleLeaveDashboard(@ConnectedSocket() client: Socket) {
    client.leave(this.DASHBOARD_ROOM)
    this.logger.log(`Solicitud de salida del Dashboard para: ${client.id}`)
    return { status: 'unsubscribed' }
  }

  // MÉTODOS EMISORES

  emitMarketCreated(marketData: any) {
    this.logger.debug(
      `Emitiendo market_created para la sala: ${this.DASHBOARD_ROOM}`,
    )
    this.server.to(this.DASHBOARD_ROOM).emit('market_created', marketData)
  }

  emitPoolUpdate(
    marketId: string,
    poolData: {
      optionId: string
      newTotalStaked: number
      newOdds: number
      options: { id: string; currentOdds: number; totalStaked: number }[]
    },
  ) {
    this.logger.debug(
      `Actualizando pool para el market: ${marketId}, opción: ${poolData.optionId}`,
    )
    this.server.to(this.DASHBOARD_ROOM).emit('market_pool_updated', {
      marketId,
      ...poolData,
    })
  }

  emitMarketStatusChange(
    marketId: string,
    status: 'LOCKED' | 'SETTLED' | 'REFUNDED',
    extraData?: any,
  ) {
    this.logger.log(`Cambio de estado en market ${marketId} a: ${status}`)
    this.server.to(this.DASHBOARD_ROOM).emit('market_status_changed', {
      marketId,
      status,
      ...extraData,
    })
  }
}

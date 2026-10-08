import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets'
import { UseFilters, Logger, UseGuards } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'
import { AuthService } from '../auth/auth.service'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'

@WebSocketGateway({
  namespace: 'bets',
})
@UseFilters(AllWsExceptionFilter)
@UseGuards(WsJwtGuard)
export class BetsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(BetsGateway.name)

  @WebSocketServer()
  public server: Server

  private readonly DASHBOARD_ROOM = 'bets_dashboard'
  constructor(private readonly authService: AuthService) { }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers['authorization']

      if (!token) {
        this.logger.warn(
          `Intento de conexión a apuestas sin token: ${client.id}`,
        )
        client.disconnect()
        return
      }

      const user = await this.authService.verifyToken(token)
      if (!user) {
        this.logger.warn(
          `Usuario no válido intentando conectar a apuestas: ${client.id}`,
        )
        client.disconnect()
        return
      }

      client.data.user = user
      this.logger.log(`Cliente autenticado en apuestas: ${user.id}`)
    } catch (error) {
      this.logger.error(
        `Error de autenticación en BetsGateway: ${error.message}`,
      )
      client.disconnect()
    }
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

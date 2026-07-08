import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { OnModuleInit, UseFilters, Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'

@WebSocketGateway({
  namespace: 'bets',
})
@UseFilters(AllWsExceptionFilter)
export class BetsGateway implements OnModuleInit {
  private readonly logger = new Logger(BetsGateway.name)

  @WebSocketServer()
  public server: Server

  private readonly DASHBOARD_ROOM = 'bets_dashboard'

  onModuleInit() {
    this.server.on('connection', (socket: Socket) => {
      this.logger.log(`Cliente conectado a apuestas: ${socket.id}`)

      socket.on('disconnect', () => {
        this.logger.log(`Cliente desconectado de apuestas: ${socket.id}`)
      })
    })
  }

  @SubscribeMessage('join_dashboard')
  handleJoinDashboard(@ConnectedSocket() client: Socket) {
    client.join(this.DASHBOARD_ROOM)
    this.logger.log(`Socket ${client.id} entró al Dashboard Global de apuestas`)
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
    poolData: { totalPool: number; options: any[] },
  ) {
    this.logger.debug(`Actualizando pool para el market: ${marketId}`)
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

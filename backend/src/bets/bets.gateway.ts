import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { OnModuleInit, UseFilters } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'

@WebSocketGateway({
  namespace: 'bets',
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
})
@UseFilters(AllWsExceptionFilter)
export class BetsGateway implements OnModuleInit {
  @WebSocketServer()
  public server: Server

  private readonly DASHBOARD_ROOM = 'bets_dashboard'

  onModuleInit() {
    this.server.on('connection', (socket: Socket) => {
      console.log(` Cliente conectado a apuestas: ${socket.id}`)

      socket.on('disconnect', () => {
        console.log(`Cliente desconectado de apuestas: ${socket.id}`)
      })
    })
  }

  @SubscribeMessage('join_dashboard')
  handleJoinDashboard(@ConnectedSocket() client: Socket) {
    client.join(this.DASHBOARD_ROOM)
    console.log(`Socket ${client.id} entró al Dashboard Global de apuestas`)
    return { status: 'subscribed_to_dashboard' }
  }

  @SubscribeMessage('leave_dashboard')
  handleLeaveDashboard(@ConnectedSocket() client: Socket) {
    client.leave(this.DASHBOARD_ROOM)
    console.log(`Solicitud de salida del Dashboard para: ${client.id}`)
    return { status: 'unsubscribed' }
  }

  // MÉTODOS EMISORES

  /**
   * Avisa a todos que hay un partido nuevo disponible para apostar
   */
  emitMarketCreated(marketData: any) {
    this.server.to(this.DASHBOARD_ROOM).emit('market_created', marketData)
  }

  /**
   *  Actualiza los montos del pozo de una tarjeta específica
   */
  emitPoolUpdate(
    marketId: string,
    poolData: { totalPool: number; options: any[] },
  ) {
    this.server.to(this.DASHBOARD_ROOM).emit('market_pool_updated', {
      marketId,
      ...poolData,
    })
  }

  /**
   * Cierra, liquida o reembolsa un partido en la pantalla de todos
   */
  emitMarketStatusChange(
    marketId: string,
    status: 'LOCKED' | 'SETTLED' | 'REFUNDED',
    extraData?: any,
  ) {
    this.server.to(this.DASHBOARD_ROOM).emit('market_status_changed', {
      marketId,
      status,
      ...extraData,
    })
  }
}

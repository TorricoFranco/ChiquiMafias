import { IoAdapter } from '@nestjs/platform-socket.io'
import { ConfigService } from '@nestjs/config'
import { INestApplicationContext, Logger } from '@nestjs/common'
import { buildCorsOrigins } from 'src/config/cors'

export class SocketIoAdapter extends IoAdapter {
  private configService: ConfigService
  private readonly logger = new Logger('SocketIoAdapter')

  constructor(appOrWithHandlers: INestApplicationContext) {
    super(appOrWithHandlers)
    this.configService = appOrWithHandlers.get(ConfigService)
  }

  createIOServer(port: number, options?: any): any {
    const clientUrl = this.configService.get<string>('CLIENT_URL')

    this.logger.log(
      `Configurando WebSocket CORS para el origen: "${clientUrl}"`,
    )

    // Mismos orígenes que el CORS de REST; nunca '*' con credentials.
    const origins = buildCorsOrigins(
      clientUrl,
      this.configService.get<string>('NODE_ENV'),
    )

    const serverOptions = {
      ...options,
      cors: {
        origin: origins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    }

    return super.createIOServer(port, serverOptions)
  }
}

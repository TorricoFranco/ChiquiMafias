import { IoAdapter } from '@nestjs/platform-socket.io'
import { ConfigService } from '@nestjs/config'
import { INestApplicationContext, Logger } from '@nestjs/common'

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

    const origins = clientUrl
      ? clientUrl.split(',').map((url) => url.trim())
      : '*'

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

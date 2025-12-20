import { Catch, ArgumentsHost, WsExceptionFilter, BadRequestException } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Catch()
export class AllWsExceptionFilter implements WsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>()

    let message = 'Error interno'
    let code = 'WS_ERROR'
    let data = null

    // Errores lanzados con WsException (guard, rate limit, etc)
    if (exception instanceof WsException) {
      const error = exception.getError()

      if (typeof error === 'string') {
        message = error
      } else if (typeof error === 'object') {
        message = (error as any).message ?? message
        code = (error as any).code ?? code
        data = (error as any).data ?? null
      }
    }

    //  Errores de DTO / ValidationPipe
    else if (exception instanceof BadRequestException) {
      const response = exception.getResponse() as any
      message = Array.isArray(response.message)
        ? response.message.join(', ')
        : response.message
      code = 'VALIDATION_ERROR'
    }

    client.emit('ws-error', {
      code,
      message,
      data,
    })
  }
}

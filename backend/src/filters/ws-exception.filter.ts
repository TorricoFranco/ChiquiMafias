import {
  Catch,
  ArgumentsHost,
  WsExceptionFilter,
  BadRequestException,
} from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Catch()
export class AllWsExceptionFilter implements WsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>()
    const args = host.getArgs()

    const ack = args.find((arg) => typeof arg === 'function')

    let message = 'Error interno del servidor'
    let code = 'INTERNAL_ERROR'
    let data = null

    if (exception instanceof WsException) {
      const error = exception.getError()
      if (typeof error === 'string') {
        message = error
      } else if (typeof error === 'object') {
        message = (error as any).message || message
        code = (error as any).code || 'WS_ERROR'
        data = (error as any).data || null
      }
    } else if (exception instanceof BadRequestException) {
      const response = exception.getResponse() as any
      message = Array.isArray(response.message)
        ? response.message.join(', ')
        : response.message
      code = 'VALIDATION_ERROR'
    }

    const errorResponse = { status: 'error', code, message, data }

    if (ack) {
      ack(errorResponse)
    }

    client.emit('ws-error', errorResponse)
  }
}

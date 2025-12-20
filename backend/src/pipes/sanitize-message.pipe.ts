// src/common/pipes/sanitize-message.pipe.ts
import { PipeTransform, Injectable } from '@nestjs/common'
import sanitizeHtml from 'sanitize-html'
import { WsException } from '@nestjs/websockets'
import { SendMessageDto } from 'src/chat/send-message.dto'

@Injectable()
export class SanitizeMessagePipe implements PipeTransform {
  transform(value: SendMessageDto) {
    if (typeof value.body === 'string') {
      value.body = sanitizeHtml(value.body, {
        allowedTags: [],
        allowedAttributes: {},
        textFilter: (text) => text,
      })
    }

    if (value.body === '') {
      throw new WsException({
        code: 'INVALID_MESSAGE',
        message:
          'El mensaje no puede estar vacío o contener solo HTML no permitido',
      })
    }
    return value
  }
}

import { PipeTransform, Injectable } from '@nestjs/common'
import sanitizeHtml from 'sanitize-html'
import { WsException } from '@nestjs/websockets'

@Injectable()
export class SanitizeMessagePipe implements PipeTransform {
  transform(value: any) {
    if (!value) return value

    const textField =
      value.message !== undefined
        ? 'message'
        : value.body !== undefined
          ? 'body'
          : null

    if (textField && typeof value[textField] === 'string') {
      value[textField] = sanitizeHtml(value[textField], {
        allowedTags: [],
        allowedAttributes: {},
        textFilter: (text) => text,
      })

      if (value[textField].trim() === '' && !value.stickerId) {
        throw new WsException({
          code: 'INVALID_MESSAGE',
          message:
            'El mensaje no puede estar vacío o contener solo HTML no permitido',
        })
      }
    }

    return value
  }
}

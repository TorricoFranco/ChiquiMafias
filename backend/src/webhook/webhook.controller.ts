import {
  Controller,
  Post,
  UsePipes,
  Body,
  ValidationPipe,
  Headers,
  Query,
} from '@nestjs/common'
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Public } from 'src/auth/decorators/auth.decorator'
import { WebhookService } from './webhook.service'

@ApiTags('Webhooks (Mercado Pago)')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webHookService: WebhookService) {}

  @ApiOperation({
    summary:
      'Webhook de notificaciones de pago de Mercado Pago (servicio a servicio)',
    description:
      'Endpoint de servidor a servidor, no pensado para llamarse desde el front: valida la firma con `x-signature` antes de procesar. El procesamiento es idempotente (unique en ProcessedPayment), por lo que una notificación repetida responde OK sin aplicar beneficios dos veces.',
  })
  @ApiHeader({
    name: 'x-signature',
    description:
      'Firma HMAC de Mercado Pago, validada con MERCADO_PAGO_WEBHOOK_SECRET',
  })
  @ApiHeader({
    name: 'x-request-id',
    description:
      'ID de request de Mercado Pago, usado en la validación de la firma',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificación procesada (o ya procesada previamente).',
  })
  @ApiResponse({ status: 401, description: 'Firma inválida.' })
  @Post('mercado-pago')
  @Public()
  @UsePipes(
    new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }),
  )
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
    @Query() query: any,
  ) {
    return this.webHookService.processWebhook(
      payload,
      xSignature,
      xRequestId,
      query,
    )
  }
}

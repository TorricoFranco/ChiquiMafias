import {
  Controller,
  Post,
  UsePipes,
  Body,
  ValidationPipe,
  Headers,
  Query,
} from '@nestjs/common'
import { Public } from 'src/auth/decorators/auth.decorator'
import { WebhookService } from './webhook.service'

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webHookService: WebhookService) {}

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
    return this.webHookService.processWebhook(payload, xSignature, xRequestId, query)
  }
}

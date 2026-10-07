import { IsOptional, IsNumber, IsObject } from 'class-validator'

export class MercadoPagoWebhookDto {
  @IsOptional()
  @IsNumber()
  id?: number

  @IsOptional()
  type?: string

  @IsOptional()
  @IsObject()
  data?: {
    id: string | number
  }

  @IsOptional()
  resource?: string

  @IsOptional()
  @IsObject()
  action?: Record<string, any>
}

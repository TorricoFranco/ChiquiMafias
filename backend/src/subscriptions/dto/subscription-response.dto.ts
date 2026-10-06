import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'
import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsDate,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CheckoutSubscriptionResponseDto {
  @ApiProperty({
    description: 'Link de pago de Mercado Pago al que redirigir al usuario',
  })
  init_point: string

  @ApiProperty({
    description:
      'Referencia externa que identifica el checkout ante Mercado Pago',
  })
  external_reference: string

  @ApiProperty({
    description: 'ID de la suscripción creada en estado pendiente',
  })
  subscription_id: string

  @ApiProperty({ enum: SubscriptionTier, description: 'Tier elegido' })
  tier: SubscriptionTier
}

export class SubscriptionDetailResponseDto {
  @ApiProperty({
    enum: SubscriptionTier,
    nullable: true,
    description: 'Tier efectivo actual del usuario',
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  currentActualTier: SubscriptionTier | null

  @ApiProperty({ nullable: true, description: 'ID de la suscripción' })
  @IsOptional()
  @IsString()
  id: string | null

  @ApiProperty({
    enum: SubscriptionTier,
    nullable: true,
    description: 'Tier contratado',
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier | null

  @ApiProperty({ enum: SubscriptionStatus, nullable: true })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus | null

  @ApiProperty({
    nullable: true,
    description: 'Fecha de inicio del ciclo actual',
  })
  @IsOptional()
  @IsDate()
  startsAt: Date | null

  @ApiProperty({
    nullable: true,
    description:
      'Fecha de fin del ciclo actual (o de los beneficios, si se canceló)',
  })
  @IsOptional()
  @IsDate()
  endsAt: Date | null

  @ApiProperty({
    nullable: true,
    description: 'Si la suscripción se renueva automáticamente',
  })
  @IsOptional()
  @IsBoolean()
  autoRenew: boolean | null

  @ApiProperty({
    required: false,
    description: 'ID de preapproval en Mercado Pago',
  })
  @IsOptional()
  @IsString()
  mpPreapprovalId?: string

  @ApiProperty({
    required: false,
    description: 'Referencia externa de Mercado Pago',
  })
  @IsOptional()
  @IsString()
  mpExternalRef?: string
}

export class UpgradeSubscriptionResponseDto {
  @ApiProperty({
    description:
      'Link de pago de Mercado Pago, si el upgrade requiere un nuevo cobro',
  })
  init_point: string

  @ApiProperty({
    description: 'Referencia externa del upgrade ante Mercado Pago',
  })
  external_reference: string

  @ApiProperty({ enum: SubscriptionTier, description: 'Nuevo tier contratado' })
  new_tier: SubscriptionTier

  @ApiProperty({
    description:
      'Monedas de bonificación otorgadas por los días restantes del plan anterior',
  })
  bonus_coins: number

  @ApiProperty({ description: 'Mensaje descriptivo del resultado del upgrade' })
  message: string
}

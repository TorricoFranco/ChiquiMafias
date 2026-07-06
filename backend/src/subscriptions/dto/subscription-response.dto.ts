import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'
import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsDate,
} from 'class-validator'

export class CheckoutSubscriptionResponseDto {
  init_point: string
  external_reference: string
  subscription_id: string
  tier: SubscriptionTier
}

export class SubscriptionDetailResponseDto {
  @IsOptional()
  @IsEnum(SubscriptionTier)
  currentActualTier: SubscriptionTier | null

  @IsOptional()
  @IsString()
  id: string | null

  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier | null

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus | null

  @IsOptional()
  @IsDate()
  startsAt: Date | null

  @IsOptional()
  @IsDate()
  endsAt: Date | null

  @IsOptional()
  @IsBoolean()
  autoRenew: boolean | null

  @IsOptional()
  @IsString()
  mpPreapprovalId?: string

  @IsOptional()
  @IsString()
  mpExternalRef?: string
}

export class UpgradeSubscriptionResponseDto {
  init_point: string
  external_reference: string
  new_tier: SubscriptionTier
  bonus_coins: number
  message: string
}

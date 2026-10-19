// Re-exports para easy imports
// export { SubscriptionsController } from './subscriptions.controller'
// export { SubscriptionsService } from './subscriptions.service'
export { SubscriptionsCronService } from './subscriptions.cron'
export { SubscriptionsModule } from './subscriptions.module'
export * from './subscriptions.service'
export * from './subscriptions.controller'

export type {
  MercadoPagoPreapprovalPayload,
  MercadoPagoPreapprovalResponse,
  MercadoPagoWebhookPayload,
  MercadoPagoPaymentDetails,
  SubscriptionPricingModel,
} from './interfaces/mercado-pago.interface'

// DTOs
export { CheckoutSubscriptionDto } from './dto/checkout-subscription.dto'
export { CancelSubscriptionDto } from './dto/cancel-subscription.dto'
export { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto'
export { MercadoPagoWebhookDto } from './dto/mercado-pago-webhook.dto'
export {
  CheckoutSubscriptionResponseDto,
  SubscriptionDetailResponseDto,
  UpgradeSubscriptionResponseDto,
} from './dto/subscription-response.dto'

// Constants
export {
  WEEKEND_DISCOUNT_PERCENTAGE,
  SUBSCRIPTION_CYCLE_DAYS,
  GRACE_PERIOD_HOURS,
} from './constants/subscription.constants'

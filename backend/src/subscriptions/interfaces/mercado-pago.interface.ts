/**
 * INTERFACES PARA INTEGRACIÓN CON MERCADO PAGO
 */

export interface MercadoPagoPreapprovalPayload {
  reason: string
  external_reference: string
  payer_email: string
  back_url: string
  auto_recurring: {
    frequency: number
    frequency_type: 'days' | 'months' | 'years'
    transaction_amount: number
    currency_id: string
    start_date?: string
  }
  status?: string
}

export interface MercadoPagoPreapprovalResponse {
  id: string
  init_point: string
  external_reference: string
  payer_email?: string
  status: string
  auto_recurring?: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: string
  }
}

export class MercadoPagoWebhookPayload {
  action: string
  application_id: number
  date: string
  entity: string
  id: number
  type: string
  version: number
  data: {
    id: string
  }
}

export interface MercadoPagoPaymentDetails {
  id: number
  status: string
  status_detail: string
  transaction_amount: number
  description: string
  external_reference: string
  payer: {
    email: string
    identification: {
      type: string
      number: string
    }
  }
  [key: string]: any
}

export interface SubscriptionPricingModel {
  basePriceARS: number
  discountedPriceARS: number
  discountPercentage: number
  promoMessage: string | null;
  expiresAt: Date | null;
  isWeekend: boolean
  currency: string
  appliedAt: Date
}

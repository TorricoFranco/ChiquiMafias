import { SubscriptionTier } from '@prisma/client'


/**
 * DESCUENTO APLICADO EN FINES DE SEMANA O PROMOCIONES
 * Se aplica como porcentaje de rebaja sobre el precio base
 */
export const WEEKEND_DISCOUNT_PERCENTAGE = 15 // 15% de descuento

/**
 * CICLO DE SUSCRIPCIÓN
 * Período en días para el cual se genera la suscripción
 */
export const SUBSCRIPTION_CYCLE_DAYS = 30

/**
 * PERÍODO DE GRACIA
 * Tiempo en horas para recuperación ante fallo de pago
 */
export const GRACE_PERIOD_HOURS = 48

/**
 * CONFIGURACIÓN DE MERCADO PAGO
 * Variables de integración con la API de Preapproval
 */
export const MERCADO_PAGO_CONFIG = {
  API_BASE_URL:
    process.env.MERCADO_PAGO_API_URL || 'https://api.mercadopago.com',
  PREAPPROVAL_ENDPOINT: '/preapproval',
  PREAPPROVAL_PLAN_ENDPOINT: '/preapproval_plan',
  ACCESS_TOKEN:
    'APP_USR-8328509018778661-062609-16ba2aea82a7b356dc14231139d00a30-1454570585',
  // WEBHOOK_URL: process.env.MERCADO_PAGO_WEBHOOK_URL || '',
  WEBHOOK_URL:
    'https://outcast-curve-smokeless.ngrok-free.dev/subscriptions/webhook',
  WEBHOOK_RECEIVER_ID: process.env.MERCADO_PAGO_RECEIVER_ID || '',
  FRONTEND_SUCCESS_URL: `http://ers-chiquimafias.local:3000/subscriptions/success`,
  FRONTEND_FAILURE_URL: `http://ers-chiquimafias.local:3000/subscriptions/failed`,

  FRONTEND_PENDING_URL: `http://ers-chiquimafias.local:3000/subscriptions/pending`,
  CURRENCY: 'ARS',
  TIMEZONE: 'America/Argentina/Buenos_Aires',
}



/**
 * CONVERSIÓN DE DÍAS A MONEDAS VIRTUALES (PARA UPGRADE)
 * Cantidad de coins por cada día no consumido del plan anterior
 */
export const COINS_PER_DAY_UPGRADE = 100

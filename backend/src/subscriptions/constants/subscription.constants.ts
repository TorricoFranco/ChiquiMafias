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
 * CONVERSIÓN DE DÍAS A MONEDAS VIRTUALES (PARA UPGRADE)
 * Cantidad de coins por cada día no consumido del plan anterior
 */
export const COINS_PER_DAY_UPGRADE = 100

/**
 * VALORES FIJOS DE INTEGRACIÓN
 */
export const MERCADO_PAGO_CONSTANTS = {
  PREAPPROVAL_ENDPOINT: '/preapproval',
  PREAPPROVAL_PLAN_ENDPOINT: '/preapproval_plan',
  CURRENCY: 'ARS',
  TIMEZONE: 'America/Argentina/Buenos_Aires',
}

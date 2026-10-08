/**
 * DESCUENTOS Y PROMOCIONES
 */
export const WEEKEND_DISCOUNT_PERCENTAGE = 10
export const SUNDAY_VIP_DISCOUNT_PERCENTAGE = 15
export const SUNDAY_VIP_UPGRADE_DISCOUNT_PERCENTAGE = 25

export const PROMO_MESSAGES = {
  SUNDAY_VIP_UPGRADE: '⚡ UPGRADE VIP 25% OFF',
  SUNDAY_VIP: '⚡ OFERTA DOMINGO VIP 15% OFF',
  WEEKEND: '🔥 OFERTA DE FIN DE SEMANA',
} as const

/**
 * CICLO DE SUSCRIPCIÓN Y PERÍODOS
 */
export const SUBSCRIPTION_CYCLE_DAYS = 30
export const GRACE_PERIOD_HOURS = 48
// Vínculo upgrade → suscripción vieja en Redis: cubre los reintentos de cobro de MP
export const UPGRADE_LINK_TTL_SECONDS = 15 * 24 * 60 * 60

/**
 * INTEGRACIONES
 */
export const MERCADO_PAGO_CONSTANTS = {
  PREAPPROVAL_ENDPOINT: '/preapproval',
  PREAPPROVAL_PLAN_ENDPOINT: '/preapproval_plan',
  CURRENCY: 'ARS',
  TIMEZONE: 'America/Argentina/Buenos_Aires',
}

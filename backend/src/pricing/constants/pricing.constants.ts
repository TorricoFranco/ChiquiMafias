// Topes duros de validación de precios. Son anchos a propósito: el rango "razonable"
// de la economía se sugiere en el panel, no se bloquea acá.
export const PRICE_LIMITS = {
  // Pesos argentinos.
  COIN_PACK: { MIN: 1, MAX: 2_000_000 },
  // Monedas (ChiquiCoins). El mínimo de 10 evita que un ítem quede incomprable:
  // con el tope de descuento del 90%, por debajo de 10 el precio con descuento
  // da 0 y `subtractCoins` rechaza un monto de cero.
  STORE_ITEM: { MIN: 10, MAX: 100_000 },
  // Pesos argentinos. El mínimo de 1 evita dejar un plan en 0, que hace fallar el
  // checkout de Mercado Pago (subscription-checkout.service.ts). El máximo es bajo
  // a propósito: `calculateUpgradeBonus` deriva el bono en monedas del precio
  // ACTUAL del plan de origen, así que un precio disparatado emitiría monedas.
  SUBSCRIPTION_PLAN: { MIN: 1, MAX: 100_000 },
} as const

// Cuántos cambios de precio devuelve GET /pricing/admin.
export const PRICE_LOG_RECENT_LIMIT = 50

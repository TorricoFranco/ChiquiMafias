// Calibrado para que un usuario FREE con racha al tope (~298 monedas/día)
// junte un ítem normal de la tienda (2.000–3.000) por semana.
export const STREAK_CONFIG = {
  BASE_REWARD: 100,
  MAX_GROWTH_DAY: 7,
  GROWTH_RATE: 1.2,
  // Regalo de hito que el usuario ya tiene: se compensa en monedas, con tope
  GIFT_COMPENSATION_RATE: 0.6,
  MAX_GIFT_COMPENSATION: 500,
}

export const STREAK_CONFIG = {
  BASE_REWARD: 100,
  MAX_GROWTH_DAY: 14,
  GROWTH_RATE: 1.25,
}

export const TIER_MULTIPLIERS: Record<string, number> = {
  FREE: 1.0,
  TIER_1: 1.25,
  TIER_2: 1.5,
  TIER_3: 2.0,
}

interface SpecialGift {
  itemId: string
  itemName: string
}

// Registro de premios cosméticos declarados para días específicos
export const SPECIAL_GIFTS: Record<number, SpecialGift> = {
  10: { itemId: 'item-silver-border', itemName: 'Borde de Plata' },
  20: { itemId: 'item-gold-banner', itemName: 'Banner Dorado de Racha' },
  30: { itemId: 'item-mythic-neon', itemName: 'Color de Nombre Neón' },
}

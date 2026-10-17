import type { StoreItemType } from '@/features/store/types';

// Espejo de PRICE_LIMITS del backend (backend/src/pricing/constants/pricing.constants.ts).
export const PRICE_LIMITS = {
    COIN_PACK: { MIN: 1, MAX: 2_000_000 },
    STORE_ITEM: { MIN: 10, MAX: 100_000 },
    SUBSCRIPTION_PLAN: { MIN: 1, MAX: 100_000 },
} as const;

// Tope de descuento acumulado de la tienda (store.service.ts).
export const MAX_STORE_DISCOUNT_PERCENTAGE = 90;

// Los que el schema de Prisma marca como consumibles.
const CONSUMABLE_TYPES: StoreItemType[] = ['MEGAPHONE', 'CUSTOM_POLL'];
// Permanentes según el schema. BUFF queda afuera a propósito: no está clasificado,
// así que no se sugiere un rango en vez de sugerir el equivocado.
const PERMANENT_TYPES: StoreItemType[] = [
    'STICKER_PACK',
    'NAME_COLOR',
    'BANNER',
    'CHAT_BUBBLE',
];

/** Rango sugerido por la economía acordada. Es una ayuda, no una validación. */
export const suggestedRangeFor = (type: StoreItemType): string => {
    if (CONSUMABLE_TYPES.includes(type)) return 'Consumible: 300 a 500 monedas';
    if (PERMANENT_TYPES.includes(type)) return 'Permanente: 1.000 (común) a 15.000 (legendario)';
    return 'Sin rango sugerido para este tipo';
};

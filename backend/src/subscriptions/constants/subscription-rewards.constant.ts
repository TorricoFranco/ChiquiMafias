import { ItemType } from '@prisma/client';


export const SUBSCRIPTION_GIFTS = {
  TIER_1: {
    cosmetics: [
      { assetId: 'banner_toxic', type: ItemType.CHAT_BUBBLE, quantity: 1 },
      { assetId: 'color_gold', type: ItemType.NAME_COLOR, quantity: 1 },
      { assetId: 'color_silver', type: ItemType.NAME_COLOR, quantity: 1 },
      { assetId: 'poll_ticket_gold', type: ItemType.CUSTOM_POLL, quantity: 1 },
      { assetId: 'item_megaphone', type: ItemType.MEGAPHONE, quantity: 1 },

    ],
    showAnimation: true,
  },
  TIER_2: {
    coins: 2000,
    cosmetics: [
      { assetId: 'azzaro-este-es-un-canchero', type: ItemType.STICKER_PACK, quantity: 1 },
      { assetId: 'bubble_epic', type: ItemType.CHAT_BUBBLE, quantity: 1 },
      { assetId: 'color_gold', type: ItemType.NAME_COLOR, quantity: 1 },
      { assetId: 'maradona-mundial-beso-copa', type: ItemType.BANNER, quantity: 1 },
      { assetId: 'poll_ticket_gold', type: ItemType.CUSTOM_POLL, quantity: 2 },
      { assetId: 'item_megaphone', type: ItemType.MEGAPHONE, quantity: 2 },
    ],
    showAnimation: true,
  },
  TIER_3: {
    coins: 3000,
    cosmetics: [
      { assetId: 'azzaro-este-es-un-canchero', type: ItemType.STICKER_PACK, quantity: 1 },
      { assetId: 'coco-basile-los-genios-hacen-eso', type: ItemType.STICKER_PACK, quantity: 1 },
      { assetId: 'drogba-barcelona-robo', type: ItemType.STICKER_PACK, quantity: 1 },
      { assetId: 'hola-susana', type: ItemType.STICKER_PACK, quantity: 1 },
      { assetId: 'bubble_mythic', type: ItemType.CHAT_BUBBLE, quantity: 1 },
      { assetId: 'color_diamond', type: ItemType.NAME_COLOR, quantity: 1 },
      { assetId: 'maradona-mundial-beso-copa', type: ItemType.BANNER, quantity: 1 },
      { assetId: 'messi-pensativo-poster', type: ItemType.BANNER, quantity: 1 },
      { assetId: 'poll_ticket_gold', type: ItemType.CUSTOM_POLL, quantity: 5 },
      { assetId: 'item_megaphone', type: ItemType.MEGAPHONE, quantity: 5 },

    ],
    showAnimation: true,
  }
} as const;


export const TIER_MULTIPLIERS: Record<string, number> = {
    FREE: 1.0,
    TIER_1: 1.25,
    TIER_2: 1.5,
    TIER_3: 2.0,
}


export interface SpecialGift {
    assetId: string;
    type: ItemType;
}

export const SPECIAL_GIFTS: Record<number, Record<string, SpecialGift>> = {
    5: {
        TIER_3: { assetId: 'poll_ticket_gold', type: 'CUSTOM_POLL' },
    },
    7: {
        TIER_2: { assetId: 'item_megaphone', type: 'MEGAPHONE' },
        TIER_3: { assetId: 'item_megaphone', type: 'MEGAPHONE' },
    },

    10: {
        FREE: { assetId: 'color_silver', type: 'NAME_COLOR' },
        TIER_1: { assetId: 'color_gold', type: 'NAME_COLOR' },
        TIER_2: { assetId: 'color_neon', type: 'NAME_COLOR' },
        TIER_3: { assetId: 'color_neon', type: 'NAME_COLOR' },
    },

    15: {
        FREE: { assetId: 'item_megaphone', type: 'MEGAPHONE' },
        TIER_1: { assetId: 'item_megaphone', type: 'MEGAPHONE' },
        TIER_2: { assetId: 'poll_ticket_gold', type: 'CUSTOM_POLL' },
        TIER_3: { assetId: 'item_megaphone', type: 'MEGAPHONE' },
    },

    20: {
        TIER_2: { assetId: 'bubble_epic', type: 'CHAT_BUBBLE' },
        TIER_3: { assetId: 'bubble_mythic', type: 'CHAT_BUBBLE' },
    },

    25: {
        TIER_3: { assetId: 'genio', type: 'STICKER_PACK' },
    },

    30: {
        FREE: { assetId: 'bubble_epic', type: 'CHAT_BUBBLE' },
        TIER_1: { assetId: 'banner_messi', type: 'BANNER' },
        TIER_2: { assetId: 'banner_messi', type: 'BANNER' },
        TIER_3: { assetId: 'banner_messi', type: 'BANNER' },
    },
};
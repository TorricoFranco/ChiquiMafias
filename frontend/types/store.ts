export type StoreItemType = 'NAME_COLOR' | 'BANNER' | 'STICKER_PACK' | 'MEGAPHONE' | 'CUSTOM_POLL';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: StoreItemType;
  assetId: string;
  isOwned?: boolean;
  ownedQuantity?: number;

  currentPrice: number;
  isDiscounted: boolean;
  discountPercentage?: number;
  discountName?: string;
}
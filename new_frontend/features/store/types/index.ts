export type StoreItemType = 'NAME_COLOR' | 'BANNER' | 'STICKER_PACK' | 'MEGAPHONE' | 'CUSTOM_POLL' | 'CHAT_BUBBLE';


export interface StoreItem {
    id: string;
    name: string;
    description: string;
    type: StoreItemType;
    price: number;
    assetId: string;
    isActive: boolean;
    isOwned?: boolean;
    ownedQuantity: number;
    createdAt: string;

    currentPrice: number;
    isDiscounted: boolean;
    discountPercentage?: number;
    discountName?: string;
}

export interface BuyItemResponse {
    status: 'success';
    message: string;
    data: any; 
}
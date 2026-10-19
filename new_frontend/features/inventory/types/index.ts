export type EquipableType = 'NAME_COLOR' | 'BANNER' | 'CHAT_BUBBLE';

export interface InventoryItem {
    id: string;
    itemId: string;
    quantity: number;
    isEquipped: boolean;
    createdAt: string;
    item: {
        id: string;
        name: string;
        description: string;
        type: EquipableType | 'MEGAPHONE' | 'STICKER_PACK' | string;
        assetId: string;
    };
    isExclusive: boolean;
}

export interface EquipResponse {
    status: 'ok';
    equipped: EquipableType;
    assetId: string; 
}

export interface UnequipResponse {
    status: 'ok';
    unequipped: EquipableType;
}

export interface ConsumeResponse {
    status: string;
    remaining: number;
}
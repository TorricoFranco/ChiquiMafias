import { StoreItemType } from "./store";

export interface InventoryItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    type: StoreItemType;
    assetId: string;
  };
}


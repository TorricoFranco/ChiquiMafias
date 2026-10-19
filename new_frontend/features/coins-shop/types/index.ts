export interface CoinPack {
  id: string;
  name: string;
  description?: string;
  coinsAmount: number;
  bonusCoins: number;
  isPopular: boolean;
  priceARS: number;
  isActive: boolean;
}

export interface BuyPackResponse {
  status: string;
  message: string;
  data: {
    orderId: string;
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint: string;
  };
}

export interface CoinOrder {
  id: string;
  packId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  finalPriceARS: number;
  coinsToCredit: number;
  createdAt: string;
  pack: CoinPack; 
}
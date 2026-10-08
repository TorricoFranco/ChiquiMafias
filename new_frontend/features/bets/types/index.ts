export type MarketType = 'MATCH' | 'CUSTOM' | 'OUTRIGHT';
export type MarketStatus = 'OPEN' | 'LOCKED' | 'SETTLED' | 'REFUNDED';


export interface TeamMetadata {
  name: string;
  short: string;
  logoUrl: string;
}

export interface MarketMetadata {
  homeTeam?: TeamMetadata;
  awayTeam?: TeamMetadata;
}

export interface MarketOption {
  id: string;
  name: string;
  odds?: number;
  currentOdds?: number;
  initialProb?: number;
  totalStaked: number;
}

export interface Market {
  id: string;
  title: string;
  type: MarketType;
  category?: string | null;
  description?: string | null;
  metadata?: MarketMetadata | null;
  status: MarketStatus;
  fixtureId?: number | null;
  closesAt: string;
  options: MarketOption[];
}

export interface BetHistoryItem {
  id: string;
  marketTitle: string;
  optionName: string;
  stake: number;
  payout: number;
  multiplier: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';
  marketStatus: MarketStatus;
  createdAt: string;
}


export interface MarketOptionEntity {
  id: string;
  marketId: string;
  name: string;
  initialProb: number;
  totalStaked: number;
  currentOdds?: number;
}

export interface AdminMarket {
  id: string;
  title: string;
  type: MarketType;
  category?: string | null;
  description?: string | null;
  metadata?: MarketMetadata | null;
  fixtureId?: number | null;
  isManual: boolean;
  status: MarketStatus;
  createdAt: string;
  closesAt: string;
  settledAt?: string | null;
  options: MarketOptionEntity[];
}

export interface CreateMarketPayload {
  title: string;
  type?: MarketType;
  category?: string;
  description?: string;
  metadata?: MarketMetadata;
  fixtureId?: number;
  closesAt: string;
  options: { name: string; initialProb: number }[];
}
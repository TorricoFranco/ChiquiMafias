export const VIRTUAL_POOL = 10000;

export interface MarketOptionLike {
  initialProb: number;
  totalStaked: number;
  [key: string]: any;
}

export interface MarketLike {
  options: MarketOptionLike[];
  [key: string]: any;
}

export interface OptionWithOdds extends MarketOptionLike {
  currentOdds: number;
}

export interface MarketWithOdds extends MarketLike {
  options: OptionWithOdds[];
}

/**
 * Calcula dinámicamente las cuotas (currentOdds) para cada opción de un mercado
 * basándose en el modelo Pari-Mutuel con un Pozo Virtual de liquidez.
 */
export function calculateMarketOdds(market: MarketLike): MarketWithOdds {
  
  const realTotalPool = (market.options || []).reduce(
    (sum, opt) => sum + (opt.totalStaked || 0),
    0,
  );
  
  const totalPool = realTotalPool + VIRTUAL_POOL;

  const updatedOptions: OptionWithOdds[] = (market.options || []).map((option) => {
    const initialProb = option.initialProb || 0;
    const totalStaked = option.totalStaked || 0;

    const virtualOptionStake = VIRTUAL_POOL * (initialProb / 100);
    const totalOptionStake = totalStaked + virtualOptionStake;

    const rawOdds = totalOptionStake > 0 ? totalPool / totalOptionStake : 1;
    const currentOdds = Number(rawOdds.toFixed(2));

    return {
      ...option,
      currentOdds,
    };
  });

  return {
    ...market,
    options: updatedOptions,
  };
}
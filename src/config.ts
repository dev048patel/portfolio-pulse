// Edit this file to match your account.
// invested = CAD you actually paid. null = start tracking P/L from the first launch.
export type Holding = {
  symbol: string;
  yahoo: string; // ticker for price lookups
  usd: boolean; // priced in USD, converted to CAD
  shares: number;
  invested: number | null;
  news: string; // news search words
};

export const HOLDINGS: Holding[] = [
  { symbol: 'NVDA', yahoo: 'NVDA', usd: true, shares: 1.7711, invested: null, news: 'Nvidia stock' },
  { symbol: 'SMH', yahoo: 'SMH', usd: true, shares: 0.6067, invested: null, news: 'semiconductor stocks chip ETF' },
  { symbol: 'VFV', yahoo: 'VFV.TO', usd: false, shares: 2.1698, invested: null, news: 'S&P 500 stocks' },
  { symbol: 'VEQT', yahoo: 'VEQT.TO', usd: false, shares: 0, invested: 0, news: 'global stock market' },
  { symbol: 'LLY', yahoo: 'LLY', usd: true, shares: 0, invested: 0, news: 'Eli Lilly' },
  { symbol: 'CNQ', yahoo: 'CNQ.TO', usd: false, shares: 0, invested: 0, news: 'Canadian Natural Resources oil' },
  { symbol: 'RY', yahoo: 'RY.TO', usd: false, shares: 0, invested: 0, news: 'Royal Bank of Canada' },
];

// Your plan: CAD per month, and how it splits. Raise MONTHLY each January.
export const MONTHLY = 200;
export const WEIGHTS: Record<string, number> = { VEQT: 0.4, LLY: 0.3, CNQ: 0.2, RY: 0.1 };

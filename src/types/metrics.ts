export interface JournalMetrics {
  totalTrades: number;
  winRate: number;
  totalRProfit: number;
  profitFactor: number;
  accountValue: number;
  percentageChange: number;
  equityCurve: EquityPoint[];
}

export interface EquityPoint { week: string; cumulativeR: number; }

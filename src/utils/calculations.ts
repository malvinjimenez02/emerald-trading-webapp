import type { Trade } from '../types/trade';
import { TradeDirection, TradeResult, TradeStatus } from '../types/trade';
import type { AccountConfig } from '../types/account';
import type { JournalMetrics, EquityPoint } from '../types/metrics';

export function calculateR(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number,
  stopLoss: number
): number | null {
  const denominator = direction === TradeDirection.Long
    ? entryPrice - stopLoss
    : stopLoss - entryPrice;
  if (denominator === 0) return null;
  return direction === TradeDirection.Long
    ? (exitPrice - entryPrice) / denominator
    : (entryPrice - exitPrice) / denominator;
}

export function calculateMetrics(trades: Trade[], config: AccountConfig): JournalMetrics {
  const closed = trades.filter(t => t.status === TradeStatus.Closed);
  if (closed.length === 0) return emptyMetrics(config);

  const wins = closed.filter(t => t.result === TradeResult.Win);
  const winRate = (wins.length / closed.length) * 100;
  const totalRProfit = closed.reduce((sum, t) => sum + (t.rValue ?? 0), 0);

  const positiveR = closed
    .filter(t => (t.rValue ?? 0) > 0)
    .reduce((s, t) => s + (t.rValue ?? 0), 0);
  const negativeR = Math.abs(
    closed
      .filter(t => (t.rValue ?? 0) < 0)
      .reduce((s, t) => s + (t.rValue ?? 0), 0)
  );
  const profitFactor = negativeR === 0
    ? (positiveR > 0 ? 99.99 : 0)
    : positiveR / negativeR;

  // Use pnlAmount (USD) if provided; fall back to rValue × riskPerTrade
  const hasPnl = closed.some(t => t.pnlAmount != null);
  let netPnl: number;
  if (hasPnl) {
    netPnl = closed.reduce((sum, t) => {
      const amt = t.pnlAmount ?? (t.rValue ?? 0) * config.riskPerTrade;
      return sum + (t.result === TradeResult.Win ? amt : -Math.abs(amt));
    }, 0);
  } else {
    netPnl = totalRProfit * config.riskPerTrade;
  }

  const accountValue = config.initialCapital + netPnl;
  const percentageChange = ((accountValue - config.initialCapital) / config.initialCapital) * 100;
  const equityCurve = buildEquityCurve(closed);

  return {
    totalTrades: closed.length,
    winRate,
    totalRProfit,
    profitFactor,
    accountValue,
    percentageChange,
    equityCurve,
  };
}

function getISOWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function buildEquityCurve(closed: Trade[]): EquityPoint[] {
  const sorted = [...closed].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const weekMap = new Map<string, number>();
  for (const trade of sorted) {
    const week = getISOWeek(trade.closedAt ?? trade.createdAt);
    weekMap.set(week, (weekMap.get(week) ?? 0) + (trade.rValue ?? 0));
  }

  let cumulative = 0;
  return Array.from(weekMap.entries()).map(([week, r]) => {
    cumulative += r;
    return { week, cumulativeR: cumulative };
  });
}

// ─── Analysis helpers ─────────────────────────────────────────────────────────

export interface DirectionStats {
  direction: TradeDirection;
  total: number;
  wins: number;
  winRate: number;
  avgR: number;
}

export function winRateByDirection(trades: Trade[]): DirectionStats[] {
  const closed = trades.filter(t => t.status === TradeStatus.Closed);
  return [TradeDirection.Long, TradeDirection.Short].map(dir => {
    const group = closed.filter(t => t.direction === dir);
    const wins  = group.filter(t => t.result === TradeResult.Win);
    const avgR  = group.length
      ? group.reduce((s, t) => s + (t.rValue ?? 0), 0) / group.length
      : 0;
    return {
      direction: dir,
      total:   group.length,
      wins:    wins.length,
      winRate: group.length ? (wins.length / group.length) * 100 : 0,
      avgR,
    };
  });
}

export interface AssetStats {
  asset: string;
  total: number;
  wins: number;
  winRate: number;
  avgR: number;
}

export function topAssets(trades: Trade[], limit = 8): AssetStats[] {
  const closed = trades.filter(t => t.status === TradeStatus.Closed);
  const map = new Map<string, { wins: number; total: number; sumR: number }>();
  for (const t of closed) {
    const prev = map.get(t.assetName) ?? { wins: 0, total: 0, sumR: 0 };
    map.set(t.assetName, {
      wins:  prev.wins  + (t.result === TradeResult.Win ? 1 : 0),
      total: prev.total + 1,
      sumR:  prev.sumR  + (t.rValue ?? 0),
    });
  }
  return Array.from(map.entries())
    .map(([asset, s]) => ({
      asset,
      total:   s.total,
      wins:    s.wins,
      winRate: (s.wins / s.total) * 100,
      avgR:    s.sumR / s.total,
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, limit);
}

export interface DayStats {
  day: string;
  short: string;
  total: number;
  wins: number;
  winRate: number;
}

export function tradesByDay(trades: Trade[]): DayStats[] {
  const days = [
    { day: 'Monday',    short: 'Mon' },
    { day: 'Tuesday',   short: 'Tue' },
    { day: 'Wednesday', short: 'Wed' },
    { day: 'Thursday',  short: 'Thu' },
    { day: 'Friday',    short: 'Fri' },
  ];
  const closed = trades.filter(t => t.status === TradeStatus.Closed);
  return days.map(({ day, short }) => {
    const group = closed.filter(t => {
      const d = new Date(t.closedAt ?? t.createdAt).getDay(); // 1=Mon…5=Fri
      return d === ['Monday','Tuesday','Wednesday','Thursday','Friday'].indexOf(day) + 1;
    });
    const wins = group.filter(t => t.result === TradeResult.Win);
    return { day, short, total: group.length, wins: wins.length,
      winRate: group.length ? (wins.length / group.length) * 100 : 0 };
  });
}

export interface CalendarDayStats {
  dateKey: string;   // 'YYYY-MM-DD'
  pnl: number;
  total: number;
}

export function tradesByCalendarDay(trades: Trade[]): CalendarDayStats[] {
  const closed = trades.filter(t => t.status === TradeStatus.Closed);
  const map = new Map<string, CalendarDayStats>();
  for (const t of closed) {
    const key = (t.closedAt ?? t.createdAt).slice(0, 10);
    const existing = map.get(key) ?? { dateKey: key, pnl: 0, total: 0 };
    existing.pnl   += t.pnlAmount ?? 0;
    existing.total += 1;
    map.set(key, existing);
  }
  return Array.from(map.values());
}

export interface StreakResult {
  bestWin: number;
  worstLoss: number;
}

export function calculateStreaks(trades: Trade[]): StreakResult {
  const closed = [...trades.filter(t => t.status === TradeStatus.Closed)]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let bestWin = 0, worstLoss = 0, curWin = 0, curLoss = 0;
  for (const t of closed) {
    if (t.result === TradeResult.Win) {
      curWin++; curLoss = 0;
      bestWin = Math.max(bestWin, curWin);
    } else if (t.result === TradeResult.Loss) {
      curLoss++; curWin = 0;
      worstLoss = Math.max(worstLoss, curLoss);
    } else {
      curWin = 0; curLoss = 0;
    }
  }
  return { bestWin, worstLoss };
}

export interface DistributionBucket {
  range: string;
  count: number;
  isPositive: boolean;
}

export function profitDistribution(trades: Trade[]): DistributionBucket[] {
  const closed = trades.filter(
    t => t.status === TradeStatus.Closed && t.rValue != null
  );
  if (closed.length === 0) return [];

  const buckets = new Map<number, number>();
  for (const t of closed) {
    const bucket = Math.round(t.rValue!);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  const keys = Array.from(buckets.keys()).sort((a, b) => a - b);
  const min = keys[0];
  const max = keys[keys.length - 1];

  const result: DistributionBucket[] = [];
  for (let b = min; b <= max; b++) {
    result.push({
      range:      b === 0 ? '0R' : `${b > 0 ? '+' : ''}${b}R`,
      count:      buckets.get(b) ?? 0,
      isPositive: b >= 0,
    });
  }
  return result;
}

export function calculateExpectancy(trades: Trade[]): number {
  const closed = trades.filter(t => t.status === TradeStatus.Closed && t.rValue != null);
  if (closed.length === 0) return 0;
  return closed.reduce((s, t) => s + (t.rValue ?? 0), 0) / closed.length;
}

export function avgWinLoss(trades: Trade[]): { avgWinR: number; avgLossR: number } {
  const closed = trades.filter(t => t.status === TradeStatus.Closed);
  const wins  = closed.filter(t => t.result === TradeResult.Win  && t.rValue != null);
  const losses= closed.filter(t => t.result === TradeResult.Loss && t.rValue != null);
  return {
    avgWinR:  wins.length   ? wins.reduce((s, t)   => s + (t.rValue ?? 0), 0) / wins.length   : 0,
    avgLossR: losses.length ? losses.reduce((s, t) => s + (t.rValue ?? 0), 0) / losses.length : 0,
  };
}

function emptyMetrics(config: AccountConfig): JournalMetrics {
  return {
    totalTrades: 0,
    winRate: 0,
    totalRProfit: 0,
    profitFactor: 0,
    accountValue: config.initialCapital,
    percentageChange: 0,
    equityCurve: [],
  };
}

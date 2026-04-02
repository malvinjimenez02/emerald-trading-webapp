import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { EquityChart } from '../components/dashboard/EquityChart';
import { ActiveFilterBanner } from '../components/layout/ActiveFilterBanner';
import { useTradeStore } from '../stores/useTradeStore';
import { useJournalStore } from '../stores/useJournalStore';
import { useDateFilterStore } from '../stores/useDateFilterStore';
import type { Trade } from '../types/trade';
import { TradeResult, TradeStatus } from '../types/trade';
import { journalToConfig } from '../types/account';
import { calculateMetrics } from '../utils/calculations';
import { formatCurrency, formatDate, getTradeDate } from '../utils/formatters';

// ─── Recent Trades mini-list ──────────────────────────────────────────────────

const RecentTrades: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  const { isLoading } = useTradeStore();
  const navigate = useNavigate();

  const recent = trades
    .filter(t => t.status === TradeStatus.Closed)
    .slice(0, 5);

  return (
    <div className="bg-bg-surface rounded-xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary">
          Recent Trades
        </h2>
        <Link
          to="/history"
          className="flex items-center gap-1 text-[12px] text-accent hover:text-accent-dark transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-11 bg-bg-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-1">
          <p className="text-[13px]">No trades in this period</p>
          <p className="text-[12px] text-text-tertiary">Try a different date range</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map(trade => {
            const isWin = trade.result === TradeResult.Win;
            const rLabel = trade.rValue != null
              ? `${trade.rValue > 0 ? '+' : ''}${trade.rValue.toFixed(2)}R`
              : '—';

            return (
              <div
                key={trade.id}
                onClick={() => navigate(`/trade/${trade.id}`)}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-bg-secondary/50 hover:bg-bg-secondary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isWin ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
                  }`}>
                    {isWin ? 'W' : 'L'}
                  </span>
                  <span className="text-[13px] font-medium text-text truncate">{trade.assetName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className={`text-[13px] font-semibold tabular-nums ${isWin ? 'text-positive' : 'text-negative'}`}>
                    {rLabel}
                  </span>
                  <span className="text-[11px] text-text-secondary w-[64px] text-right">
                    {formatDate(getTradeDate(trade), 'MMM D')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { trades: allTrades, isLoading } = useTradeStore();
  const { activeJournal, loadJournals }  = useJournalStore();
  const { getFilteredTrades, preset, startDate, endDate } = useDateFilterStore();

  useEffect(() => { loadJournals(); }, []);

  const currency = activeJournal?.currency ?? 'USD';

  const config = useMemo(
    () => activeJournal
      ? journalToConfig(activeJournal)
      : { journalName: 'Journal', initialCapital: 10_000, riskPerTrade: 100, currency: 'USD' },
    [activeJournal],
  );

  // Apply global date filter then recalculate metrics from filtered set
  const filteredTrades = useMemo(
    () => getFilteredTrades(allTrades),
    [allTrades, preset, startDate, endDate], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const metrics = useMemo(
    () => calculateMetrics(filteredTrades, config),
    [filteredTrades, config],
  );

  // ── Derived metric values ──────────────────────────────────────────────────

  const accountValue = formatCurrency(metrics.accountValue, currency);

  const pctChange = metrics.percentageChange;
  const pctBadge  = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`;
  const pctColor  = pctChange >= 0 ? 'positive' : 'negative';

  const winRate   = `${metrics.winRate.toFixed(1)}%`;
  const totalR    = metrics.totalRProfit;
  const totalRStr = `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`;
  const totalRColor: 'positive' | 'negative' | 'default' =
    totalR > 0 ? 'positive' : totalR < 0 ? 'negative' : 'default';
  const pf    = metrics.profitFactor;
  const pfStr = pf >= 99 ? '∞' : pf.toFixed(2);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        {activeJournal && (
          <>
            <span className="text-text-secondary">/</span>
            <span className="text-text-secondary text-[15px]">{activeJournal.name}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-positive/10 text-positive">
              Active
            </span>
          </>
        )}
      </div>

      <ActiveFilterBanner />

      {/* ── Metric Cards (4 col) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Account Value"
          value={accountValue}
          badge={pctBadge}
          badgeColor={pctColor}
          isLoading={isLoading}
        />
        <MetricCard
          label="Win Rate"
          value={winRate}
          valueColor={metrics.winRate >= 50 ? 'positive' : 'negative'}
          isLoading={isLoading}
        />
        <MetricCard
          label="Total R Profit"
          value={totalRStr}
          valueColor={totalRColor}
          isLoading={isLoading}
        />
        <MetricCard
          label="Profit Factor"
          value={pfStr}
          valueColor={pf >= 1.5 ? 'positive' : pf < 1 ? 'negative' : 'default'}
          isLoading={isLoading}
        />
      </div>

      {/* ── Chart + Recent Trades (3 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EquityChart data={metrics.equityCurve} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <RecentTrades trades={filteredTrades} />
        </div>
      </div>
    </div>
  );
};

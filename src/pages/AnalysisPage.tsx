import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import { useTradeStore } from '../stores/useTradeStore';
import { useJournalStore } from '../stores/useJournalStore';
import { useDateFilterStore } from '../stores/useDateFilterStore';
import { ActiveFilterBanner } from '../components/layout/ActiveFilterBanner';
import {
  winRateByDirection,
  topAssets,
  calculateStreaks,
  profitDistribution,
  calculateExpectancy,
  avgWinLoss,
  calculateMetrics,
} from '../utils/calculations';
import { journalToConfig } from '../types/account';
import { TradeDirection } from '../types/trade';
import { formatDate } from '../utils/formatters';

// ─── Shared ───────────────────────────────────────────────────────────────────

const ACCENT   = '#10E261';
const NEGATIVE = '#F85149';
const SURFACE  = '#212836';

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title, children, className = '',
}) => (
  <div className={`bg-bg-surface rounded-xl p-5 flex flex-col gap-4 ${className}`}>
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{title}</h2>
    {children}
  </div>
);

const EmptyState: React.FC<{ text?: string }> = ({ text = 'No closed trades yet' }) => (
  <div className="flex-1 flex items-center justify-center py-6 text-[13px] text-text-secondary">{text}</div>
);

// ─── WinRateByDirection ───────────────────────────────────────────────────────

const WinRateByDirection: React.FC<{ trades: ReturnType<typeof winRateByDirection> }> = ({ trades }) => {
  if (trades.every(d => d.total === 0)) return <EmptyState />;
  return (
    <div className="flex flex-col gap-4">
      {trades.map(d => {
        const isLong = d.direction === TradeDirection.Long;
        const color  = isLong ? 'text-positive' : 'text-negative';
        const bar    = isLong ? 'bg-positive' : 'bg-negative';
        return (
          <div key={d.direction} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[12px] font-bold uppercase ${color}`}>{d.direction}</span>
                <span className="text-[11px] text-text-secondary">{d.total} trades</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-text-secondary">avg {d.avgR >= 0 ? '+' : ''}{d.avgR.toFixed(2)}R</span>
                <span className={`text-[22px] font-bold tabular-nums ${color}`}>
                  {d.winRate.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div
                className={`h-full ${bar} rounded-full transition-all duration-500`}
                style={{ width: `${d.winRate}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── TopAssets ────────────────────────────────────────────────────────────────


const TopAssets: React.FC<{ data: ReturnType<typeof topAssets> }> = ({ data }) => {
  if (data.length === 0) return <EmptyState />;
  const max = Math.max(...data.map(d => d.winRate), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <div key={d.asset} className="group flex items-center gap-3">
          <span className="text-[11px] text-text-tertiary w-4 shrink-0">{i + 1}</span>
          <span className="text-[12px] font-semibold text-text w-20 shrink-0 truncate">{d.asset}</span>
          <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${(d.winRate / max) * 100}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold text-accent w-10 text-right tabular-nums shrink-0">
            {d.winRate.toFixed(0)}%
          </span>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-10
                          bg-bg-secondary border border-divider rounded-lg px-3 py-2 text-[11px] shadow-xl whitespace-nowrap pointer-events-none">
            {d.total} trades · avg {d.avgR >= 0 ? '+' : ''}{d.avgR.toFixed(2)}R
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Trading Days Calendar ────────────────────────────────────────────────────

const DOW_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmtPnl(v: number, currency: string): string {
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sym = currency === 'USD' ? '$' : currency + ' ';
  return `${v < 0 ? '-' : ''}${sym}${abs}`;
}

type DayState =
  | { state: 'active-win';  pnl: number; count: number }
  | { state: 'active-loss'; pnl: number; count: number }
  | { state: 'active-empty' }
  | { state: 'dimmed' };

function getDayState(
  dayDate: dayjs.Dayjs,
  startDate: string | null,
  endDate: string | null,
  trades: import('../types/trade').Trade[],
): DayState {
  const isInRange =
    !startDate || !endDate ||
    (dayDate.isSameOrAfter(dayjs(startDate), 'day') &&
     dayDate.isSameOrBefore(dayjs(endDate), 'day'));

  if (!isInRange) return { state: 'dimmed' };

  const dayTrades = trades.filter(t => dayjs(t.createdAt).isSame(dayDate, 'day'));
  if (dayTrades.length === 0) return { state: 'active-empty' };

  const netPnl = dayTrades.reduce((sum, t) => sum + (t.pnlAmount ?? 0), 0);
  return {
    state: netPnl >= 0 ? 'active-win' : 'active-loss',
    pnl: netPnl,
    count: dayTrades.length,
  };
}

interface TradingDaysProps {
  trades:    import('../types/trade').Trade[];
  currency:  string;
  startDate: string | null;
  endDate:   string | null;
}

const TradingDays: React.FC<TradingDaysProps> = ({ trades, currency, startDate, endDate }) => {
  const today = dayjs();

  // Use endDate's month as the "home" month so the most recent period is shown.
  // Falls back to today's month for all_time (endDate = null).
  const homeMonth = useMemo(
    () => endDate ? dayjs(endDate).startOf('month') : today.startOf('month'),
    [endDate], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [currentMonth, setCurrentMonth] = useState(homeMonth);

  // Auto-jump whenever the filter changes (scenario 7: this_month → last_month, etc.)
  // useEffect is intentionally tracking the serialized homeMonth to avoid stale ref issues.
  const homeKey = homeMonth.format('YYYY-MM');
  React.useEffect(() => {
    setCurrentMonth(homeMonth);
  }, [homeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterStart = startDate ? dayjs(startDate) : null;
  const filterEnd   = endDate   ? dayjs(endDate)   : today;

  const canGoBack    = filterStart
    ? currentMonth.startOf('month').isAfter(filterStart.startOf('month'))
    : true;
  const canGoForward = currentMonth.startOf('month').isBefore(filterEnd.startOf('month'));

  const firstOfMonth = currentMonth.startOf('month');
  const daysInMonth  = currentMonth.daysInMonth();
  const startOffset  = firstOfMonth.isoWeekday() - 1; // Mon=0

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const navBtn = (disabled: boolean, onClick: () => void, children: React.ReactNode) => (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        color: disabled ? '#333' : '#8B949E',
        cursor: disabled ? 'default' : 'pointer',
      }}
      className={`p-1 rounded-lg transition-colors ${disabled ? '' : 'hover:bg-[#1C2333]'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1">
        {navBtn(!canGoBack,    () => setCurrentMonth(m => m.subtract(1, 'month')), <ChevronLeft  className="w-4 h-4" />)}
        <span className="text-[13px] font-semibold text-text">
          {MONTHS[currentMonth.month()]} {currentMonth.year()}
        </span>
        {navBtn(!canGoForward, () => setCurrentMonth(m => m.add(1, 'month')),      <ChevronRight className="w-4 h-4" />)}
      </div>

      {/* Header row */}
      <div className="grid grid-cols-8 gap-1">
        {DOW_LABELS.map(l => (
          <div key={l} className="text-center text-[10px] font-semibold py-1" style={{ color: '#555' }}>{l}</div>
        ))}
        <div className="text-center text-[10px] font-semibold py-1" style={{ color: '#555' }} />
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        // Week summary: only in-range days with trades
        let weekPnl = 0; let weekCount = 0; let weekHasRange = false;
        week.forEach(day => {
          if (day === null) return;
          const s = getDayState(currentMonth.date(day), startDate, endDate, trades);
          if (s.state !== 'dimmed') weekHasRange = true;
          if (s.state === 'active-win' || s.state === 'active-loss') {
            weekPnl += s.pnl; weekCount += s.count;
          }
        });
        const weekPos = weekPnl >= 0;

        return (
          <div key={wi} className="grid grid-cols-8 gap-1">
            {week.map((day, di) => {
              if (day === null) {
                return <div key={`pad-${di}`} className="rounded-lg" style={{ minHeight: 56 }} />;
              }
              const dayDate = currentMonth.date(day);
              const s = getDayState(dayDate, startDate, endDate, trades);

              if (s.state === 'dimmed') {
                return (
                  <div key={day} className="rounded-lg flex flex-col p-1.5" style={{ minHeight: 56 }}>
                    <span className="text-[10px]" style={{ color: '#333' }}>{day}</span>
                  </div>
                );
              }

              const hasData = s.state === 'active-win' || s.state === 'active-loss';
              const isWin   = s.state === 'active-win';

              return (
                <div
                  key={day}
                  className="rounded-lg flex flex-col justify-between p-1.5"
                  style={{
                    minHeight: 56,
                    backgroundColor: hasData
                      ? isWin ? '#00C85318' : '#F8514918'
                      : '#1C2333',
                    border: `1px solid ${hasData ? (isWin ? '#00C85330' : '#F8514930') : 'transparent'}`,
                  }}
                >
                  <span className="text-[10px]" style={{ color: '#C9D1D9' }}>{day}</span>
                  {hasData && (
                    <>
                      <span className="text-[10px] font-semibold leading-tight" style={{ color: isWin ? '#00C853' : '#F85149' }}>
                        {fmtPnl(s.pnl, currency)}
                      </span>
                      <span className="text-[9px]" style={{ color: isWin ? 'rgba(0,200,83,0.6)' : 'rgba(248,81,73,0.6)' }}>
                        {s.count} trade{s.count !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              );
            })}

            {/* Week summary */}
            <div
              className="rounded-lg flex flex-col justify-center px-2 py-1.5"
              style={{ minHeight: 56, backgroundColor: '#161B22', border: '1px solid #21262D' }}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#555' }}>
                Week {wi + 1}
              </span>
              {weekHasRange && weekCount > 0 ? (
                <>
                  <span className="text-[10px] font-bold leading-tight" style={{ color: weekPos ? '#00C853' : '#F85149' }}>
                    {fmtPnl(weekPnl, currency)}
                  </span>
                  <span className="text-[9px]" style={{ color: '#555' }}>{weekCount} trades</span>
                </>
              ) : weekHasRange ? (
                <span className="text-[10px]" style={{ color: '#555' }}>$0.00</span>
              ) : (
                <span className="text-[10px]" style={{ color: '#333' }}>—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Profit Distribution ──────────────────────────────────────────────────────

const DistTooltip: React.FC<{ active?: boolean; payload?: { value: number; payload: ReturnType<typeof profitDistribution>[0] }[] }> = ({
  active, payload,
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-secondary border border-divider rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[12px] font-bold text-text">{d.range}</p>
      <p className="text-[11px] text-text-secondary">{d.count} trade{d.count !== 1 ? 's' : ''}</p>
    </div>
  );
};

const ProfitDistribution: React.FC<{ data: ReturnType<typeof profitDistribution> }> = ({ data }) => {
  if (data.length === 0) return <EmptyState text="No R values recorded yet" />;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="20%">
        <XAxis dataKey="range" tick={{ fill: '#747D8A', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#747D8A', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<DistTooltip />} cursor={{ fill: SURFACE }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.isPositive ? ACCENT : NEGATIVE} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── AnalysisPage ─────────────────────────────────────────────────────────────

export const AnalysisPage: React.FC = () => {
  const { trades: allTrades } = useTradeStore();
  const { activeJournal }     = useJournalStore();
  const { getFilteredTrades, preset, startDate, endDate } = useDateFilterStore();

  // Apply global date filter
  const trades = useMemo(
    () => getFilteredTrades(allTrades),
    [allTrades, preset, startDate, endDate], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const config = useMemo(
    () => activeJournal
      ? journalToConfig(activeJournal)
      : { journalName: 'Journal', initialCapital: 10_000, riskPerTrade: 100, currency: 'USD' },
    [activeJournal],
  );

  const metrics    = useMemo(() => calculateMetrics(trades, config), [trades, config]);
  const dirStats   = useMemo(() => winRateByDirection(trades), [trades]);
  const assets     = useMemo(() => topAssets(trades), [trades]);
  const streaks    = useMemo(() => calculateStreaks(trades), [trades]);
  const dist       = useMemo(() => profitDistribution(trades), [trades]);
  const expectancy = useMemo(() => calculateExpectancy(trades), [trades]);
  const winLoss    = useMemo(() => avgWinLoss(trades), [trades]);

  const closedTrades = trades.filter(t => t.status === 'closed');
  const earliest = closedTrades.length
    ? formatDate([...closedTrades].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].createdAt)
    : null;
  const latest = closedTrades.length
    ? formatDate([...closedTrades].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt)
    : null;

  const expPos = expectancy >= 0;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-text">Performance Analysis</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          {closedTrades.length > 0
            ? `${closedTrades.length} closed trades · ${earliest} → ${latest}`
            : `${activeJournal?.name ?? 'My Journal'} · No closed trades yet`}
        </p>
      </div>

      <ActiveFilterBanner />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-4">

          <Card title="Win Rate by Direction">
            <WinRateByDirection trades={dirStats} />
          </Card>

          <Card title="Top Assets by Win Rate">
            <TopAssets data={assets} />
          </Card>

          <Card title="Trading Days">
            <TradingDays trades={trades} currency={config.currency} startDate={startDate} endDate={endDate} />
          </Card>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-4">

          <Card title="Expectancy per Trade">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className={`text-[44px] font-bold leading-none tabular-nums ${expPos ? 'text-positive' : 'text-negative'}`}>
                  {expPos ? '+' : ''}{expectancy.toFixed(2)}R
                </span>
                <span className="text-[12px] text-text-secondary">
                  {expPos
                    ? 'Positive edge — system is profitable'
                    : 'Negative edge — review your approach'}
                </span>
              </div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${
                expPos ? 'bg-positive/10' : 'bg-negative/10'
              }`}>
                {expPos ? '📈' : '📉'}
              </div>
            </div>
          </Card>

          <Card title="Average R by Result">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-positive/5 border border-positive/20 rounded-xl p-4 flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-positive/70">Avg Win</span>
                <span className="text-[28px] font-bold text-positive tabular-nums">
                  +{winLoss.avgWinR.toFixed(2)}R
                </span>
              </div>
              <div className="bg-negative/5 border border-negative/20 rounded-xl p-4 flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-negative/70">Avg Loss</span>
                <span className="text-[28px] font-bold text-negative tabular-nums">
                  {winLoss.avgLossR.toFixed(2)}R
                </span>
              </div>
            </div>
          </Card>

          <Card title="Streaks">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg rounded-xl p-4 flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Best Win Streak</span>
                <div className="flex items-end gap-1.5">
                  <span className="text-[36px] font-bold text-positive leading-none">{streaks.bestWin}</span>
                  <span className="text-[13px] text-positive mb-1">wins</span>
                </div>
              </div>
              <div className="bg-bg rounded-xl p-4 flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Worst Loss Streak</span>
                <div className="flex items-end gap-1.5">
                  <span className="text-[36px] font-bold text-negative leading-none">{streaks.worstLoss}</span>
                  <span className="text-[13px] text-negative mb-1">losses</span>
                </div>
              </div>
            </div>
            {metrics.profitFactor > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-divider/50">
                <span className="text-[12px] text-text-secondary">Profit Factor</span>
                <span className={`text-[14px] font-bold ${metrics.profitFactor >= 1.5 ? 'text-positive' : metrics.profitFactor < 1 ? 'text-negative' : 'text-text'}`}>
                  {metrics.profitFactor >= 99 ? '∞' : metrics.profitFactor.toFixed(2)}
                </span>
              </div>
            )}
          </Card>

          <Card title="R Value Distribution">
            <ProfitDistribution data={dist} />
          </Card>

        </div>
      </div>
    </div>
  );
};

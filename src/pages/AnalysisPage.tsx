import React, { useMemo, useState } from 'react';
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
  calculateExpectancy,
  avgWinLoss,
  calculateMetrics,
  getTradeSignedPnl,
} from '../utils/calculations';
import { StopDisciplineCard } from '../components/analysis/StopDisciplineCard';
import { RRComparisonCard } from '../components/analysis/RRComparisonCard';
import { RollingExpectancyChart } from '../components/analysis/RollingExpectancyChart';
import { SectionHeader } from '../components/analysis/SectionHeader';
import { journalToConfig } from '../types/account';
import { TradeDirection, TradeResult, TradeStatus } from '../types/trade';
import { formatDate, getTradeDate } from '../utils/formatters';

// ─── Shared ───────────────────────────────────────────────────────────────────

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title, children, className = '',
}) => (
  <div className={`bg-bg-surface rounded-xl p-5 flex flex-col gap-4 ${className}`}>
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{title}</h2>
    {children}
  </div>
);

// ─── Trading Days Calendar ────────────────────────────────────────────────────

const DOW_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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
  riskPerTrade: number,
): DayState {
  const isInRange =
    !startDate || !endDate ||
    (dayDate.isSameOrAfter(dayjs(startDate), 'day') &&
     dayDate.isSameOrBefore(dayjs(endDate), 'day'));

  if (!isInRange) return { state: 'dimmed' };

  const dayTrades = trades.filter(t => dayjs(getTradeDate(t)).isSame(dayDate, 'day'));
  if (dayTrades.length === 0) return { state: 'active-empty' };

  const netPnl = dayTrades.reduce((sum, t) => sum + getTradeSignedPnl(t, riskPerTrade), 0);
  return {
    state: netPnl >= 0 ? 'active-win' : 'active-loss',
    pnl: netPnl,
    count: dayTrades.length,
  };
}

interface TradingDaysProps {
  trades:    import('../types/trade').Trade[];
  riskPerTrade: number;
  startDate: string | null;
  endDate:   string | null;
}

const TradingDays: React.FC<TradingDaysProps> = ({ trades, riskPerTrade, startDate, endDate }) => {
  const today = dayjs();

  const homeMonth = useMemo(
    () => endDate ? dayjs(endDate).startOf('month') : today.startOf('month'),
    [endDate], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [currentMonth, setCurrentMonth] = useState(homeMonth);

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
  const startOffset  = firstOfMonth.isoWeekday() - 1; // 0 for Monday (Lunes)

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
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-white capitalize">
            {MONTHS[currentMonth.month()]} {currentMonth.year()}
          </span>
          <div className="flex items-center">
            {navBtn(!canGoBack,    () => setCurrentMonth(m => m.subtract(1, 'month')), <ChevronLeft  className="w-4 h-4" />)}
            {navBtn(!canGoForward, () => setCurrentMonth(m => m.add(1, 'month')),      <ChevronRight className="w-4 h-4" />)}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-[3px]" style={{ background: '#1B4332' }} />
            <span className="text-[11px] font-medium" style={{ color: '#8B949E' }}>Win</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-[3px]" style={{ background: '#442026' }} />
            <span className="text-[11px] font-medium" style={{ color: '#8B949E' }}>Loss</span>
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {DOW_LABELS.map(l => (
            <div key={l} className="text-center text-[10px] font-semibold" style={{ color: '#555' }}>{l}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((day, di) => {
              if (day === null) {
                return <div key={`pad-${di}`} className="aspect-square" />;
              }
              const dayDate = currentMonth.date(day);
              const s = getDayState(dayDate, startDate, endDate, trades, riskPerTrade);

              if (s.state === 'dimmed') {
                return (
                  <div key={day} className="aspect-square flex items-center justify-center opacity-20">
                    <span className="text-[11px]" style={{ color: '#555' }}>{day}</span>
                  </div>
                );
              }

              const hasData = s.state === 'active-win' || s.state === 'active-loss';
              const isWin   = s.state === 'active-win';

              return (
                <div
                  key={day}
                  className="aspect-square flex items-center justify-center rounded-md transition-colors"
                  style={{
                    backgroundColor: hasData
                      ? isWin ? '#1B4332' : '#442026'
                      : 'transparent',
                  }}
                >
                  <span 
                    className="text-[12px] font-medium" 
                    style={{ 
                      color: hasData 
                        ? isWin ? '#10E261' : '#F85149' 
                        : '#555' 
                    }}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};


// ─── AnalysisPage ─────────────────────────────────────────────────────────────

export const AnalysisPage: React.FC = () => {
  const { trades: allTrades } = useTradeStore();
  const { activeJournal }     = useJournalStore();
  const { getFilteredTrades, preset, startDate, endDate } = useDateFilterStore();

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
  const expectancy = useMemo(() => calculateExpectancy(trades), [trades]);
  const winLoss    = useMemo(() => avgWinLoss(trades), [trades]);

  const closedTrades = trades.filter(t => t.status === TradeStatus.Closed);
  const wins = closedTrades.filter(t => t.result === TradeResult.Win).length;

  const earliest = closedTrades.length
    ? formatDate(getTradeDate([...closedTrades].sort((a, b) => getTradeDate(a).localeCompare(getTradeDate(b)))[0]))
    : null;
  const latest = closedTrades.length
    ? formatDate(getTradeDate([...closedTrades].sort((a, b) => getTradeDate(b).localeCompare(getTradeDate(a)))[0]))
    : null;

  // ── KPI helpers ─────────────────────────────────────────────────────────────
  const winRateColor    = metrics.winRate >= 50 ? '#10E261' : '#F85149';
  const expectancyColor = expectancy >= 0 ? '#10E261' : '#F85149';
  const pfColor         = metrics.profitFactor >= 1.5 ? '#10E261'
                        : metrics.profitFactor >= 1   ? '#F0883E'
                        : '#F85149';
  const totalRColor     = metrics.totalRProfit >= 0 ? '#10E261' : '#F85149';

  return (
    <div className="flex flex-col" style={{ gap: 28 }}>

      {/* ── Header de página ── */}
      <div>
        <h1 className="text-2xl font-bold text-text">Performance Analysis</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          {closedTrades.length > 0
            ? `${closedTrades.length} closed trades · ${earliest} → ${latest}`
            : `${activeJournal?.name ?? 'My Journal'} · Sin trades cerrados`}
        </p>
      </div>

      <ActiveFilterBanner />

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 1 — Resumen del período
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          label="Resumen del período"
          description="— métricas clave de un vistazo"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Win Rate */}
          <div
            className="flex flex-col"
            style={{ background: '#1A202A', borderRadius: 10, padding: '14px 16px' }}
          >
            <span
              style={{
                fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#747D8A', marginBottom: 6,
              }}
            >
              Win Rate
            </span>
            <span
              style={{ fontSize: 22, fontWeight: 700, color: winRateColor, lineHeight: 1.2 }}
              className="tabular-nums"
            >
              {metrics.winRate.toFixed(0)}%
            </span>
            <span style={{ fontSize: 11, color: '#505866', marginTop: 3 }}>
              {wins} de {closedTrades.length} trades
            </span>
          </div>

          {/* Expectancy */}
          <div
            className="flex flex-col"
            style={{ background: '#1A202A', borderRadius: 10, padding: '14px 16px' }}
          >
            <span
              style={{
                fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#747D8A', marginBottom: 6,
              }}
            >
              Expectancy
            </span>
            <span
              style={{ fontSize: 22, fontWeight: 700, color: expectancyColor, lineHeight: 1.2 }}
              className="tabular-nums"
            >
              {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R
            </span>
            <span style={{ fontSize: 11, color: '#505866', marginTop: 3 }}>
              por trade
            </span>
          </div>

          {/* Profit Factor */}
          <div
            className="flex flex-col"
            style={{ background: '#1A202A', borderRadius: 10, padding: '14px 16px' }}
          >
            <span
              style={{
                fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#747D8A', marginBottom: 6,
              }}
            >
              Profit Factor
            </span>
            <span
              style={{ fontSize: 22, fontWeight: 700, color: pfColor, lineHeight: 1.2 }}
              className="tabular-nums"
            >
              {metrics.profitFactor >= 99 ? '∞' : metrics.profitFactor.toFixed(2)}
            </span>
            <span style={{ fontSize: 11, color: '#505866', marginTop: 3 }}>
              ganancia / pérdida
            </span>
          </div>

          {/* Total R */}
          <div
            className="flex flex-col"
            style={{ background: '#1A202A', borderRadius: 10, padding: '14px 16px' }}
          >
            <span
              style={{
                fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#747D8A', marginBottom: 6,
              }}
            >
              Total R
            </span>
            <span
              style={{ fontSize: 22, fontWeight: 700, color: totalRColor, lineHeight: 1.2 }}
              className="tabular-nums"
            >
              {metrics.totalRProfit >= 0 ? '+' : ''}{metrics.totalRProfit.toFixed(2)}R
            </span>
            <span style={{ fontSize: 11, color: '#505866', marginTop: 3 }}>
              en el período
            </span>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 2 — Lo que puedes mejorar
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          label="Lo que puedes mejorar"
          description="— análisis accionable de tu operativa"
        />
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StopDisciplineCard trades={trades} />
            <RRComparisonCard trades={trades} />
          </div>
          <RollingExpectancyChart trades={trades} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 3 — ¿Dónde operas mejor?
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          label="¿Dónde operas mejor?"
          description="— segmentación por dirección, activo y tiempo"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* ── Card A: Por dirección ── */}
          <div style={{ background: '#1A202A', borderRadius: 10, padding: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
              Por dirección
            </p>
            <div className="flex flex-col gap-3">
              {dirStats.map(d => {
                const isLong   = d.direction === TradeDirection.Long;
                const barColor = d.winRate >= 50 ? '#10E261' : '#F85149';
                return (
                  <div key={String(d.direction)} className="flex items-center gap-2">
                    <span
                      style={{ fontSize: 11, fontWeight: 600, minWidth: 40, color: isLong ? '#10E261' : '#F85149' }}
                    >
                      {isLong ? 'LONG' : 'SHORT'}
                    </span>
                    <div
                      className="flex-1"
                      style={{ background: '#212836', height: 5, borderRadius: 3, overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          width: `${d.winRate}%`, height: '100%',
                          background: barColor, borderRadius: 3,
                          transition: 'width 0.5s',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: '#747D8A', minWidth: 62, textAlign: 'right' }}>
                      avg {d.avgR >= 0 ? '+' : ''}{d.avgR.toFixed(2)}R
                    </span>
                    <span
                      className="tabular-nums"
                      style={{ fontSize: 14, fontWeight: 700, color: '#fff', minWidth: 38, textAlign: 'right' }}
                    >
                      {d.winRate.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: '1px solid #242C3A', paddingTop: 10, marginTop: 12 }}>
              <span style={{ fontSize: 10, color: '#505866' }}>
                {dirStats.find(d => d.direction === TradeDirection.Long)?.total ?? 0} trades long
                {' · '}
                {dirStats.find(d => d.direction === TradeDirection.Short)?.total ?? 0} trades short
              </span>
            </div>
          </div>

          {/* ── Card B: Por activo ── */}
          <div style={{ background: '#1A202A', borderRadius: 10, padding: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
              Por activo
            </p>
            {assets.length === 0 ? (
              <span style={{ fontSize: 12, color: '#505866' }}>Sin datos</span>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {assets.slice(0, 5).map(d => {
                    const maxWr    = Math.max(...assets.map(a => a.winRate), 1);
                    const barColor = d.winRate >= 50 ? '#10E261' : '#F85149';
                    return (
                      <div key={d.asset} className="flex items-center gap-2">
                        <span
                          className="truncate"
                          style={{ fontSize: 11, color: '#fff', minWidth: 60, maxWidth: 64 }}
                        >
                          {d.asset}
                        </span>
                        <div
                          className="flex-1"
                          style={{ background: '#212836', height: 5, borderRadius: 3, overflow: 'hidden' }}
                        >
                          <div
                            style={{
                              width: `${(d.winRate / maxWr) * 100}%`, height: '100%',
                              background: barColor, borderRadius: 3,
                              transition: 'width 0.5s',
                            }}
                          />
                        </div>
                        <span
                          className="tabular-nums"
                          style={{ fontSize: 14, fontWeight: 700, color: '#fff', minWidth: 38, textAlign: 'right' }}
                        >
                          {d.winRate.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: '1px solid #242C3A', paddingTop: 10, marginTop: 12 }}>
                  <span style={{ fontSize: 10, color: '#505866' }}>
                    {assets.length} activo{assets.length !== 1 ? 's' : ''} distintos
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── Card C: Rachas y promedios ── */}
          <div style={{ background: '#1A202A', borderRadius: 10, padding: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
              Rachas y promedios
            </p>
            <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 8 }}>
              <div style={{ background: '#212836', borderRadius: 6, padding: 10 }}>
                <span
                  style={{
                    display: 'block', fontSize: 9, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: '#747D8A', marginBottom: 4,
                  }}
                >
                  Mejor racha
                </span>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 20, fontWeight: 700, color: '#10E261' }}
                >
                  {streaks.bestWin}
                </span>
                <span style={{ display: 'block', fontSize: 10, color: '#505866' }}>wins</span>
              </div>
              <div style={{ background: '#212836', borderRadius: 6, padding: 10 }}>
                <span
                  style={{
                    display: 'block', fontSize: 9, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: '#747D8A', marginBottom: 4,
                  }}
                >
                  Peor racha
                </span>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 20, fontWeight: 700, color: '#F85149' }}
                >
                  {streaks.worstLoss}
                </span>
                <span style={{ display: 'block', fontSize: 10, color: '#505866' }}>losses</span>
              </div>
            </div>
            <div style={{ background: '#212836', borderRadius: 6, padding: 10 }}>
              <span
                style={{
                  display: 'block', fontSize: 9, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: '#747D8A', marginBottom: 4,
                }}
              >
                Avg win / Avg loss
              </span>
              <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: '#10E261' }}>+{winLoss.avgWinR.toFixed(2)}R</span>
                <span style={{ color: '#505866', margin: '0 5px' }}>/</span>
                <span style={{ color: '#F85149' }}>{winLoss.avgLossR.toFixed(2)}R</span>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 5 — Días de trading
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          label="Días de trading"
          description="— rendimiento por día del calendario"
        />
        <div style={{ maxWidth: 340 }}>
          <Card title="Días de trading">
            <TradingDays
              trades={trades}
              riskPerTrade={config.riskPerTrade}
              startDate={startDate}
              endDate={endDate}
            />
          </Card>
        </div>
      </div>

    </div>
  );
};

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Trade } from '../../types/trade';
import { TradeStatus } from '../../types/trade';
import {
  calculateRollingExpectancy,
  calculateExpectancyTrend,
  calculateExpectancy,
} from '../../utils/calculations';

// ─── Constants ────────────────────────────────────────────────────────────────

const TREND_COLORS = {
  improving: '#10E261',
  declining: '#F85149',
  stable:    '#F0883E',
} as const;

const TREND_LABELS = {
  improving: 'Mejorando',
  declining: 'Decayendo',
  stable:    'Estable',
} as const;

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipProps {
  active?:  boolean;
  payload?: { value: number; payload: { date: string } }[];
  label?:   string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { value, payload: data } = payload[0];
  return (
    <div
      className="rounded-md px-3 py-2 shadow-lg"
      style={{ 
        background: '#1A202A', 
        border: '1px solid #242C3A',
        fontSize: '11px'
      }}
    >
      <p className="mb-0.5" style={{ color: '#505866' }}>{data.date}</p>
      <p className="font-semibold" style={{ color: value >= 0 ? '#10E261' : '#F85149' }}>
        {value >= 0 ? '+' : ''}{value.toFixed(3)}R
      </p>
    </div>
  );
};

// ─── RollingExpectancyChart ───────────────────────────────────────────────────

interface Props {
  trades: Trade[];
}

export const RollingExpectancyChart: React.FC<Props> = ({ trades }) => {
  const points        = calculateRollingExpectancy(trades);
  const trend         = calculateExpectancyTrend(points);
  const globalExpect  = calculateExpectancy(trades);
  
  // ── Closed trade count for empty state ──────────────────────────────────────
  const closedCount = trades.filter(
    t => t.status === TradeStatus.Closed && t.rValue != null,
  ).length;

  const hasEnoughData = points.length > 0;
  const trendColor = hasEnoughData ? TREND_COLORS[trend] : '#F0883E';

  return (
    <div 
      className="flex flex-col"
      style={{
        background: '#1A202A',
        borderRadius: '10px',
        padding: '18px'
      }}
    >
      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-[14px]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div 
              className="w-[6px] h-[6px] rounded-full" 
              style={{ background: trendColor }}
            />
            <h2 className="text-[12px] font-semibold text-white leading-none">
              Tendencia de expectancy
            </h2>
          </div>
          <p className="text-[11px] mt-1" style={{ color: '#505866' }}>
            Ventana móvil de 20 trades
          </p>
        </div>

        {hasEnoughData ? (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
            style={{ 
              background: `${trendColor}1a`, 
              color: trendColor 
            }}
          >
            {TREND_LABELS[trend]}
          </span>
        ) : (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
            style={{ 
              background: '#F0883E1a', 
              color: '#F0883E' 
            }}
          >
            Sin datos suficientes
          </span>
        )}
      </div>

      {/* ── Content ── */}
      {!hasEnoughData ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-[16px] mb-4">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px]" style={{ color: '#747D8A' }}>
                  Progreso hacia 20 trades
                </span>
                <span className="text-[11px] font-medium text-white">
                  {closedCount} / 20
                </span>
              </div>
              <div 
                className="h-[6px] w-full rounded-[4px]" 
                style={{ background: '#212836' }}
              >
                <div 
                  className="h-full rounded-[4px] transition-all duration-500"
                  style={{ 
                    width: `${(closedCount / 20) * 100}%`, 
                    background: '#F0883E' 
                  }}
                />
              </div>
            </div>
            <div 
              className="text-[22px] font-bold min-w-[40px] text-right"
              style={{ color: '#F0883E' }}
            >
              {Math.round((closedCount / 20) * 100)}%
            </div>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: '#242C3A' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: '#747D8A' }}>
              Necesitas <strong className="text-white">{20 - closedCount}</strong> trades más para calcular la tendencia. Cuando llegues a 20 trades cerrados, aquí verás si tu operativa está mejorando o empeorando.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-[160px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  interval={4}
                  tick={{ fill: '#505866', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v.toFixed(1)}R`}
                  tick={{ fill: '#505866', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={0}
                  stroke="#242C3A"
                  strokeDasharray="4 4"
                  label={{ 
                    value: 'Break Even', 
                    position: 'insideTopLeft', 
                    fontSize: 10, 
                    fill: '#505866' 
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="expectancy"
                  stroke={trendColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center gap-[16px] pt-4 border-t" style={{ borderColor: '#242C3A' }}>
            <div className="text-[11px] flex items-center">
              <span style={{ color: '#505866' }}>Expectancy actual (últ. 20):&nbsp;</span>
              <span style={{ color: points[points.length - 1].expectancy >= 0 ? '#10E261' : '#F85149' }}>
                {points[points.length - 1].expectancy.toFixed(2)}R
              </span>
            </div>
            
            <div className="w-[1px] h-[12px]" style={{ background: '#242C3A' }} />

            <div className="text-[11px] flex items-center">
              <span style={{ color: '#505866' }}>Expectancy histórica:&nbsp;</span>
              <span style={{ color: globalExpect >= 0 ? '#10E261' : '#F85149' }}>
                {globalExpect.toFixed(2)}R
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


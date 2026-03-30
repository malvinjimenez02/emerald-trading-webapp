import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { EquityPoint } from '../../types/metrics';

interface CustomTooltipPayload {
  value?: number;
  [key: string]: unknown;
}

interface EquityChartProps {
  data: EquityPoint[];
  isLoading?: boolean;
}

const ACCENT = '#10E261';
const GRADIENT_ID = 'equityGradient';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip: React.FC<{ active?: boolean; payload?: CustomTooltipPayload[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const r = payload[0].value ?? 0;
  const isPositive = r >= 0;

  return (
    <div className="bg-bg-secondary border border-divider rounded-lg p-3 shadow-xl">
      <p className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[15px] font-bold ${isPositive ? 'text-positive' : 'text-negative'}`}>
        {isPositive ? '+' : ''}{r.toFixed(2)}R
      </p>
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-[280px] text-text-secondary gap-2">
    <p className="text-[13px]">No closed trades yet</p>
    <p className="text-[12px] text-text-tertiary">Your equity curve will appear here</p>
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton: React.FC = () => (
  <div className="h-[280px] w-full bg-bg-secondary rounded-lg animate-pulse" />
);

// ─── Chart ────────────────────────────────────────────────────────────────────

export const EquityChart: React.FC<EquityChartProps> = ({ data, isLoading = false }) => {
  return (
    <div className="bg-bg-surface rounded-xl p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary mb-5">
        Equity Curve
      </h2>

      {isLoading ? (
        <Skeleton />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.3} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0}   />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#242C3A"
              vertical={false}
            />

            <XAxis
              dataKey="week"
              tick={{ fill: '#747D8A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{ fill: '#747D8A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}R`}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#242C3A', strokeWidth: 1 }} />

            <Area
              type="monotone"
              dataKey="cumulativeR"
              stroke={ACCENT}
              strokeWidth={2.5}
              fill={`url(#${GRADIENT_ID})`}
              dot={false}
              activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

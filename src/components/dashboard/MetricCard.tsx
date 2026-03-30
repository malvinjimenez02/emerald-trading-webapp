import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  badge?: string;
  badgeColor?: 'positive' | 'negative' | 'neutral';
  valueColor?: 'positive' | 'negative' | 'neutral' | 'default';
  isLoading?: boolean;
}

const badgeColorMap = {
  positive: 'bg-positive/10 text-positive',
  negative: 'bg-negative/10 text-negative',
  neutral:  'bg-bg-secondary text-text-secondary',
};

const valueColorMap = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral:  'text-text-secondary',
  default:  'text-text',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  badge,
  badgeColor = 'neutral',
  valueColor = 'default',
  isLoading = false,
}) => {
  return (
    <div className="bg-bg-surface rounded-xl p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        {badge && !isLoading && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColorMap[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-9 w-32 bg-bg-secondary rounded-lg animate-pulse mt-2" />
      ) : (
        <p className={`text-3xl font-bold mt-2 tabular-nums ${valueColorMap[valueColor]}`}>
          {value}
        </p>
      )}
    </div>
  );
};

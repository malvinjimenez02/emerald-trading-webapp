import React from 'react';
import { Target, Info } from 'lucide-react';
import { calculateRRComparison } from '../../utils/calculations';
import type { Trade } from '../../types/trade';

interface Props {
  trades: Trade[];
}

export const RRComparisonCard: React.FC<Props> = ({ trades }) => {
  const data = calculateRRComparison(trades);

  if (!data) {
    return (
      <div className="bg-bg-surface rounded-xl p-5 flex flex-col gap-4 h-full">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          R:R Planeado vs Ejecutado
        </h2>
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center gap-2">
          <Info className="w-5 h-5 text-text-tertiary" />
          <p className="text-[13px] text-text-secondary max-w-[240px]">
            Registra el Take Profit en tus trades para ver este análisis. Actualmente tienes datos insuficientes.
          </p>
        </div>
      </div>
    );
  }

  const { avgRRPlanned, avgRRExecuted, executionRatio, validTrades, isUndercutting } = data;

  const getStatusColor = (ratio: number) => {
    if (ratio >= 80) return '#10E261'; // Verde
    if (ratio >= 60) return '#F0883E'; // Naranja
    return '#F85149'; // Rojo
  };

  const statusColor = getStatusColor(executionRatio);

  return (
    <div className="bg-bg-surface rounded-xl p-5 flex flex-col gap-4 h-full">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          R:R Planeado vs Ejecutado
        </h2>
        <p className="text-[12px] text-text-tertiary">¿Capturas el potencial que planeas?</p>
      </div>

      {/* ── Visualization ── */}
      <div className="flex flex-col gap-5 py-2">
        {/* Planned Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium text-text-secondary uppercase tracking-tight">
            <span>Planeado</span>
            <span className="text-[13px] font-bold text-text">{avgRRPlanned.toFixed(2)}R</span>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-[#747D8A] rounded-full w-full opacity-40" />
          </div>
        </div>

        {/* Executed Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium text-text-secondary uppercase tracking-tight">
            <span>Ejecutado</span>
            <span className="text-[13px] font-bold" style={{ color: statusColor }}>{avgRRExecuted.toFixed(2)}R</span>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000" 
              style={{ 
                width: `${Math.min(100, executionRatio)}%`,
                backgroundColor: statusColor
              }} 
            />
          </div>
        </div>
      </div>

      {/* ── executionRatio Badge ── */}
      <div className="flex items-center justify-center">
        <div className="px-3 py-1.5 bg-bg rounded-lg border border-divider/50 flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color: statusColor }}>
            Capturas el {executionRatio.toFixed(0)}%
          </span>
          <span className="text-[11px] text-text-secondary font-medium">de tu potencial</span>
        </div>
      </div>

      {/* ── Insight Message ── */}
      <div className="flex-1 flex items-center">
        <p className="text-[13px] leading-relaxed text-text">
          {isUndercutting ? (
            <>
              Estás cerrando winners antes de tiempo. Tu plan promete{' '}
              <span className="font-bold">{avgRRPlanned.toFixed(2)}R</span> pero ejecutas{' '}
              <span className="font-bold" style={{ color: statusColor }}>{avgRRExecuted.toFixed(2)}R</span>.
            </>
          ) : (
            "Buena ejecución. Estás respetando tus objetivos de ganancia."
          )}
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="pt-3 border-t border-divider/40">
        <span className="text-[11px]" style={{ color: '#747D8A' }}>
          Calculado sobre {validTrades} trades con Take Profit registrado
        </span>
      </div>
    </div>
  );
};

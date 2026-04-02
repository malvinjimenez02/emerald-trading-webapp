import React from 'react';
import { calculateStopDiscipline } from '../../utils/calculations';
import type { Trade } from '../../types/trade';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  excellent:  '#10E261',
  acceptable: '#F0883E',
  poor:       '#F85149',
};

const STATUS_MSG: Record<string, string> = {
  excellent:  'Excelente disciplina — respetas tus stops consistentemente',
  acceptable: 'Disciplina aceptable — tus losses exceden ligeramente 1R',
  poor:       'Atención — estás perdiendo significativamente más que tu riesgo planeado por trade',
};

// ─── StopDisciplineCard ───────────────────────────────────────────────────────

interface Props {
  trades: Trade[];
}

export const StopDisciplineCard: React.FC<Props> = ({ trades }) => {
  const { avgLossR, deviation, totalLosses, status } = calculateStopDiscipline(trades);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (totalLosses === 0) {
    return (
      <div className="bg-bg-surface rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Stop Discipline
        </h2>
        <div className="flex items-center justify-center py-6 text-[13px]" style={{ color: '#505866' }}>
          Sin trades perdedores para analizar
        </div>
      </div>
    );
  }

  // Bar range: -2R → 0R
  // Marker at avgLossR, clamped to [-2, 0]
  const clamped   = Math.min(0, Math.max(-2, avgLossR));
  const markerPct = ((clamped + 2) / 2) * 100; // 0% = -2R, 50% = -1R, 100% = 0R

  const statusColor = STATUS_COLOR[status];

  return (
    <div className="bg-bg-surface rounded-xl p-5 flex flex-col gap-4">

      {/* ── Header ── */}
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Stop Discipline
      </h2>

      {/* ── Metric cells ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#747D8A' }}>
            Avg Loss
          </span>
          <span className="text-[28px] font-bold tabular-nums" style={{ color: '#F85149' }}>
            {avgLossR.toFixed(2)}R
          </span>
        </div>
        <div className="bg-bg rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#747D8A' }}>
            Deviation from 1R
          </span>
          <span className="text-[28px] font-bold tabular-nums" style={{ color: statusColor }}>
            {deviation >= 0 ? '+' : ''}{deviation.toFixed(2)}R
          </span>
        </div>
      </div>

      {/* ── Visual bar ── */}
      <div className="flex flex-col gap-1.5">
        {/* Reference label above the line */}
        <div className="relative h-3">
          <span
            className="absolute text-[10px] font-medium -translate-x-1/2"
            style={{ left: '50%', color: '#747D8A' }}
          >
            -1R ideal
          </span>
        </div>

        {/* Track */}
        <div
          className="relative h-5 rounded-full"
          style={{ backgroundColor: '#0D1117', border: '1px solid #21262D' }}
        >
          {/* Filled region (left → marker) */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
            style={{
              width:           `${markerPct}%`,
              backgroundColor: statusColor,
              opacity:         0.25,
            }}
          />

          {/* Reference line at -1R (50%) */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: '50%', backgroundColor: '#747D8A', opacity: 0.6 }}
          />

          {/* Marker dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-lg transition-all duration-700"
            style={{
              left:            `calc(${markerPct}% - 10px)`,
              backgroundColor: statusColor,
              border:          '2px solid #161B22',
              boxShadow:       `0 0 8px ${statusColor}60`,
            }}
          />
        </div>

        {/* Axis labels */}
        <div className="flex items-center justify-between text-[10px] font-medium px-0.5" style={{ color: '#747D8A' }}>
          <span>-2R</span>
          <span>0R</span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col gap-1 pt-1 border-t border-divider/40">
        <span className="text-[12px] text-text-secondary">
          Basado en {totalLosses} trade{totalLosses !== 1 ? 's' : ''} perdedor{totalLosses !== 1 ? 'es' : ''}
        </span>
        <span className="text-[12px] font-medium" style={{ color: statusColor }}>
          {STATUS_MSG[status]}
        </span>
      </div>

    </div>
  );
};

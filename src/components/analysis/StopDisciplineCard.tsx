import React from 'react';
import { calculateStopDiscipline } from '../../utils/calculations';
import type { Trade } from '../../types/trade';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type VisualStatus = 'good' | 'warning' | 'danger';

const toVisual = (s: 'excellent' | 'acceptable' | 'poor'): VisualStatus =>
  s === 'excellent' ? 'good' : s === 'acceptable' ? 'warning' : 'danger';

const STATUS_COLOR: Record<VisualStatus, string> = {
  good:    '#10E261',
  warning: '#F0883E',
  danger:  '#F85149',
};

const STATUS_BG: Record<VisualStatus, string> = {
  good:    'rgba(16,226,97,0.12)',
  warning: 'rgba(240,136,62,0.12)',
  danger:  'rgba(248,81,73,0.12)',
};

const STATUS_BADGE: Record<VisualStatus, string> = {
  good:    'Excelente',
  warning: 'Atención',
  danger:  'Crítico',
};

// ─── StopDisciplineCard ───────────────────────────────────────────────────────

interface Props {
  trades: Trade[];
}

const CARD: React.CSSProperties = {
  background: '#1A202A', borderRadius: 10, padding: 18,
  display: 'flex', flexDirection: 'column',
};

export const StopDisciplineCard: React.FC<Props> = ({ trades }) => {
  const { avgLossR, totalLosses, status: rawStatus } = calculateStopDiscipline(trades);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (totalLosses === 0) {
    return (
      <div style={CARD}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#505866', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Disciplina de stops</span>
        </div>
        <p style={{ fontSize: 11, color: '#505866', marginBottom: 14 }}>¿Respetas tu stop de 1R?</p>
        <div className="flex-1 flex items-center justify-center py-6">
          <span style={{ fontSize: 13, color: '#505866', textAlign: 'center' }}>
            Sin trades perdedores en el período seleccionado
          </span>
        </div>
      </div>
    );
  }

  const vs       = toVisual(rawStatus);
  const color    = STATUS_COLOR[vs];
  const absLoss  = Math.abs(avgLossR);
  const barWidth = Math.min(100, (absLoss / 2) * 100);

  return (
    <div style={CARD}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Disciplina de stops</span>
        </div>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 8px', borderRadius: 4,
            fontSize: 11, fontWeight: 500,
            background: STATUS_BG[vs], color,
          }}
        >
          {STATUS_BADGE[vs]}
        </span>
      </div>
      <p style={{ fontSize: 11, color: '#505866', marginBottom: 14 }}>¿Respetas tu stop de 1R?</p>

      {/* ── Contenido principal ── */}
      <div className="flex gap-5" style={{ marginBottom: 12 }}>

        {/* Número grande */}
        <div className="flex flex-col" style={{ minWidth: 72 }}>
          <span className="tabular-nums" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color }}>
            {absLoss.toFixed(2)}R
          </span>
          <span style={{ fontSize: 11, color: '#747D8A', marginTop: 4 }}>pérdida promedio</span>
        </div>

        {/* Barra + escala */}
        <div className="flex flex-col flex-1 justify-center">
          <div className="flex justify-between">
            <span style={{ fontSize: 10, color: '#505866' }}>Ideal: 1R</span>
          </div>
          {/* Track */}
          <div
            style={{
              background: '#212836', borderRadius: 4, height: 6,
              margin: '10px 0', overflow: 'hidden', position: 'relative',
            }}
          >
            {/* Ideal marker at 50% */}
            <div
              style={{
                position: 'absolute', top: 0, bottom: 0, left: '50%',
                width: 1, background: '#505866', opacity: 0.5,
              }}
            />
            {/* Fill */}
            <div
              style={{
                height: '100%', borderRadius: 4,
                width: `${barWidth}%`,
                background: color,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          {/* Scale */}
          <div className="flex justify-between" style={{ fontSize: 9, color: '#505866' }}>
            <span>0R</span>
            <span>1R ideal</span>
            <span>2R+</span>
          </div>
        </div>

      </div>

      {/* ── Mensaje accionable ── */}
      <div style={{ borderTop: '1px solid #242C3A', paddingTop: 12, marginTop: 'auto' }}>
        <p style={{ fontSize: 11, color: '#747D8A', lineHeight: 1.5, margin: 0 }}>
          {vs === 'good' && (
            <>
              Respetas tu riesgo. Tus stops están bien ejecutados — promedio{' '}
              <strong style={{ color: '#fff', fontWeight: 500 }}>{absLoss.toFixed(2)}R</strong>
              , por debajo del ideal de 1R.
            </>
          )}
          {vs === 'warning' && (
            <>
              Estás dejando correr algunas pérdidas más allá de 1R.
              Revisa si estás moviendo el stop.
            </>
          )}
          {vs === 'danger' && (
            <>
              Atención: tus losses promedian{' '}
              <strong style={{ color: '#fff', fontWeight: 500 }}>{absLoss.toFixed(2)}R</strong>
              . Estás moviendo el stop o no cortando pérdidas a tiempo.
            </>
          )}
        </p>
      </div>

      {/* ── Footer ── */}
      <p style={{ fontSize: 10, color: '#505866', marginTop: 8, marginBottom: 0 }}>
        Basado en {totalLosses} trade{totalLosses !== 1 ? 's' : ''} perdedor{totalLosses !== 1 ? 'es' : ''}
      </p>

    </div>
  );
};

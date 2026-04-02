import React from 'react';
import { Info } from 'lucide-react';
import { calculateRRComparison } from '../../utils/calculations';
import type { Trade } from '../../types/trade';
import { TradeStatus, TradeResult } from '../../types/trade';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type VisualStatus = 'good' | 'warning' | 'danger';

function ratioStatus(ratio: number): VisualStatus {
  if (ratio >= 80) return 'good';
  if (ratio >= 60) return 'warning';
  return 'danger';
}

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
  good:    'Buena ejecución',
  warning: 'Mejora posible',
  danger:  'Cortando winners',
};

// ─── RRComparisonCard ─────────────────────────────────────────────────────────

interface Props {
  trades: Trade[];
}

const CARD: React.CSSProperties = {
  background: '#1A202A', borderRadius: 10, padding: 18,
  display: 'flex', flexDirection: 'column',
};

export const RRComparisonCard: React.FC<Props> = ({ trades }) => {
  const data = calculateRRComparison(trades);

  // ── Count for empty state ──────────────────────────────────────────────────
  const validCount = trades.filter(t =>
    t.status === TradeStatus.Closed &&
    t.takeProfit != null &&
    t.exitPrice  != null &&
    t.entryPrice != null &&
    t.stopLoss   != null &&
    (t.result === TradeResult.Win || t.result === TradeResult.Loss),
  ).length;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div style={CARD}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#505866', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>R:R planeado vs ejecutado</span>
        </div>
        <p style={{ fontSize: 11, color: '#505866', marginBottom: 14 }}>¿Capturas el potencial que planeas?</p>
        <div className="flex-1 flex flex-col items-center justify-center py-6 gap-3 text-center">
          <Info size={18} style={{ color: '#505866' }} />
          <p style={{ fontSize: 13, color: '#505866', maxWidth: 220, margin: 0 }}>
            Registra el Take Profit en tus trades para ver este análisis.
          </p>
          <p style={{ fontSize: 11, color: '#505866', margin: 0 }}>
            Actualmente tienes datos insuficientes ({validCount}/3 mínimo)
          </p>
        </div>
      </div>
    );
  }

  const { avgRRPlanned, avgRRExecuted, executionRatio, validTrades, isUndercutting } = data;
  const vs    = ratioStatus(executionRatio);
  const color = STATUS_COLOR[vs];

  return (
    <div style={CARD}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>R:R planeado vs ejecutado</span>
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
      <p style={{ fontSize: 11, color: '#505866', marginBottom: 14 }}>¿Capturas el potencial que planeas?</p>

      {/* ── Barras comparativas ── */}
      <div style={{ marginBottom: 4 }}>

        {/* Planeado */}
        <div style={{ marginBottom: 10 }}>
          <div className="flex justify-between" style={{ marginBottom: 5 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#747D8A' }}>
              Planeado
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#fff' }} className="tabular-nums">
              {avgRRPlanned.toFixed(2)}R
            </span>
          </div>
          <div style={{ background: '#212836', height: 6, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: '#2D3748', borderRadius: 4 }} />
          </div>
        </div>

        {/* Ejecutado */}
        <div style={{ marginBottom: 10 }}>
          <div className="flex justify-between" style={{ marginBottom: 5 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#747D8A' }}>
              Ejecutado
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color }} className="tabular-nums">
              {avgRRExecuted.toFixed(2)}R
            </span>
          </div>
          <div style={{ background: '#212836', height: 6, borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, executionRatio)}%`, height: '100%',
                background: color, borderRadius: 4,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>

      </div>

      {/* ── Badge central ── */}
      <div className="flex justify-center" style={{ margin: '8px 0' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '5px 12px', borderRadius: 4,
            fontSize: 12, fontWeight: 500,
            background: STATUS_BG[vs], color,
          }}
        >
          Capturas el {executionRatio.toFixed(0)}% de tu potencial
        </span>
      </div>

      {/* ── Mensaje accionable ── */}
      <div style={{ borderTop: '1px solid #242C3A', paddingTop: 12, marginTop: 8 }}>
        <p style={{ fontSize: 11, color: '#747D8A', lineHeight: 1.5, margin: 0 }}>
          {isUndercutting ? (
            <>
              Estás cerrando winners antes de tiempo. Tu plan promete{' '}
              <strong style={{ color: '#fff', fontWeight: 500 }}>{avgRRPlanned.toFixed(2)}R</strong>
              {' '}pero ejecutas{' '}
              <strong style={{ color, fontWeight: 500 }}>{avgRRExecuted.toFixed(2)}R</strong>.
            </>
          ) : (
            'Buena ejecución. Estás respetando tus objetivos de ganancia.'
          )}
        </p>
      </div>

      {/* ── Footer ── */}
      <p style={{ fontSize: 10, color: '#505866', marginTop: 8, marginBottom: 0 }}>
        Calculado sobre {validTrades} trades con Take Profit registrado
      </p>

    </div>
  );
};

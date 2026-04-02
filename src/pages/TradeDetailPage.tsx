import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Calendar, Clock, BookOpen, X, ZoomIn } from 'lucide-react';
import { useTradeStore } from '../stores/useTradeStore';
import { useJournalStore } from '../stores/useJournalStore';
import { supabase } from '../services/supabase';
import { TradeForm } from '../components/trade/TradeForm';
import type { Trade } from '../types/trade';
import { TradeDirection, TradeResult, TradeStatus } from '../types/trade';
import type { TradeFormData } from '../types/trade';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { getTradeSignedPnl, getTradeSignedR } from '../utils/calculations';
import { journalToConfig } from '../types/account';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitISODatetime(iso: string | null | undefined): { date: string; time: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (!iso) {
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  }
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function tradeToFormData(t: Trade): TradeFormData {
  const entry = splitISODatetime(t.entryDate);
  const close = splitISODatetime(t.closeDate ?? t.closedAt);
  return {
    assetName:    t.assetName,
    direction:    t.direction,
    entryDate:    entry.date,
    entryTime:    entry.time,
    closeDate:    close.date,
    closeTime:    close.time,
    entryPrice:   String(t.entryPrice),
    stopLoss:     String(t.stopLoss),
    takeProfit:   t.takeProfit != null ? String(t.takeProfit) : '',
    exitPrice:    t.exitPrice != null ? String(t.exitPrice) : '',
    result:       t.result,
    pnlAmount:    t.pnlAmount != null ? String(t.pnlAmount) : '',
    notes:        t.notes ?? '',
    screenshotUri: t.screenshotUri ?? '',
  };
}

function assetInitials(name: string): string {
  return name.replace('/', '').slice(0, 3).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PriceCell: React.FC<{ label: string; value?: number | null }> = ({ label, value }) => (
  <div className="bg-bg rounded-xl p-4 flex flex-col gap-1">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</span>
    <span className="text-[20px] font-bold text-text tabular-nums">
      {value != null ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : '—'}
    </span>
  </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-3 border-b border-divider/50 last:border-0">
    <span className="text-text-secondary shrink-0">{icon}</span>
    <div className="flex flex-col min-w-0">
      <span className="text-[11px] text-text-secondary uppercase tracking-wider">{label}</span>
      <span className="text-[13px] font-medium text-text truncate">{value}</span>
    </div>
  </div>
);

const DeleteDialog: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
    <div className="bg-bg-surface rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
      <h3 className="text-[16px] font-bold text-text mb-2">Delete Trade</h3>
      <p className="text-[14px] text-text-secondary mb-6">This action cannot be undone.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-[10px] border border-divider text-text-secondary hover:bg-bg-secondary transition-colors text-[14px] font-semibold">
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-[10px] bg-negative text-white hover:bg-negative/80 transition-colors text-[14px] font-semibold">
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Result / direction config ────────────────────────────────────────────────

const resultConfig = {
  [TradeResult.Win]:  { label: 'Win',        color: 'bg-positive/10 text-positive' },
  [TradeResult.Loss]: { label: 'Loss',       color: 'bg-negative/10 text-negative' },
  [TradeResult.Open]: { label: 'Break Even', color: 'bg-warning/10 text-warning'   },
};

const dirConfig = {
  [TradeDirection.Long]:  { label: 'Long',  color: 'bg-positive/10 text-positive' },
  [TradeDirection.Short]: { label: 'Short', color: 'bg-negative/10 text-negative' },
};

// ─── TradeDetailPage ──────────────────────────────────────────────────────────

export const TradeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { trades, deleteTrade } = useTradeStore();
  const { activeJournal } = useJournalStore();

  const [trade, setTrade]           = useState<Trade | null>(null);
  const [loadingFetch, setLoading]  = useState(false);
  const [showEdit, setShowEdit]         = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Try store first, then fetch from Supabase
  useEffect(() => {
    if (!id) return;
    const fromStore = trades.find(t => t.id === id);
    if (fromStore) { setTrade(fromStore); return; }

    setLoading(true);
    supabase.from('trades').select('*').eq('id', id).single().then(({ data, error }) => {
      setLoading(false);
      if (error || !data) return;
      const d = data as Record<string, unknown>;
      setTrade({
        id:           d.id as string,
        assetName:    d.asset_name as string,
        direction:    d.direction as TradeDirection,
        entryPrice:   d.entry_price as number,
        stopLoss:     d.stop_loss as number,
        takeProfit:   d.take_profit as number ?? undefined,
        exitPrice:    d.exit_price as number ?? undefined,
        result:       d.result as TradeResult,
        rValue:       d.r_value as number ?? undefined,
        pnlAmount:    d.pnl_amount as number ?? undefined,
        status:       d.status as TradeStatus,
        notes:        d.notes as string ?? undefined,
        screenshotUri: d.screenshot_uri as string ?? undefined,
        entryDate:    d.entry_date as string ?? null,
        closeDate:    d.close_date as string ?? null,
        createdAt:    d.created_at as string,
        closedAt:     d.closed_at as string ?? undefined,
        synced:       true,
      });
    });
  }, [id, trades]);

  // Keep local trade in sync when store updates after edit
  useEffect(() => {
    if (!id) return;
    const updated = trades.find(t => t.id === id);
    if (updated) setTrade(updated);
  }, [trades, id]);

  // Escape: close lightbox first, then go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightboxOpen) { setLightboxOpen(false); return; }
      if (!showEdit && !showDelete) navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, showEdit, showDelete, lightboxOpen]);

  const handleDelete = async () => {
    if (!trade) return;
    await deleteTrade(trade.id);
    navigate('/history', { replace: true });
  };

  // ── Loading / not found ────────────────────────────────────────────────────

  if (loadingFetch) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-text-secondary">
        <p className="text-[15px]">Trade not found.</p>
        <button onClick={() => navigate('/history')} className="text-accent text-[13px] hover:underline">
          Back to History
        </button>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const currency   = activeJournal?.currency ?? 'USD';
  const config     = activeJournal ? journalToConfig(activeJournal) : { riskPerTrade: 100 };
  const pnl        = getTradeSignedPnl(trade, config.riskPerTrade);
  const rVal       = getTradeSignedR(trade);
  const isPnlPos   = pnl >= 0;
  const isRPos     = rVal >= 0;
  const res        = resultConfig[trade.result];
  const dir        = dirConfig[trade.direction];
  const isClosed   = trade.status === TradeStatus.Closed;

  return (
    <div className="space-y-5">

      {/* ── Back button ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-secondary hover:text-text transition-colors text-[13px] font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to History
      </button>

      {/* ── Main 2-col layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: 2/3 ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Header card */}
          <div className="bg-bg-surface rounded-xl p-6 flex items-center gap-5">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <span className="text-[15px] font-bold text-accent">{assetInitials(trade.assetName)}</span>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <h1 className="text-[22px] font-bold text-text leading-tight">{trade.assetName}</h1>
              <div className="flex items-center flex-wrap gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${dir.color}`}>{dir.label}</span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${res.color}`}>{res.label}</span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  isClosed ? 'bg-text-secondary/10 text-text-secondary' : 'bg-accent/10 text-accent'
                }`}>
                  {isClosed ? 'Closed' : 'Open'}
                </span>
              </div>
            </div>
          </div>

          {/* P&L + R card */}
          <div className="bg-bg-surface rounded-xl p-6 flex items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">P&L</span>
              {pnl != null ? (
                <span className={`text-[40px] font-bold leading-none tabular-nums ${isPnlPos ? 'text-positive' : 'text-negative'}`}>
                  {isPnlPos ? '+' : ''}{formatCurrency(pnl, currency)}
                </span>
              ) : (
                <span className="text-[40px] font-bold leading-none text-text-secondary">—</span>
              )}
            </div>
            {rVal != null && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">R Value</span>
                <span className={`text-[28px] font-bold tabular-nums ${isRPos ? 'text-positive' : 'text-negative'}`}>
                  {isRPos ? '+' : ''}{rVal.toFixed(2)}R
                </span>
              </div>
            )}
          </div>

          {/* Prices grid */}
          <div className="bg-bg-surface rounded-xl p-6">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-4">Prices</h2>
            <div className="grid grid-cols-2 gap-3">
              <PriceCell label="Entry Price" value={trade.entryPrice} />
              <PriceCell label="Stop Loss"   value={trade.stopLoss} />
              <PriceCell label="Take Profit" value={trade.takeProfit} />
              <PriceCell label="Exit Price"  value={trade.exitPrice} />
            </div>
          </div>

          {/* Screenshot — edge-to-edge, click to expand */}
          {trade.screenshotUri && (
            <div className="bg-bg-surface rounded-xl overflow-hidden">
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <h2 className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary">Screenshot</h2>
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-accent transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  Expand
                </button>
              </div>
              <div
                className="relative group cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={trade.screenshotUri}
                  alt={`${trade.assetName} trade screenshot`}
                  className="w-full object-contain"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {trade.notes && (
            <div className="bg-bg-surface rounded-xl p-6">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-3">Notes</h2>
              <p className="text-[14px] text-text leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: 1/3 ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Info card */}
          <div className="bg-bg-surface rounded-xl p-6">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Details</h2>
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Entry"
              value={formatDateTime(trade.entryDate ?? trade.createdAt)}
            />
            {(trade.closeDate ?? trade.closedAt) && (
              <InfoRow
                icon={<Clock className="w-4 h-4" />}
                label="Close"
                value={formatDateTime((trade.closeDate ?? trade.closedAt)!)}
              />
            )}
            <InfoRow
              icon={<BookOpen className="w-4 h-4" />}
              label="Journal"
              value={activeJournal?.name ?? 'My Journal'}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-[12px] bg-accent text-white font-bold text-[14px] hover:bg-accent-dark transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit Trade
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-[12px] border border-negative/40 text-negative font-semibold text-[14px] hover:bg-negative/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Trade
            </button>
          </div>

          {/* Quick stats if closed */}
          {isClosed && (rVal != null || pnl != null) && (
            <div className="bg-bg-surface rounded-xl p-6">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-3">Quick Stats</h2>
              {rVal != null && (
                <div className="flex justify-between py-2 border-b border-divider/50">
                  <span className="text-[13px] text-text-secondary">R/R Ratio</span>
                  <span className={`text-[13px] font-semibold ${isRPos ? 'text-positive' : 'text-negative'}`}>
                    {isRPos ? '+' : ''}{rVal.toFixed(2)}R
                  </span>
                </div>
              )}
              {pnl != null && (
                <div className="flex justify-between py-2">
                  <span className="text-[13px] text-text-secondary">Net P&L</span>
                  <span className={`text-[13px] font-semibold ${isPnlPos ? 'text-positive' : 'text-negative'}`}>
                    {isPnlPos ? '+' : ''}{formatCurrency(pnl, currency)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit modal ── */}
      {showEdit && (
        <TradeForm
          tradeId={trade.id}
          initialData={tradeToFormData(trade)}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* ── Delete confirm ── */}
      {showDelete && (
        <DeleteDialog
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* ── Screenshot lightbox ── */}
      {lightboxOpen && trade.screenshotUri && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={trade.screenshotUri}
            alt={`${trade.assetName} trade screenshot`}
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

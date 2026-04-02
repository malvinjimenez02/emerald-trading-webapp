import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { TimePicker } from '../ui/TimePicker';
import { TradeDirection, TradeResult } from '../../types/trade';
import type { TradeFormData } from '../../types/trade';
import { useTradeStore } from '../../stores/useTradeStore';
import { useJournalStore } from '../../stores/useJournalStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { validateTradeForm } from '../../utils/validators';
import { supabase } from '../../services/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_ASSETS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT',
  'EUR/USD', 'GBP/USD', 'USD/JPY',
  'SPY', 'QQQ', 'NQ', 'ES', 'GC',
];

function nowDatetime() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function getEmptyForm(): TradeFormData {
  const { date, time } = nowDatetime();
  return {
    assetName: '',
    direction: TradeDirection.Long,
    entryDate: date,
    entryTime: time,
    closeDate: date,
    closeTime: time,
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    exitPrice: '',
    result: TradeResult.Win,
    pnlAmount: '',
    notes: '',
    screenshotUri: '',
  };
}

function toISO(date: string, time: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || '00:00'}:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, error, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary">
      {label}{required && <span className="text-negative ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-[12px] text-negative">{error}</p>
    )}
  </div>
);

const inputClass = (error?: string) =>
  `w-full bg-bg rounded-[10px] border px-3 py-2.5 text-[14px] text-text placeholder-text-tertiary
   focus:outline-none focus:ring-1 transition-colors ${
     error
       ? 'border-negative focus:border-negative focus:ring-negative/30'
       : 'border-divider focus:border-accent focus:ring-accent/20'
   }`;

// ─── TradeForm ────────────────────────────────────────────────────────────────

interface TradeFormProps {
  onClose: () => void;
  /** If provided: edit mode — form is pre-filled and submit calls updateTrade */
  tradeId?: string;
  initialData?: Partial<TradeFormData>;
}

export const TradeForm: React.FC<TradeFormProps> = ({ onClose, tradeId, initialData }) => {
  const { addTrade, updateTrade } = useTradeStore();
  const { activeJournal } = useJournalStore();
  const { user } = useAuthStore();

  const isEditMode = Boolean(tradeId);

  const [form, setForm]           = useState<TradeFormData>(() => ({ ...getEmptyForm(), ...initialData }));
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);

  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    initialData?.screenshotUri || null
  );

  const assetRef      = useRef<HTMLInputElement>(null);
  const notesRef      = useRef<HTMLTextAreaElement>(null);
  const overlayRef    = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Show local preview immediately while uploading
    const localUrl = URL.createObjectURL(file);
    setScreenshotPreview(localUrl);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('screenshots')
        .upload(path, file, { upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('screenshots')
        .getPublicUrl(path);

      URL.revokeObjectURL(localUrl);
      setScreenshotPreview(publicUrl);
      set('screenshotUri', publicUrl);
    } catch (err) {
      console.error('[TradeForm] screenshot upload failed:', err);
      // Keep local blob as fallback so user isn't blocked
      set('screenshotUri', localUrl);
      setErrors(prev => ({ ...prev, _screenshot: 'Upload failed — screenshot saved locally only' }));
    } finally {
      setUploading(false);
    }
  };

  const removeScreenshot = async () => {
    // Delete from Supabase Storage if it's a remote URL from our bucket
    if (screenshotPreview && !screenshotPreview.startsWith('blob:')) {
      const url = new URL(screenshotPreview);
      const pathMatch = url.pathname.match(/\/object\/public\/screenshots\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('screenshots').remove([pathMatch[1]]);
      }
    }
    if (screenshotPreview?.startsWith('blob:')) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    set('screenshotUri', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto-focus asset name on open
  useEffect(() => {
    const t = setTimeout(() => assetRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = <K extends keyof TradeFormData>(key: K, value: TradeFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = useCallback(() => {
    const result = validateTradeForm(form);
    if (!result.valid) {
      setErrors(result.errors);
      return false;
    }
    setErrors({});
    return true;
  }, [form]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!activeJournal) return;

    setSaving(true);
    try {
      if (isEditMode && tradeId) {
        await updateTrade(tradeId, {
          assetName:   form.assetName,
          direction:   form.direction,
          entryPrice:  parseFloat(form.entryPrice),
          stopLoss:    parseFloat(form.stopLoss),
          takeProfit:  form.takeProfit ? parseFloat(form.takeProfit) : undefined,
          exitPrice:   form.exitPrice ? parseFloat(form.exitPrice) : undefined,
          result:      form.result,
          pnlAmount:   form.pnlAmount ? parseFloat(form.pnlAmount) : undefined,
          notes:       form.notes || undefined,
          screenshotUri: form.screenshotUri || undefined,
          entryDate:   toISO(form.entryDate, form.entryTime),
          closeDate:   form.result !== TradeResult.Open ? toISO(form.closeDate, form.closeTime) : null,
        });
      } else {
        if (!activeJournal) return;
        await addTrade(form, activeJournal.id);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save trade:', err);
      setErrors({ _form: 'Failed to save trade. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Enter on last field = submit
  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  // Click overlay to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const isFormValid = form.assetName.trim() !== '' &&
    form.entryPrice !== '' &&
    form.stopLoss !== '';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New Trade"
        className="bg-bg-surface rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-bold text-text">{isEditMode ? 'Edit Trade' : 'New Trade'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:bg-bg-secondary hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5">

          {/* ── Asset Name ── */}
          <Field label="Asset Name" required error={errors.assetName}>
            <input
              ref={assetRef}
              type="text"
              placeholder="e.g. BTC/USDT"
              value={form.assetName}
              onChange={e => set('assetName', e.target.value)}
              className={inputClass(errors.assetName)}
              autoComplete="off"
              tabIndex={1}
            />
            {/* Quick-select chips */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {QUICK_ASSETS.map(asset => (
                <button
                  key={asset}
                  type="button"
                  tabIndex={-1}
                  onClick={() => set('assetName', asset)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    form.assetName === asset
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-bg border-divider text-text-secondary hover:border-accent/30 hover:text-text'
                  }`}
                >
                  {asset}
                </button>
              ))}
            </div>
          </Field>

          {/* ── Direction ── */}
          <Field label="Direction" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                tabIndex={2}
                onClick={() => set('direction', TradeDirection.Long)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-[10px] border font-semibold text-[14px] transition-colors ${
                  form.direction === TradeDirection.Long
                    ? 'bg-positive/10 border-positive/40 text-positive'
                    : 'bg-bg border-divider text-text-secondary hover:border-positive/30'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Long
              </button>
              <button
                type="button"
                tabIndex={3}
                onClick={() => set('direction', TradeDirection.Short)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-[10px] border font-semibold text-[14px] transition-colors ${
                  form.direction === TradeDirection.Short
                    ? 'bg-negative/10 border-negative/40 text-negative'
                    : 'bg-bg border-divider text-text-secondary hover:border-negative/30'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Short
              </button>
            </div>
          </Field>

          {/* ── Entry Date & Time ── */}
          <Field label="Entry Date & Time" required error={errors.entryDate ?? errors.entryTime}>
            <div className="flex gap-2">
              <DatePicker
                value={form.entryDate}
                onChange={v => set('entryDate', v)}
                error={!!errors.entryDate}
                tabIndex={4}
              />
              <TimePicker
                value={form.entryTime}
                onChange={v => set('entryTime', v)}
                error={!!errors.entryTime}
                tabIndex={5}
              />
            </div>
          </Field>

          {/* ── Close Date & Time ── */}
          <Field label="Close Date & Time" error={errors.closeDate ?? errors.closeTime}>
            <div className="flex gap-2">
              <DatePicker
                value={form.closeDate}
                onChange={v => set('closeDate', v)}
                disabled={form.result === TradeResult.Open}
                error={!!errors.closeDate}
                tabIndex={6}
              />
              <TimePicker
                value={form.closeTime}
                onChange={v => set('closeTime', v)}
                disabled={form.result === TradeResult.Open}
                error={!!errors.closeTime}
                tabIndex={7}
              />
            </div>
            {form.result === TradeResult.Open && (
              <p className="text-[11px] text-text-tertiary">Trade open — will be recorded on close</p>
            )}
          </Field>

          {/* ── Prices grid ── */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry Price" required error={errors.entryPrice}>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={form.entryPrice}
                onChange={e => set('entryPrice', e.target.value)}
                className={inputClass(errors.entryPrice)}
                tabIndex={8}
              />
            </Field>
            <Field label="Stop Loss" required error={errors.stopLoss}>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={form.stopLoss}
                onChange={e => set('stopLoss', e.target.value)}
                className={inputClass(errors.stopLoss)}
                tabIndex={9}
              />
            </Field>
            <Field label="Take Profit" error={errors.takeProfit}>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00 (opt)"
                value={form.takeProfit}
                onChange={e => set('takeProfit', e.target.value)}
                className={inputClass(errors.takeProfit)}
                tabIndex={10}
              />
            </Field>
            <Field label="Exit Price" error={errors.exitPrice}>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00 (opt)"
                value={form.exitPrice}
                onChange={e => set('exitPrice', e.target.value)}
                className={inputClass(errors.exitPrice)}
                tabIndex={11}
              />
            </Field>
          </div>

          {/* ── Result ── */}
          <Field label="Result" required>
            <div className="flex gap-3">
              {[
                { value: TradeResult.Win,  label: 'Win',  color: 'positive' },
                { value: TradeResult.Loss, label: 'Loss', color: 'negative' },
                { value: TradeResult.Open, label: 'Break Even', color: 'neutral'  },
              ].map(({ value, label, color }) => {
                const isActive = form.result === value;
                const colorMap = {
                  positive: isActive
                    ? 'border-positive bg-positive/10 text-positive'
                    : 'border-divider text-text-secondary hover:border-positive/30',
                  negative: isActive
                    ? 'border-negative bg-negative/10 text-negative'
                    : 'border-divider text-text-secondary hover:border-negative/30',
                  neutral: isActive
                    ? 'border-warning/40 bg-warning/10 text-warning'
                    : 'border-divider text-text-secondary hover:border-warning/30',
                };
                return (
                  <button
                    key={value}
                    type="button"
                    tabIndex={7}
                    onClick={() => set('result', value)}
                    className={`flex-1 flex items-center gap-2.5 py-2.5 px-3 rounded-[10px] border font-semibold text-[14px] transition-colors ${colorMap[color as keyof typeof colorMap]}`}
                  >
                    {/* Custom radio circle */}
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isActive ? 'border-current' : 'border-divider'
                    }`}>
                      {isActive && <span className="w-2 h-2 rounded-full bg-current" />}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* ── P&L Amount ── */}
          <Field label="P&L Amount (USD)" error={errors.pnlAmount}>
            <input
              type="number"
              step="any"
              placeholder="Optional — e.g. 250.00"
              value={form.pnlAmount}
              onChange={e => set('pnlAmount', e.target.value)}
              className={inputClass(errors.pnlAmount)}
              tabIndex={12}
            />
          </Field>

          {/* ── Screenshot ── */}
          <Field label="Screenshot">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScreenshot}
              tabIndex={-1}
            />

            {screenshotPreview ? (
              <div className="relative group rounded-[10px] overflow-hidden border border-divider">
                <img
                  src={screenshotPreview}
                  alt="Trade screenshot"
                  className="w-full max-h-[180px] object-cover"
                />
                {uploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                    <span className="text-[12px] text-white font-medium">Uploading…</span>
                  </div>
                )}
                {!uploading && (
                  <>
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-negative/80"
                      aria-label="Remove screenshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <span className="text-[12px] text-white font-medium">Change image</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                tabIndex={9}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-[10px] border border-dashed border-divider text-text-secondary hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-[12px] font-medium">Click to add screenshot</span>
                <span className="text-[11px] text-text-tertiary">PNG, JPG, WEBP</span>
              </button>
            )}
            {errors._screenshot && (
              <p className="text-[11px] text-warning">{errors._screenshot}</p>
            )}
          </Field>

          {/* ── Notes ── */}
          <Field label="Notes">
            <textarea
              ref={notesRef}
              rows={3}
              placeholder="Setup, market context, lessons learned…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              onKeyDown={handleNotesKeyDown}
              className={`${inputClass()} resize-none`}
              tabIndex={13}
            />
            <p className="text-[11px] text-text-tertiary -mt-0.5">Ctrl+Enter to save</p>
          </Field>

          {/* ── Form-level error ── */}
          {errors._form && (
            <p className="text-[13px] text-negative bg-negative/10 rounded-lg px-3 py-2">
              {errors._form}
            </p>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              tabIndex={14}
              className="flex-1 py-3 rounded-[12px] border border-negative/60 text-negative hover:bg-negative/10 font-semibold text-[14px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || saving || uploading}
              tabIndex={15}
              className="flex-1 py-3 rounded-[12px] bg-accent text-white font-bold text-[14px] hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : isEditMode ? 'Update Trade' : 'Save Trade'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

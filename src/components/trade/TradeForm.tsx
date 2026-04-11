import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Loader2, Camera } from 'lucide-react';
import dayjs from 'dayjs';
import { DatePicker } from '../ui/DatePicker';
import { TimePicker } from '../ui/TimePicker';
import RCalculatorWidget from './RCalculatorWidget';
import { useRCalculator } from '../../hooks/useRCalculator';
import { TradeDirection, TradeResult } from '../../types/trade';
import type { TradeFormData } from '../../types/trade';
import { useTradeStore } from '../../stores/useTradeStore';
import { useJournalStore } from '../../stores/useJournalStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { validateTradeForm } from '../../utils/validators';
import { supabase } from '../../services/supabase';
import { parsePrice } from '../../utils/numbers';

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
  optionalLabel?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, error, required, optionalLabel, children }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center">
      <label className="text-[12px] font-semibold uppercase tracking-wider text-[#505866]">
        {label}{required && <span className="text-negative ml-0.5">*</span>}
      </label>
      {optionalLabel && (
        <span className="text-[9px] text-[#505866] font-normal ml-1 lowercase">
          {optionalLabel}
        </span>
      )}
    </div>
    {children}
    {error && (
      <p className="text-[12px] text-negative">{error}</p>
    )}
  </div>
);

const SectionSeparator: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 mb-[9px] mt-1">
    <span className="text-[9px] font-bold text-[#505866] uppercase tracking-[0.12em] shrink-0">
      {label}
    </span>
    <div className="flex-1 h-px bg-[#242C3A]" />
  </div>
);

const inputClass = (error?: string) =>
  `w-full bg-bg rounded-[10px] border px-3 py-2.5 text-[14px] text-text placeholder-[#28313F]
   focus:outline-none focus:ring-1 transition-colors ${error
    ? 'border-negative focus:border-negative focus:ring-negative/30'
    : 'border-[#28313F] focus:border-accent focus:ring-accent/20'
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

  const [form, setForm] = useState<TradeFormData>(() => ({ ...getEmptyForm(), ...initialData }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    initialData?.screenshotUri || null
  );

  const assetRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const localUrl = URL.createObjectURL(file);
    setScreenshotPreview(localUrl);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const accessToken = useAuthStore.getState().session?.access_token;

      // Use direct fetch to bypass the global 10s timeout on the supabase client
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120_000);

      const res = await fetch(
        `${supabaseUrl}/storage/v1/object/screenshots/${path}`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken ?? supabaseKey}`,
            'Content-Type': file.type || 'image/png',
            'x-upsert': 'false',
          },
          body: file,
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timer));

      if (!res.ok) {
        const body = await res.text().catch(() => res.statusText);
        throw new Error(`Upload failed ${res.status}: ${body}`);
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/screenshots/${path}`;

      URL.revokeObjectURL(localUrl);
      setScreenshotPreview(publicUrl);
      set('screenshotUri', publicUrl);
    } catch (err) {
      console.error('[TradeForm] screenshot upload failed:', err);
      URL.revokeObjectURL(localUrl);
      setScreenshotPreview(null);
      set('screenshotUri', '');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setErrors(prev => ({ ...prev, _screenshot: 'Error al subir el screenshot — intenta de nuevo' }));
    } finally {
      setUploading(false);
    }
  };

  const removeScreenshot = async () => {
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

  const entryDateObj = useMemo(() =>
    form.entryDate && form.entryTime ? new Date(`${form.entryDate}T${form.entryTime}`) : null,
    [form.entryDate, form.entryTime]
  );
  const closeDateObj = useMemo(() =>
    form.closeDate && form.closeTime ? new Date(`${form.closeDate}T${form.closeTime}`) : null,
    [form.closeDate, form.closeTime]
  );

  const rCalc = useRCalculator(
    form.direction === TradeDirection.Long ? 'long' : 'short',
    parsePrice(form.entryPrice),
    parsePrice(form.stopLoss),
    parsePrice(form.takeProfit),
    parsePrice(form.exitPrice),
    entryDateObj,
    closeDateObj
  );

  useEffect(() => {
    const t = setTimeout(() => assetRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // Auto-detect result logic based on rExecuted
  useEffect(() => {
    if (rCalc.rExecuted !== null && !isEditMode) {
      if (rCalc.rExecuted > 0.1) {
        set('result', TradeResult.Win);
      } else if (rCalc.rExecuted < -0.1) {
        set('result', TradeResult.Loss);
      } else {
        set('result', TradeResult.Open); // BE
      }
    }
  }, [rCalc.rExecuted, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!activeJournal) return;
    if (saving) return; // Prevent double submissions

    setSaving(true);
    console.log('1. Iniciando guardado...');
    
    // Auto-timeout simple para capturar cualquier cuelgue
    const timeoutMs = 45000;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Save timed out')), timeoutMs);
    });

    try {
      if (isEditMode && tradeId) {
        console.log('2. Ejecutando updateTrade...');
        const updateTask = updateTrade(tradeId, {
          assetName: form.assetName,
          direction: form.direction,
          entryPrice: parsePrice(form.entryPrice) || 0,
          stopLoss: parsePrice(form.stopLoss) || 0,
          takeProfit: parsePrice(form.takeProfit) || undefined,
          exitPrice: parsePrice(form.exitPrice) || undefined,
          result: form.result,
          rValue: rCalc.rExecuted ?? undefined,
          pnlAmount: parsePrice(form.pnlAmount) || undefined,
          notes: form.notes || undefined,
          screenshotUri: form.screenshotUri || undefined,
          entryDate: toISO(form.entryDate, form.entryTime),
          closeDate: toISO(form.closeDate, form.closeTime),
        });
        
        await Promise.race([updateTask, timeoutPromise]);
        console.log('4. updateTrade completado exitosamente.');
      } else {
        console.log('2. Ejecutando addTrade...');
        const addTask = addTrade(form, activeJournal.id);
        await Promise.race([addTask, timeoutPromise]);
        console.log('4. addTrade completado exitosamente.');
      }
      
      clearTimeout(timeoutId);
      console.log('5. Cerrando el modal...');
      onClose();
    } catch (err) {
      console.error('Failed to save trade:', err);
      setErrors({ _form: 'Failed to save trade. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const isFormValid = useMemo(() => {
    const entryDateFull = dayjs(`${form.entryDate}T${form.entryTime}`);
    const closeDateFull = dayjs(`${form.closeDate}T${form.closeTime}`);
    const entryPriceNum = parsePrice(form.entryPrice);
    const stopLossNum = parsePrice(form.stopLoss);
    const exitPriceNum = parsePrice(form.exitPrice);

    return (
      form.assetName.trim() !== '' &&
      !!form.direction &&
      !!form.result &&
      entryDateFull.isValid() &&
      closeDateFull.isValid() &&
      closeDateFull.isSameOrAfter(entryDateFull) &&
      entryPriceNum !== null && entryPriceNum > 0 &&
      stopLossNum !== null && stopLossNum > 0 &&
      exitPriceNum !== null && exitPriceNum > 0 &&
      entryPriceNum !== stopLossNum
    );
  }, [form]);

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
        className="bg-[#1A202A] rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[18px] font-bold text-white">{isEditMode ? 'Editar Trade' : 'Nuevo Trade'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:bg-bg-secondary hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-6">

          {/* 1. Qué operé */}
          <section className="flex flex-col gap-4">
            <SectionSeparator label="Qué operé?" />

            <Field label="Activo" required error={errors.assetName}>
              <input
                ref={assetRef}
                type="text"
                placeholder="e.g. NQ, BTC/USDT"
                value={form.assetName}
                onChange={e => set('assetName', e.target.value)}
                className={inputClass(errors.assetName)}
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-1.5 mt-1">
                {QUICK_ASSETS.map(asset => (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => set('assetName', asset)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${form.assetName === asset
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-[#212836] border-[#242C3A] text-[#747D8A] hover:border-accent/30 hover:text-white'
                      }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Dirección" required>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => set('direction', TradeDirection.Long)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-[10px] border font-semibold text-[14px] transition-colors ${form.direction === TradeDirection.Long
                    ? 'bg-[rgba(16,226,97,0.12)] border-[rgba(16,226,97,0.3)] text-[#10E261]'
                    : 'bg-[#212836] border-[#28313F] text-[#747D8A]'
                    }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => set('direction', TradeDirection.Short)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-[10px] border font-semibold text-[14px] transition-colors ${form.direction === TradeDirection.Short
                    ? 'bg-[rgba(248,81,73,0.12)] border-[rgba(248,81,73,0.3)] text-[#F85149]'
                    : 'bg-[#212836] border-[#28313F] text-[#747D8A]'
                    }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Short
                </button>
              </div>
            </Field>
          </section>

          {/* 2. Entrada */}
          <section className="flex flex-col gap-4">
            <SectionSeparator label="Entrada" />

            <Field label="Fecha y hora de entrada" required error={errors.entryDate ?? errors.entryTime}>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={form.entryDate} onChange={v => set('entryDate', v)} error={!!errors.entryDate} />
                <TimePicker value={form.entryTime} onChange={v => set('entryTime', v)} error={!!errors.entryTime} />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Precio de entrada" required error={errors.entryPrice}>
                <input
                  type="text" placeholder="0.00"
                  value={form.entryPrice} onChange={e => set('entryPrice', e.target.value)}
                  className={inputClass(errors.entryPrice)}
                />
              </Field>
              <Field label="Stop Loss" required error={errors.stopLoss}>
                <input
                  type="text" placeholder="0.00"
                  value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)}
                  className={inputClass(errors.stopLoss)}
                />
              </Field>
            </div>

            <Field label="Take Profit" optionalLabel="(opcional)" error={errors.takeProfit}>
              <input
                type="text" placeholder="0.00"
                value={form.takeProfit} onChange={e => set('takeProfit', e.target.value)}
                className={inputClass(errors.takeProfit)}
              />
            </Field>
          </section>

          {/* 3. Cierre */}
          <section className="flex flex-col gap-4">
            <SectionSeparator label="Cierre" />

            <Field label="Fecha y hora de cierre" required error={errors.closeDate ?? errors.closeTime}>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={form.closeDate} onChange={v => set('closeDate', v)} error={!!errors.closeDate} />
                <TimePicker value={form.closeTime} onChange={v => set('closeTime', v)} error={!!errors.closeTime} />
              </div>
            </Field>

            <Field label="Precio de salida" required error={errors.exitPrice}>
              <input
                type="text" placeholder="0.00"
                value={form.exitPrice} onChange={e => set('exitPrice', e.target.value)}
                className={inputClass(errors.exitPrice)}
              />
            </Field>

            {!isEditMode ? (
              <RCalculatorWidget {...rCalc} />
            ) : (
              <div className="bg-[#0D1117] border border-[#242C3A] rounded-lg p-3 mb-2.5 flex items-center justify-between">
                <span className="text-[11px] text-[#747D8A]">R-Value persistido</span>
                <span className={`text-[16px] font-bold ${rCalc.rExecuted !== null ? (rCalc.rExecuted > 0 ? 'text-[#10E261]' : 'text-[#F85149]') : 'text-[#505866]'}`}>
                  {rCalc.rExecuted !== null ? `${rCalc.rExecuted > 0 ? '+' : ''}${rCalc.rExecuted}R` : '—'}
                </span>
              </div>
            )}
          </section>

          {/* 4. Resultado */}
          <section className="flex flex-col gap-4">
            <SectionSeparator label="Resultado" />

            <Field label="Resultado" required>
              <div className="flex gap-2">
                {[
                  { v: TradeResult.Win, l: 'Win', c: '#10E261', b: 'rgba(16,226,97,0.12)', br: 'rgba(16,226,97,0.3)' },
                  { v: TradeResult.Loss, l: 'Loss', c: '#F85149', b: 'rgba(248,81,73,0.12)', br: 'rgba(248,81,73,0.3)' },
                  { v: TradeResult.Open, l: 'BE', c: '#F0883E', b: 'rgba(240,136,62,0.12)', br: 'rgba(240,136,62,0.3)' },
                ].map((r) => (
                  <button
                    key={r.v} type="button"
                    onClick={() => set('result', r.v)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] border font-semibold text-[14px] transition-colors ${form.result === r.v ? '' : 'bg-[#212836] border-[#28313F] text-[#747D8A]'
                      }`}
                    style={form.result === r.v ? { backgroundColor: r.b, borderColor: r.br, color: r.c } : {}}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.c }} />
                    {r.l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="P&L en USD" optionalLabel="(opcional — secundario al R)" error={errors.pnlAmount}>
              <input
                type="text" placeholder="e.g. 180.00"
                value={form.pnlAmount} onChange={e => set('pnlAmount', e.target.value)}
                className={inputClass(errors.pnlAmount)}
              />
            </Field>
          </section>

          {/* 5. Contexto */}
          <section className="flex flex-col gap-4">
            <SectionSeparator label="Contexto" />

            <Field label="Screenshot" optionalLabel="(opcional)">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />

              <div
                onClick={() => !screenshotPreview && fileInputRef.current?.click()}
                className={`flex items-center gap-[10px] p-[9px] px-[12px] rounded-lg border border-dashed transition-colors ${screenshotPreview ? 'bg-[#0D1117] border-[#28313F]' : 'bg-[#0D1117] border-[#28313F] cursor-pointer hover:border-accent/40'
                  }`}
              >
                <div className="w-7 h-7 bg-[#212836] rounded-md flex items-center justify-center shrink-0 border border-[#28313F] overflow-hidden">
                  {screenshotPreview ? (
                    <img src={screenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-[14px] text-[#505866]" />
                  )}
                </div>

                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-[#10E261]">
                      {screenshotPreview ? 'Screenshot añadido' : 'Añadir screenshot'}
                    </span>
                    {!screenshotPreview && <span className="text-[11px] text-[#505866]"> — PNG, JPG, WEBP</span>}
                  </div>

                  {screenshotPreview && !uploading && (
                    <button
                      type="button" onClick={(e) => { e.stopPropagation(); removeScreenshot(); }}
                      className="text-[#505866] hover:text-negative transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {uploading && <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />}
                </div>
              </div>
            </Field>

            <Field label="Notas">
              <textarea
                rows={3} placeholder="Notas del trade..."
                value={form.notes} onChange={e => set('notes', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
                className={`${inputClass()} resize-none`}
              />
              <p className="text-[10px] text-[#505866] mt-0.5">Ctrl+Enter para guardar</p>
            </Field>
          </section>

          {errors._form && (
            <p className="text-[13px] text-negative bg-negative/10 rounded-lg px-3 py-2">{errors._form}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 rounded-[12px] border border-[rgba(248,81,73,0.4)] text-[#F85149] hover:bg-negative/5 font-semibold text-[14px] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button" onClick={handleSubmit}
              disabled={!isFormValid || saving || uploading}
              className="flex-[2] py-3 rounded-[12px] bg-[#10E261] text-[#0F1219] font-bold text-[14px] hover:brightness-110 transition-all disabled:opacity-40"
            >
              {saving ? 'Guardando...' : isEditMode ? 'Actualizar Trade' : 'Guardar Trade'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};


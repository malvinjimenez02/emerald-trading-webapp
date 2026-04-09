import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { validateName, validateJournalName, sanitizeIdentifier } from '../utils/validators';

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Perfil', 'Journal', 'Capital', 'Listo'];

function parseCurrency(v: string): number {
  // Remove thousands separators (commas), keep only digits and the decimal dot
  const normalized = v.replace(/,/g, '');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function fmtUSD(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Step indicator ──────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ current: Step }> = ({ current }) => (
  <div className="mb-8 flex items-start justify-center gap-0">
    {STEP_LABELS.map((label, i) => {
      const id = (i + 1) as Step;
      const completed = id < current;
      const active = id === current;
      return (
        <React.Fragment key={id}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-all',
                completed ? 'border-accent bg-accent/15 text-accent' : '',
                active && !completed ? 'border-accent text-accent shadow-[0_0_0_3px_rgba(16,226,97,0.12)]' : '',
                !active && !completed ? 'border-input-border text-text-secondary' : '',
              ].join(' ')}
            >
              {completed ? <Check className="h-3 w-3" strokeWidth={3} /> : id}
            </div>
            <span
              className={`text-[10px] font-medium ${active ? 'text-white' : 'text-text-secondary'}`}
            >
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div
              className={[
                'mb-5 mt-3.5 h-px w-10 flex-shrink-0 transition-colors',
                id < current ? 'bg-accent/35' : 'bg-divider',
              ].join(' ')}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Currency input ──────────────────────────────────────────────────────────
const CurrencyInput: React.FC<{
  label: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, helper, value, onChange, placeholder = '0.00' }) => (
  <div className="space-y-1.5">
    <label className="block text-subhead text-text">{label}</label>
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-subhead text-text-secondary">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          // Allow only digits, one dot, and commas (commas stripped on parse)
          const raw = e.target.value.replace(/[^0-9.,]/g, '');
          onChange(raw);
        }}
        placeholder={placeholder}
        className="w-full rounded-[8px] border border-input-border bg-inputBg pl-8 pr-4 py-2.5 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
      />
    </div>
    <p className="text-caption text-text-secondary">{helper}</p>
  </div>
);

// ── Main page ───────────────────────────────────────────────────────────────
export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, saveProfile, clearError, error, hasCompletedProfile } = useAuthStore();

  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [journalName, setJournalName] = useState('');
  const [originCapital, setOriginCapital] = useState('');
  const [startCapital, setStartCapital] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { clearError(); }, [clearError]);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    if (hasCompletedProfile) { navigate('/dashboard', { replace: true }); }
  }, [user, hasCompletedProfile, navigate]);

  // Capital diff calculations
  const origin = parseCurrency(originCapital);
  const start = parseCurrency(startCapital);
  const diff = start - origin;
  const diffPct = origin > 0 ? (diff / origin) * 100 : 0;
  const capitalState: 'profit' | 'drawdown' | 'neutral' =
    diff > 0.005 ? 'profit' : diff < -0.005 ? 'drawdown' : 'neutral';

  const handleNext = () => {
    setLocalError(null);
    if (step === 1) {
      const fc = validateName(firstName, 'First name');
      if (!fc.valid) { setLocalError(fc.message ?? 'Nombre inválido'); return; }
      const lc = validateName(lastName, 'Last name');
      if (!lc.valid) { setLocalError(lc.message ?? 'Apellido inválido'); return; }
    } else if (step === 2) {
      const jc = validateJournalName(journalName);
      if (!jc.valid) { setLocalError(jc.message ?? 'Nombre de journal inválido'); return; }
    } else if (step === 3) {
      if (origin <= 0) { setLocalError('Ingresá un capital original válido'); return; }
      if (start <= 0) { setLocalError('Ingresá un balance actual válido'); return; }
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  };

  const handleBack = () => {
    setLocalError(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  const handleSubmit = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      const success = await saveProfile(
        sanitizeIdentifier(firstName, 50),
        sanitizeIdentifier(lastName, 50),
        sanitizeIdentifier(journalName, 80),
        origin,
        start,
      );
      if (success) {
        navigate('/dashboard', { replace: true });
      } else {
        // error is set in the store — shown via {error} below
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('[CompleteProfile] handleSubmit error:', err);
      setLocalError('Ocurrió un error inesperado. Intentá de nuevo.');
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step < 4) handleNext();
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen lg:grid-cols-[0.82fr_1.18fr]">
        {/* ── Sidebar ── */}
        <aside className="relative hidden overflow-hidden border-r border-divider/70 bg-[#06090f] lg:block">
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:12px_12px]" />
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(16,226,97,0.10)_0%,rgba(6,9,15,0.88)_45%,rgba(6,9,15,0.98)_100%)]" />
          <div className="absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#d9792a]/35 blur-[120px]" />
          <Link
            to="/"
            className="absolute left-10 top-8 inline-flex items-center gap-2 text-subhead text-white/75 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="relative z-10 mx-auto flex h-full max-w-[560px] flex-col items-center justify-center px-14 text-center">
            <img
              src="/header-logo.svg"
              alt="Emerald"
              className="mb-8 h-12 w-auto drop-shadow-[0_0_18px_rgba(16,226,97,0.35)]"
            />
            <h2 className="max-w-[420px] text-[46px] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
              Configurá tu workspace en unos pasos.
            </h2>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-[420px]" onKeyDown={handleKeyDown}>
            <StepIndicator current={step} />

            {/* ── Step 1: Perfil del trader ── */}
            {step === 1 && (
              <>
                <div className="mb-7">
                  <h1 className="text-title1 text-white">Perfil del trader</h1>
                  <p className="mt-2 text-subhead text-text-secondary">
                    Tu nombre aparece en el header y el contexto de actividad.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-subhead text-text">Nombre</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Tu nombre"
                      autoFocus
                      className="w-full rounded-[8px] border border-input-border bg-inputBg px-4 py-2.5 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-subhead text-text">Apellido</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Tu apellido"
                      className="w-full rounded-[8px] border border-input-border bg-inputBg px-4 py-2.5 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Step 2: Tu primer journal ── */}
            {step === 2 && (
              <>
                <div className="mb-7">
                  <h1 className="text-title1 text-white">Tu primer journal</h1>
                  <p className="mt-2 text-subhead text-text-secondary">
                    Dale un nombre a tu journal. Podés tener varios más adelante.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-subhead text-text">Nombre del journal</label>
                  <input
                    type="text"
                    value={journalName}
                    onChange={(e) => setJournalName(e.target.value)}
                    placeholder="ej. Topstep's Journal"
                    autoFocus
                    className="w-full rounded-[8px] border border-input-border bg-inputBg px-4 py-2.5 text-subhead text-white placeholder:text-text-secondary/70 transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,226,97,0.15)]"
                  />
                </div>
              </>
            )}

            {/* ── Step 3: Configuración de capital ── */}
            {step === 3 && (
              <>
                <div className="mb-7">
                  <h1 className="text-title1 text-white">Configuración de capital</h1>
                  <p className="mt-2 text-subhead text-text-secondary">
                    Para que tus métricas sean precisas desde el primer día.
                  </p>
                </div>
                <div className="space-y-5">
                  <CurrencyInput
                    label="Capital original de la cuenta"
                    helper="Con cuánto abriste tu cuenta originalmente."
                    value={originCapital}
                    onChange={setOriginCapital}
                  />
                  <CurrencyInput
                    label="Balance actual al comenzar en Emerald"
                    helper="Tu balance real hoy, antes de tu primer trade registrado."
                    value={startCapital}
                    onChange={setStartCapital}
                  />

                  {/* Live preview */}
                  {origin > 0 && start > 0 && (
                    <div className="rounded-[10px] border border-divider bg-bg-surface/60 overflow-hidden">
                      <div className="grid grid-cols-3 divide-x divide-divider">
                        <div className="px-3 py-3">
                          <p className="text-[10px] text-text-secondary mb-1">Capital origen</p>
                          <p className="text-subhead font-semibold text-white">${fmtUSD(origin)}</p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[10px] text-text-secondary mb-1">Al iniciar Emerald</p>
                          <p className="text-subhead font-semibold text-white">${fmtUSD(start)}</p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[10px] text-text-secondary mb-1">Historial previo</p>
                          <p
                            className={[
                              'text-subhead font-semibold',
                              capitalState === 'profit' ? 'text-positive' : '',
                              capitalState === 'drawdown' ? 'text-negative' : '',
                              capitalState === 'neutral' ? 'text-text-secondary' : '',
                            ].join(' ')}
                          >
                            {capitalState === 'neutral'
                              ? '$0.00 (0%)'
                              : `${diff >= 0 ? '+' : ''}$${fmtUSD(Math.abs(diff))} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`}
                          </p>
                        </div>
                      </div>

                      {/* Contextual message */}
                      <div
                        className={[
                          'border-t border-divider px-4 py-2.5',
                          capitalState === 'profit' ? 'bg-positive/5' : '',
                          capitalState === 'drawdown' ? 'bg-negative/5' : '',
                          capitalState === 'neutral' ? 'bg-transparent' : '',
                        ].join(' ')}
                      >
                        <p
                          className={[
                            'text-caption leading-relaxed',
                            capitalState === 'profit' ? 'text-positive' : '',
                            capitalState === 'drawdown' ? 'text-negative' : '',
                            capitalState === 'neutral' ? 'text-text-secondary' : '',
                          ].join(' ')}
                        >
                          {capitalState === 'profit' &&
                            `Arrancás Emerald con un historial previo de +${diffPct.toFixed(2)}%. Tus métricas se calcularán desde tu balance actual.`}
                          {capitalState === 'drawdown' &&
                            `Estás iniciando en drawdown de ${Math.abs(diffPct).toFixed(2)}%. Emerald registrará tu recovery desde este punto.`}
                          {capitalState === 'neutral' &&
                            'Tu capital actual coincide con el origen. Las métricas arrancan desde cero.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Step 4: Confirmation ── */}
            {step === 4 && (
              <>
                <div className="mb-7">
                  <h1 className="text-title1 text-white">Todo listo</h1>
                  <p className="mt-2 text-subhead text-text-secondary">
                    Revisá tu configuración antes de entrar al dashboard.
                  </p>
                </div>
                <div className="rounded-[12px] border border-divider bg-bg-surface/60 divide-y divide-divider overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-caption text-text-secondary">Trader</span>
                    <span className="text-subhead text-white font-medium">
                      {sanitizeIdentifier(firstName, 50)} {sanitizeIdentifier(lastName, 50)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-caption text-text-secondary">Journal</span>
                    <span className="text-subhead text-white font-medium">
                      {sanitizeIdentifier(journalName, 80)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-caption text-text-secondary">Capital origen</span>
                    <span className="text-subhead text-white font-medium">${fmtUSD(origin)}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-caption text-text-secondary">Balance al iniciar</span>
                    <span
                      className={[
                        'text-subhead font-medium',
                        capitalState === 'profit' ? 'text-positive' : '',
                        capitalState === 'drawdown' ? 'text-negative' : '',
                        capitalState === 'neutral' ? 'text-white' : '',
                      ].join(' ')}
                    >
                      ${fmtUSD(start)}
                      {capitalState !== 'neutral' && (
                        <span className="ml-1.5 text-caption">
                          ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* ── Error ── */}
            {(localError || error) && (
              <p className="mt-4 text-caption text-negative">{localError || error}</p>
            )}

            {/* ── Navigation ── */}
            <div className={`mt-7 flex gap-3 ${step > 1 ? 'flex-row' : ''}`}>
              {step > 1 && step < 4 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 rounded-[8px] border border-input-border bg-transparent py-2.5 text-subhead font-medium text-text-secondary transition-all hover:border-text-secondary/50 hover:text-white"
                >
                  Atrás
                </button>
              )}

              {step < 4 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 rounded-[8px] border border-input-border bg-transparent py-2.5 text-subhead font-medium text-white transition-all hover:border-accent/70 hover:text-accent"
                >
                  Continuar
                </button>
              )}

              {step === 4 && (
                <>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 rounded-[8px] border border-input-border bg-transparent py-2.5 text-subhead font-medium text-text-secondary transition-all hover:border-text-secondary/50 hover:text-white"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-[2] rounded-[8px] border border-accent/60 bg-accent/10 py-2.5 text-subhead font-semibold text-accent transition-all hover:bg-accent/15 hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Ir al dashboard'}
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

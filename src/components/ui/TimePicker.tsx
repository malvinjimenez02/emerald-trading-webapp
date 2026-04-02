import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

function parse24h(time: string): { h12: number; min: number; period: 'AM' | 'PM' } {
  const [hStr, mStr] = (time || '00:00').split(':');
  const h24   = parseInt(hStr) || 0;
  const min   = parseInt(mStr) || 0;
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const h12   = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { h12, min, period };
}

function to24h(h12: number, min: number, period: 'AM' | 'PM'): string {
  let h24: number;
  if (period === 'AM') {
    h24 = h12 === 12 ? 0 : h12;
  } else {
    h24 = h12 === 12 ? 12 : h12 + 12;
  }
  return `${pad(h24)}:${pad(min)}`;
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

interface TimePickerProps {
  value: string;                  // "HH:MM" 24h
  onChange: (time: string) => void;
  disabled?: boolean;
  error?: boolean;
  tabIndex?: number;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  disabled,
  error,
  tabIndex,
}) => {
  const [open, setOpen] = useState(false);
  const ref     = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef  = useRef<HTMLDivElement>(null);

  const { h12, min, period } = parse24h(value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll selected items into view when opening
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      const scrollTo = (containerRef: React.RefObject<HTMLDivElement | null>) => {
        const sel = containerRef.current?.querySelector('[data-selected="true"]') as HTMLElement;
        if (sel && containerRef.current) {
          const top = sel.offsetTop - containerRef.current.clientHeight / 2 + sel.clientHeight / 2;
          containerRef.current.scrollTop = Math.max(0, top);
        }
      };
      scrollTo(hourRef);
      scrollTo(minRef);
    }, 0);
  }, [open]);

  const setHour   = (newH12: number)        => onChange(to24h(newH12, min, period));
  const setMinute = (newMin: number)        => onChange(to24h(h12, newMin, period));
  const setPeriod = (p: 'AM' | 'PM')        => onChange(to24h(h12, min, p));

  const displayTime = value ? `${h12}:${pad(min)} ${period}` : 'Select time';

  const borderStyle = error
    ? 'border-negative'
    : open
      ? 'border-accent ring-1 ring-accent/20'
      : 'border-divider hover:border-accent/40';

  return (
    <div ref={ref} className="relative flex-[1]">
      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        tabIndex={tabIndex}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 bg-bg rounded-[10px] border px-3 py-2.5 text-[14px] text-left
          transition-colors focus:outline-none
          ${disabled ? 'opacity-40 cursor-not-allowed border-divider' : borderStyle}`}
      >
        <Clock className="w-4 h-4 text-text-secondary shrink-0" />
        <span className={value ? 'text-text' : 'text-text-tertiary'}>{displayTime}</span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 rounded-xl border z-50 shadow-2xl"
          style={{
            backgroundColor: '#161B22',
            borderColor:     '#30363D',
            padding:         '12px',
            width:           '172px',
          }}
        >
          {/* AM / PM toggle */}
          <div className="flex gap-1.5 mb-3">
            {(['AM', 'PM'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className="flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
                style={
                  period === p
                    ? { backgroundColor: '#00C853', color: '#fff' }
                    : { backgroundColor: '#1C2333', color: '#8B949E', border: '1px solid #30363D' }
                }
              >
                {p}
              </button>
            ))}
          </div>

          {/* Hour : Minute columns */}
          <div className="flex gap-2">
            {/* Hours (1–12) */}
            <div
              ref={hourRef}
              className="flex-1 overflow-y-auto rounded-lg scrollbar-thin"
              style={{
                maxHeight:       '192px',
                backgroundColor: '#0D1117',
                border:          '1px solid #21262D',
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
                const isSelected = h === h12;
                return (
                  <div
                    key={h}
                    data-selected={isSelected}
                    onClick={() => setHour(h)}
                    className="text-center py-[7px] text-[13px] cursor-pointer transition-colors select-none"
                    style={
                      isSelected
                        ? { backgroundColor: '#00C853', color: '#fff', fontWeight: 600 }
                        : { color: '#C9D1D9' }
                    }
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#1C2333'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                  >
                    {h}
                  </div>
                );
              })}
            </div>

            {/* Minutes (00–59) */}
            <div
              ref={minRef}
              className="flex-1 overflow-y-auto rounded-lg"
              style={{
                maxHeight:       '192px',
                backgroundColor: '#0D1117',
                border:          '1px solid #21262D',
              }}
            >
              {Array.from({ length: 60 }, (_, i) => i).map(m => {
                const isSelected = m === min;
                return (
                  <div
                    key={m}
                    data-selected={isSelected}
                    onClick={() => setMinute(m)}
                    className="text-center py-[7px] text-[13px] cursor-pointer transition-colors select-none"
                    style={
                      isSelected
                        ? { backgroundColor: '#00C853', color: '#fff', fontWeight: 600 }
                        : { color: '#C9D1D9' }
                    }
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#1C2333'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                  >
                    {pad(m)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW    = ['Mo','Tu','We','Th','Fr','Sa','Su'];

const pad = (n: number) => String(n).padStart(2, '0');

// ─── DatePicker ───────────────────────────────────────────────────────────────

interface DatePickerProps {
  value: string;                  // "YYYY-MM-DD"
  onChange: (date: string) => void;
  disabled?: boolean;
  error?: boolean;
  tabIndex?: number;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  disabled,
  error,
  tabIndex,
  placeholder = 'Select date',
}) => {
  const [open, setOpen]           = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    value ? dayjs(value).startOf('month') : dayjs().startOf('month')
  );
  const ref = useRef<HTMLDivElement>(null);

  // Sync view month when value changes externally
  useEffect(() => {
    if (value) setViewMonth(dayjs(value).startOf('month'));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const today       = dayjs();
  const selectedDay = value ? dayjs(value) : null;

  // Build grid cells: null padding + day numbers
  const firstDow = viewMonth.startOf('month').isoWeekday(); // 1 = Mon
  const total    = viewMonth.daysInMonth();
  const cells: (number | null)[] = [
    ...Array(firstDow - 1).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayClick = (dayNum: number) => {
    const d = viewMonth.date(dayNum);
    onChange(`${d.year()}-${pad(d.month() + 1)}-${pad(d.date())}`);
    setOpen(false);
  };

  const displayLabel = selectedDay
    ? `${MONTHS[selectedDay.month()]} ${pad(selectedDay.date())}, ${selectedDay.year()}`
    : placeholder;

  // Button border style mirrors the existing inputClass logic
  const borderStyle = error
    ? 'border-negative focus:border-negative focus:ring-negative/30'
    : open
      ? 'border-accent ring-1 ring-accent/20'
      : 'border-divider hover:border-accent/40 focus:border-accent focus:ring-accent/20';

  return (
    <div ref={ref} className="relative flex-[2]">
      {/* ── Trigger button ── */}
      <button
        type="button"
        disabled={disabled}
        tabIndex={tabIndex}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 bg-bg rounded-[10px] border px-3 py-2.5 text-[14px] text-left
          transition-colors focus:outline-none
          ${disabled ? 'opacity-40 cursor-not-allowed border-divider' : borderStyle}
        `}
      >
        <Calendar className="w-4 h-4 text-text-secondary shrink-0" />
        <span className={selectedDay ? 'text-text' : 'text-text-tertiary'}>
          {displayLabel}
        </span>
      </button>

      {/* ── Dropdown calendar ── */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 rounded-xl border z-50 shadow-2xl"
          style={{
            backgroundColor: '#161B22',
            borderColor:     '#30363D',
            padding:         '14px',
            minWidth:        '252px',
          }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth(m => m.subtract(1, 'month'))}
              className="p-1 rounded-md transition-colors hover:bg-[#1C2333]"
              style={{ color: '#8B949E' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-semibold" style={{ color: '#C9D1D9' }}>
              {MONTHS[viewMonth.month()]} {viewMonth.year()}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(m => m.add(1, 'month'))}
              className="p-1 rounded-md transition-colors hover:bg-[#1C2333]"
              style={{ color: '#8B949E' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map(l => (
              <div
                key={l}
                className="text-center py-1 text-[11px] font-medium"
                style={{ color: '#555' }}
              >
                {l}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((dayNum, i) => {
              if (dayNum === null) return <div key={`pad-${i}`} />;

              const d          = viewMonth.date(dayNum);
              const isSelected = !!selectedDay && d.isSame(selectedDay, 'day');
              const isToday    = d.isSame(today, 'day');

              let cls   = 'text-center text-[13px] py-[7px] rounded-md select-none transition-colors cursor-pointer ';
              let style: React.CSSProperties = {};

              if (isSelected) {
                cls  += 'font-semibold text-white';
                style = { backgroundColor: '#00C853' };
              } else if (isToday) {
                cls  += 'hover:bg-[#1C2333]';
                style = { color: '#C9D1D9', border: '1px solid #30363D' };
              } else {
                cls  += 'hover:bg-[#1C2333]';
                style = { color: '#C9D1D9' };
              }

              return (
                <div
                  key={dayNum}
                  className={cls}
                  style={style}
                  onClick={() => handleDayClick(dayNum)}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { useDateFilterStore } from '../../stores/useDateFilterStore';

dayjs.extend(isoWeek);
dayjs.extend(isBetween);

// ─── Formatting helpers ───────────────────────────────────────────────────────

const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDay(d: dayjs.Dayjs): string {
  return `${M[d.month()]} ${d.date()}`;
}

function fmtRange(start: dayjs.Dayjs, end: dayjs.Dayjs): string {
  const curYear = dayjs().year();
  const crossYear = start.year() !== end.year();
  const yearSuffix = (year: number) => year !== curYear ? `, ${year}` : '';

  if (crossYear) {
    return `${fmtDay(start)}${yearSuffix(start.year())} - ${fmtDay(end)}, ${end.year()}`;
  }
  const suffix = yearSuffix(start.year());
  if (start.month() === end.month()) {
    return `${M[start.month()]} ${start.date()} - ${end.date()}${suffix}`;
  }
  return `${fmtDay(start)} - ${fmtDay(end)}${suffix}`;
}

// ─── Preset config ────────────────────────────────────────────────────────────

const PRESET_KEYS = [
  'all_time', 'today', 'yesterday', 'this_week', 'last_week',
  'this_month', 'last_month', 'last_90_days', 'year_to_date',
] as const;

const PRESET_LABELS: Record<string, string> = {
  all_time:     'All time',
  today:        'Today',
  yesterday:    'Yesterday',
  this_week:    'This week',
  last_week:    'Last week',
  this_month:   'This month',
  last_month:   'Last month',
  last_90_days: 'Last 90 days',
  year_to_date: 'Year to date',
  custom:       'Custom',
};

function buildHints(): Record<string, string> {
  const now = dayjs();
  const lw = now.subtract(1, 'week');
  const lm = now.subtract(1, 'month');
  return {
    all_time:     'No filter',
    today:        fmtDay(now),
    yesterday:    fmtDay(now.subtract(1, 'day')),
    this_week:    fmtRange(now.startOf('isoWeek'), now),
    last_week:    fmtRange(lw.startOf('isoWeek'), lw.endOf('isoWeek')),
    this_month:   fmtRange(now.startOf('month'), now),
    last_month:   fmtRange(lm.startOf('month'), lm.endOf('month')),
    last_90_days: fmtRange(now.subtract(90, 'day').startOf('day'), now),
    year_to_date: fmtRange(now.startOf('year'), now),
    custom:       'Pick dates',
  };
}

// ─── Month calendar ───────────────────────────────────────────────────────────

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface MonthGridProps {
  month: dayjs.Dayjs;
  pendingStart: dayjs.Dayjs | null;
  pendingEnd:   dayjs.Dayjs | null;
  hoverDate:    dayjs.Dayjs | null;
  onDayClick:   (d: dayjs.Dayjs) => void;
  onDayHover:   (d: dayjs.Dayjs | null) => void;
}

const MonthGrid: React.FC<MonthGridProps> = ({
  month, pendingStart, pendingEnd, hoverDate, onDayClick, onDayHover,
}) => {
  const today    = dayjs();
  const firstDow = month.startOf('month').isoWeekday(); // 1=Mon
  const total    = month.daysInMonth();

  // Build sparse array: nulls for padding, then 1..total
  const cells: (number | null)[] = [
    ...Array(firstDow - 1).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null);

  const getState = useCallback((dayNum: number) => {
    const d = month.date(dayNum);
    const isFuture  = d.isAfter(today, 'day');
    const isToday   = d.isSame(today, 'day');
    const isStart   = !!pendingStart && d.isSame(pendingStart, 'day');
    const isEnd     = !!pendingEnd   && d.isSame(pendingEnd,   'day');
    let inRange = false;
    if (pendingStart) {
      const eff = pendingEnd ?? hoverDate;
      if (eff) {
        const [rs, re] = pendingStart.isBefore(eff, 'day')
          ? [pendingStart, eff] : [eff, pendingStart];
        inRange = d.isAfter(rs, 'day') && d.isBefore(re, 'day');
      }
    }
    return { isFuture, isToday, isStart, isEnd, inRange };
  }, [month, today, pendingStart, pendingEnd, hoverDate]);

  return (
    <div className="grid grid-cols-7">
      {DOW.map(l => (
        <div key={l} className="text-center py-1 text-[11px] font-medium" style={{ color: '#555' }}>
          {l}
        </div>
      ))}
      {cells.map((dayNum, i) => {
        if (dayNum === null) return <div key={`pad-${i}`} />;
        const { isFuture, isToday, isStart, isEnd, inRange } = getState(dayNum);
        const isEndpoint = isStart || isEnd;

        let cls = 'text-center text-[13px] py-[7px] rounded-md select-none transition-colors ';
        let style: React.CSSProperties = {};

        if (isEndpoint) {
          cls += 'font-semibold text-white cursor-pointer ';
          style.backgroundColor = '#00C853';
        } else if (inRange) {
          cls += 'cursor-pointer ';
          style.color = '#00C853';
          style.backgroundColor = '#00C85320';
        } else if (isFuture) {
          cls += 'cursor-default ';
          style.color = '#3a3a3a';
        } else {
          cls += 'cursor-pointer hover:bg-[#1C2333] ';
          style.color = '#C9D1D9';
          if (isToday) {
            cls += 'border border-[#30363D] ';
          }
        }

        return (
          <div
            key={dayNum}
            className={cls}
            style={style}
            onClick={() => !isFuture && onDayClick(month.date(dayNum))}
            onMouseEnter={() => !isFuture && onDayHover(month.date(dayNum))}
            onMouseLeave={() => onDayHover(null)}
          >
            {dayNum}
          </div>
        );
      })}
    </div>
  );
};

// ─── Dual calendar ────────────────────────────────────────────────────────────

interface DualCalendarProps {
  initialStart: string | null;
  initialEnd:   string | null;
  onApply:      (start: string, end: string) => void;
  onCancel:     () => void;
}

const DualCalendar: React.FC<DualCalendarProps> = ({
  initialStart, initialEnd, onApply, onCancel,
}) => {
  const today = dayjs();
  // rightMonth = current month by default; leftMonth is always rightMonth - 1
  const [rightMonth, setRightMonth] = useState(today.startOf('month'));
  const leftMonth = rightMonth.subtract(1, 'month');

  const [pendingStart, setPendingStart] = useState<dayjs.Dayjs | null>(
    initialStart ? dayjs(initialStart) : null
  );
  const [pendingEnd, setPendingEnd] = useState<dayjs.Dayjs | null>(
    initialEnd ? dayjs(initialEnd) : null
  );
  const [hoverDate, setHoverDate] = useState<dayjs.Dayjs | null>(null);

  const handleDayClick = (d: dayjs.Dayjs) => {
    if (!pendingStart || (pendingStart && pendingEnd)) {
      // Start fresh selection
      setPendingStart(d);
      setPendingEnd(null);
    } else {
      // Complete the range (auto-sort)
      if (d.isBefore(pendingStart, 'day')) {
        setPendingEnd(pendingStart);
        setPendingStart(d);
      } else {
        setPendingEnd(d);
      }
      setHoverDate(null);
    }
  };

  const rangeLabel = useMemo(() => {
    if (!pendingStart) return 'Select start date';
    if (!pendingEnd)   return fmtDay(pendingStart);
    return `${fmtDay(pendingStart)} — ${fmtDay(pendingEnd)}`;
  }, [pendingStart, pendingEnd]);

  const canApply = !!pendingStart && !!pendingEnd;

  const handleApply = () => {
    if (canApply) {
      onApply(
        pendingStart!.startOf('day').toISOString(),
        pendingEnd!.endOf('day').toISOString(),
      );
    }
  };

  const monthGridProps = {
    pendingStart,
    pendingEnd,
    hoverDate,
    onDayClick: handleDayClick,
    onDayHover: setHoverDate,
  };

  const monthTitle = (m: dayjs.Dayjs) => (
    <span className="text-[13px] font-semibold" style={{ color: '#C9D1D9' }}>
      {M[m.month()]} {m.year()}
    </span>
  );

  return (
    <div style={{ minWidth: 540 }}>
      <div className="flex gap-8">
        {/* Left calendar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setRightMonth(m => m.subtract(1, 'month'))}
              className="p-1 rounded-md hover:bg-[#1C2333] transition-colors"
              style={{ color: '#8B949E' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {monthTitle(leftMonth)}
            <div className="w-6" /> {/* balance spacer */}
          </div>
          <MonthGrid month={leftMonth} {...monthGridProps} />
        </div>

        {/* Divider */}
        <div className="w-px self-stretch" style={{ backgroundColor: '#30363D' }} />

        {/* Right calendar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="w-6" /> {/* balance spacer */}
            {monthTitle(rightMonth)}
            <button
              onClick={() => setRightMonth(m => m.add(1, 'month'))}
              className="p-1 rounded-md hover:bg-[#1C2333] transition-colors"
              style={{ color: '#8B949E' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <MonthGrid month={rightMonth} {...monthGridProps} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid #21262D' }}>
        <span className="text-[13px]" style={{ color: '#8B949E' }}>{rangeLabel}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[13px] rounded-lg transition-colors hover:bg-[#1C2333]"
            style={{ color: '#8B949E', border: '1px solid #30363D' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className="px-3 py-1.5 text-[13px] font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default"
            style={{ backgroundColor: '#00C853' }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── DateFilterDropdown ───────────────────────────────────────────────────────

export const DateFilterDropdown: React.FC = () => {
  const { preset, startDate, endDate, setPreset, setCustomRange } = useDateFilterStore();
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState<'presets' | 'calendar'>('presets');
  const ref               = useRef<HTMLDivElement>(null);

  // Compute hints once per open
  const hints = useMemo(buildHints, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView('presets');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = () => {
    if (open) setView('presets');
    setOpen(o => !o);
  };

  const handlePreset = (key: string) => {
    if (key === 'custom') { setView('calendar'); return; }
    setPreset(key);
    setOpen(false);
  };

  const handleApply = (start: string, end: string) => {
    setCustomRange(start, end);
    setOpen(false);
    setView('presets');
  };

  // Date chip label (shown when not all_time)
  const dateChipLabel = useMemo(() => {
    if (preset === 'all_time' || !startDate || !endDate) return null;
    return fmtRange(dayjs(startDate), dayjs(endDate));
  }, [preset, startDate, endDate]);

  const chipStyle: React.CSSProperties = {
    borderColor: '#00C853',
    color: '#00C853',
    backgroundColor: '#00C85319',
  };

  return (
    <div ref={ref} className="relative flex items-center gap-2">

      {/* ── Date range chip (only when a filter is active) ── */}
      {dateChipLabel && (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-opacity hover:opacity-80"
          style={chipStyle}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{dateChipLabel}</span>
        </button>
      )}

      {/* ── Preset chip / trigger ── */}
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-opacity hover:opacity-80"
        style={chipStyle}
      >
        <span>{PRESET_LABELS[preset] ?? 'Filter'}</span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute top-full right-0 mt-2 rounded-xl border z-50 shadow-2xl overflow-hidden"
          style={{
            backgroundColor: '#161B22',
            borderColor: '#30363D',
            minWidth: view === 'calendar' ? 'auto' : 280,
            padding: view === 'calendar' ? '16px' : '6px',
          }}
        >
          {view === 'presets' ? (
            /* ── Preset list ── */
            <>
              {PRESET_KEYS.map(key => {
                const isActive = preset === key;
                return (
                  <button
                    key={key}
                    onClick={() => handlePreset(key)}
                    className={`w-full flex items-center justify-between rounded-lg text-left transition-colors ${!isActive ? 'hover:bg-[#1C2333]' : ''}`}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: isActive ? '#00C85315' : undefined,
                    }}
                  >
                    <span className="text-[13px]" style={{ color: isActive ? '#00C853' : '#C9D1D9' }}>
                      {PRESET_LABELS[key]}
                    </span>
                    <span className="text-[11px] ml-8" style={{ color: '#555' }}>
                      {hints[key]}
                    </span>
                  </button>
                );
              })}

              {/* Separator */}
              <div className="my-1" style={{ height: 1, backgroundColor: '#30363D', margin: '4px 6px' }} />

              {/* Custom range row */}
              {(() => {
                const isActive = preset === 'custom';
                return (
                  <button
                    onClick={() => handlePreset('custom')}
                    className={`w-full flex items-center justify-between rounded-lg text-left transition-colors ${!isActive ? 'hover:bg-[#1C2333]' : ''}`}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: isActive ? '#00C85315' : undefined,
                    }}
                  >
                    <span
                      className="text-[13px] flex items-center gap-1.5"
                      style={{ color: isActive ? '#00C853' : '#C9D1D9' }}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Custom range…
                    </span>
                    <span className="text-[11px] ml-8" style={{ color: '#555' }}>Pick dates</span>
                  </button>
                );
              })()}
            </>
          ) : (
            /* ── Dual calendar ── */
            <DualCalendar
              initialStart={preset === 'custom' ? startDate : null}
              initialEnd={preset === 'custom' ? endDate : null}
              onApply={handleApply}
              onCancel={() => setView('presets')}
            />
          )}
        </div>
      )}
    </div>
  );
};

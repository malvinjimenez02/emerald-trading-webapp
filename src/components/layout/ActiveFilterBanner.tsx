import React from 'react';
import dayjs from 'dayjs';
import { useDateFilterStore } from '../../stores/useDateFilterStore';

const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtRange(start: dayjs.Dayjs, end: dayjs.Dayjs): string {
  const curYear = dayjs().year();
  const crossYear = start.year() !== end.year();
  const yearSuffix = (y: number) => y !== curYear ? `, ${y}` : '';
  const d = (x: dayjs.Dayjs) => `${M[x.month()]} ${x.date()}`;
  if (crossYear) return `${d(start)}${yearSuffix(start.year())} - ${d(end)}, ${end.year()}`;
  const suffix = yearSuffix(start.year());
  if (start.month() === end.month()) return `${M[start.month()]} ${start.date()} - ${end.date()}${suffix}`;
  return `${d(start)} - ${d(end)}${suffix}`;
}

export const ActiveFilterBanner: React.FC = () => {
  const { preset, startDate, endDate, setPreset } = useDateFilterStore();

  if (preset === 'all_time' || !startDate || !endDate) return null;

  const label = fmtRange(dayjs(startDate), dayjs(endDate));

  return (
    <div className="flex items-center gap-2 bg-accent/5 border border-accent/20 rounded-lg px-3 py-2 text-sm">
      <span className="text-text-secondary">Showing data for</span>
      <span className="text-accent font-medium">{label}</span>
      <button
        onClick={() => setPreset('all_time')}
        className="text-text-secondary underline ml-1 text-xs hover:text-text transition-colors"
      >
        Clear
      </button>
    </div>
  );
};

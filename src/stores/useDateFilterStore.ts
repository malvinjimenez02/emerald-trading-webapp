import { create } from 'zustand';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import type { Trade } from '../types/trade';

// Extend dayjs with necessary plugins
import { getTradeDate } from '../utils/formatters';

dayjs.extend(isoWeek);
dayjs.extend(isBetween);

export interface DateFilterState {
  preset: string;
  startDate: string | null;
  endDate: string | null;
  setPreset: (preset: string) => void;
  setCustomRange: (start: string, end: string) => void;
  getFilteredTrades: (trades: Trade[]) => Trade[];
}

export const useDateFilterStore = create<DateFilterState>((set, get) => ({
  preset: 'all_time',
  startDate: null,
  endDate: null,

  setPreset: (preset) => {
    let start: dayjs.Dayjs | null = null;
    let end: dayjs.Dayjs | null = null;
    const now = dayjs();

    switch (preset) {
      case 'today':
        start = now.startOf('day');
        end = now.endOf('day');
        break;
      case 'yesterday':
        const yesterday = now.subtract(1, 'day');
        start = yesterday.startOf('day');
        end = yesterday.endOf('day');
        break;
      case 'this_week':
        start = now.startOf('isoWeek');
        end = now;
        break;
      case 'last_week':
        const lastWeek = now.subtract(1, 'week');
        start = lastWeek.startOf('isoWeek');
        end = lastWeek.endOf('isoWeek');
        break;
      case 'this_month':
        start = now.startOf('month');
        end = now;
        break;
      case 'last_month':
        const lastMonth = now.subtract(1, 'month');
        start = lastMonth.startOf('month');
        end = lastMonth.endOf('month');
        break;
      case 'last_90_days':
        start = now.subtract(90, 'day').startOf('day');
        end = now;
        break;
      case 'year_to_date':
        start = now.startOf('year');
        end = now;
        break;
      case 'all_time':
      default:
        start = null;
        end = null;
        break;
    }

    set({
      preset,
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
    });
  },

  setCustomRange: (start, end) => {
    set({
      preset: 'custom',
      startDate: start,
      endDate: end,
    });
  },

  getFilteredTrades: (trades) => {
    const { startDate, endDate, preset } = get();

    if (preset === 'all_time' || !startDate || !endDate) {
      return trades;
    }

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    return trades.filter((trade) => {
      const tradeDate = dayjs(getTradeDate(trade));
      
      // Use isBetween with inclusive bounds '[]'
      return tradeDate.isBetween(start, end, null, '[]');
    });
  },
}));

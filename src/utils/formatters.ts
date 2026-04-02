// TODO: Display formatters for currency, percentages, dates, and trade fields

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Trade } from '../types/trade';

dayjs.extend(relativeTime);

export function getTradeDate(trade: Trade): string {
  return trade.entryDate ?? trade.createdAt;
}

export function getTradeCloseDate(trade: Trade): string {
  return trade.closeDate ?? trade.closedAt ?? getTradeDate(trade);
}

export function formatCurrency(
  value: number,
  currency: string = 'USD',
  compact: boolean = false
): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  };
  return new Intl.NumberFormat('en-US', options).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatPnl(value: number, currency: string = 'USD'): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCurrency(value, currency)}`;
}

export function formatDate(isoString: string, format: string = 'MMM D, YYYY'): string {
  return dayjs(isoString).format(format);
}

export function formatDateTime(isoString: string): string {
  return dayjs(isoString).format('MMM D, YYYY h:mm A');
}

export function formatRelativeTime(isoString: string): string {
  return dayjs(isoString).fromNow();
}

export function formatRR(rr: number): string {
  return `${rr.toFixed(2)}R`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export function formatWinRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

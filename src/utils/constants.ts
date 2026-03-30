// TODO: App-wide constants — limits, defaults, and configuration values

export const APP_NAME = 'Emerald Trading';
export const APP_VERSION = '1.0.0';

// Database
export const DB_NAME = 'emerald.db';
export const DB_SCHEMA_VERSION = 1;

// Sync
export const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const SYNC_RETRY_DELAY_MS = 30 * 1000;  // 30 seconds
export const MAX_SYNC_RETRIES = 3;

// Pagination
export const TRADES_PAGE_SIZE = 50;

// Trade defaults
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_ACCOUNT_TYPE = 'demo';

// Common symbols for quick select
export const COMMON_SYMBOLS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
  'AUD/USD', 'USD/CAD', 'NZD/USD',
  'BTC/USD', 'ETH/USD',
  'SPX', 'NQ', 'ES', 'GC', 'CL',
];

// Common strategies for quick select
export const COMMON_STRATEGIES = [
  'Breakout',
  'Trend Following',
  'Mean Reversion',
  'Support/Resistance',
  'Moving Average',
  'News Play',
  'Scalp',
  'Swing',
];

// Validation limits
export const MAX_SYMBOL_LENGTH = 10;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_TAGS_PER_TRADE = 10;
export const MAX_IMAGES_PER_TRADE = 5;

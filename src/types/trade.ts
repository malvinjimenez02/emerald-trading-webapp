export enum TradeDirection { Long = 'long', Short = 'short' }
export enum TradeResult { Win = 'win', Loss = 'loss', Open = 'open' }
export enum TradeStatus { Open = 'open', Closed = 'closed' }

export interface Trade {
  id: string;           // UUID
  assetName: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  exitPrice?: number;
  result: TradeResult;
  rValue?: number;
  pnlAmount?: number;   // USD P&L
  status: TradeStatus;
  notes?: string;
  screenshotUri?: string;
  entryDate: string | null;   // ISO 8601 — cuándo se abrió la posición
  closeDate: string | null;   // ISO 8601 — cuándo se cerró la posición
  createdAt: string;    // ISO date string
  closedAt?: string;
  synced: boolean;
}

export interface TradeFormData {
  assetName: string;
  direction: TradeDirection;
  entryDate: string;   // "YYYY-MM-DD"
  entryTime: string;   // "HH:MM"
  closeDate: string;   // "YYYY-MM-DD"
  closeTime: string;   // "HH:MM"
  entryPrice: string;  // string porque viene del input
  stopLoss: string;
  takeProfit: string;
  exitPrice: string;
  result: TradeResult;
  pnlAmount: string;   // USD P&L input
  notes: string;
  screenshotUri: string;
}

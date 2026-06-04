export enum TradeDirection { Long = 'long', Short = 'short' }
export enum TradeResult { Win = 'win', Loss = 'loss', Open = 'open' }
export enum TradeStatus { Open = 'open', Closed = 'closed' }

export type InstrumentType = 'spot_futures' | 'options'
export type OptionType = 'call' | 'put'
export type OptionStrategy =
  | 'long_call'
  | 'long_put'
  | 'covered_call'
  | 'cash_secured_put'
  | 'bull_call_spread'
  | 'bear_put_spread'
  | 'iron_condor'
  | 'straddle'
  | 'strangle'
  | 'other'

export type OptionCloseType =
  | 'sold'
  | 'exercised'
  | 'expired_otm'
  | 'assigned'
  | 'stop_hit'

export interface OptionGreeks {
  delta?: number
  theta?: number
  iv?: number
  dte?: number
}

export interface Trade {
  id: string;
  assetName: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  exitPrice?: number;
  result: TradeResult;
  rValue?: number;
  pnlAmount?: number;
  status: TradeStatus;
  notes?: string;
  screenshotUri?: string;
  entryDate: string | null;
  closeDate: string | null;
  createdAt: string;
  closedAt?: string;
  synced: boolean;
  // Options support
  instrumentType: InstrumentType;
  optionType?: OptionType;
  strike?: number;
  expirationDate?: string;
  contracts?: number;
  premiumEntry?: number;
  premiumExit?: number;
  stopLossPct?: number;
  strategy?: OptionStrategy;
  closeType?: OptionCloseType;
  greeks?: OptionGreeks;
}

export interface TradeFormData {
  assetName: string;
  direction: TradeDirection;
  entryDate: string;
  entryTime: string;
  closeDate: string;
  closeTime: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  exitPrice: string;
  result: TradeResult;
  pnlAmount: string;
  notes: string;
  screenshotUri: string;
  // Options fields
  instrumentType: InstrumentType;
  optionType: OptionType | '';
  strike: string;
  expirationDate: string;
  contracts: string;
  premiumEntry: string;
  premiumExit: string;
  stopLossPct: string;
  strategy: OptionStrategy | '';
  closeType: OptionCloseType | '';
  deltaEntry: string;
  thetaEntry: string;
  ivEntry: string;
  dteEntry: string;
}

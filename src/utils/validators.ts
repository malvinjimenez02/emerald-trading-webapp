import type { TradeFormData } from '../types/trade';
import { TradeDirection } from '../types/trade';
import type { AccountConfig } from '../types/account';

export type ValidationResult = { valid: true } | { valid: false; errors: Record<string, string> };

export function validateTradeForm(input: Partial<TradeFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.assetName || input.assetName.trim().length === 0) {
    errors.assetName = 'Asset name is required';
  }

  if (!input.direction) {
    errors.direction = 'Direction is required';
  }

  const entry = parseFloat(input.entryPrice ?? '');
  const sl = parseFloat(input.stopLoss ?? '');

  if (isNaN(entry) || entry <= 0) {
    errors.entryPrice = 'Entry price must be greater than 0';
  }

  if (isNaN(sl) || sl <= 0) {
    errors.stopLoss = 'Stop loss must be greater than 0';
  }

  if (!isNaN(entry) && !isNaN(sl)) {
    if (input.direction === TradeDirection.Long && sl >= entry) {
      errors.stopLoss = 'SL must be below entry for Long';
    }
    if (input.direction === TradeDirection.Short && sl <= entry) {
      errors.stopLoss = 'SL must be above entry for Short';
    }
  }

  const tp = input.takeProfit ? parseFloat(input.takeProfit) : undefined;
  if (tp !== undefined && !isNaN(tp) && !isNaN(entry)) {
    if (input.direction === TradeDirection.Long && tp <= entry) {
      errors.takeProfit = 'TP must be above entry for Long';
    }
    if (input.direction === TradeDirection.Short && tp >= entry) {
      errors.takeProfit = 'TP must be below entry for Short';
    }
  }

  const ep = input.exitPrice ? parseFloat(input.exitPrice) : undefined;
  if (ep !== undefined && (isNaN(ep) || ep <= 0)) {
    errors.exitPrice = 'Exit price must be greater than 0';
  }

  if (input.entryDate && input.closeDate && input.result !== 'open') {
    const entryDT = new Date(`${input.entryDate}T${input.entryTime || '00:00'}:00`);
    const closeDT = new Date(`${input.closeDate}T${input.closeTime || '00:00'}:00`);
    if (!isNaN(entryDT.getTime()) && !isNaN(closeDT.getTime()) && closeDT < entryDT) {
      errors.closeDate = 'Close date cannot be before entry date';
    }
  }

  return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
}

export function validateAccountConfig(input: Partial<AccountConfig>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.journalName || input.journalName.trim().length === 0) {
    errors.journalName = 'Journal name is required';
  }

  if (input.initialCapital === undefined || isNaN(input.initialCapital) || input.initialCapital <= 0) {
    errors.initialCapital = 'Initial capital must be greater than 0';
  }

  if (input.riskPerTrade === undefined || isNaN(input.riskPerTrade) || input.riskPerTrade <= 0) {
    errors.riskPerTrade = 'Risk per trade must be greater than 0';
  }

  if (!input.currency || input.currency.trim().length === 0) {
    errors.currency = 'Currency is required';
  }

  return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
}

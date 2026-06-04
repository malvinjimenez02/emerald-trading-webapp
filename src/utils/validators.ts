import type { TradeFormData } from '../types/trade';
import { TradeDirection } from '../types/trade';
import type { AccountConfig } from '../types/account';
import { cleanParse } from './numbers';

// ---------------------------------------------------------------------------
// Input sanitization & generic validators
// ---------------------------------------------------------------------------

/** Strips leading/trailing whitespace and enforces a maximum length. */
export function sanitizeText(value: string, maxLength = 500): string {
  return value.trim().slice(0, maxLength);
}

/** Removes characters that are dangerous in SQL / NoSQL / template contexts. */
export function sanitizeIdentifier(value: string, maxLength = 100): string {
  return value
    .trim()
    .replace(/[<>"'`;\\]/g, '')
    .slice(0, maxLength);
}

/** Returns true only if the string is a well-formed e-mail address. */
export function isValidEmail(email: string): boolean {
  const RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return RE.test(email.trim()) && email.trim().length <= 254;
}

/**
 * Password strength rules:
 *   - At least 8 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one digit
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number' };
  return { valid: true };
}

/** Validates a human name (first or last): letters, spaces, hyphens, apostrophes only. */
export function validateName(name: string, field = 'Name'): { valid: boolean; message?: string } {
  const clean = name.trim();
  if (clean.length === 0) return { valid: false, message: `${field} is required` };
  if (clean.length > 50) return { valid: false, message: `${field} must be 50 characters or less` };
  // Avoid Unicode property escapes (`\p{L}`) so older JS runtimes don't crash during module parse.
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(clean)) return { valid: false, message: `${field} contains invalid characters` };
  return { valid: true };
}

/** Validates a journal / workspace name: printable chars, no SQL-injection suspects. */
export function validateJournalName(name: string): { valid: boolean; message?: string } {
  const clean = name.trim();
  if (clean.length === 0) return { valid: false, message: 'Journal name is required' };
  if (clean.length > 80) return { valid: false, message: 'Journal name must be 80 characters or less' };
  if (/[<>"'`;\\]/.test(clean)) return { valid: false, message: 'Journal name contains invalid characters' };
  return { valid: true };
}

export type ValidationResult = { valid: true } | { valid: false; errors: Record<string, string> };

export function validateTradeForm(input: Partial<TradeFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.assetName || input.assetName.trim().length === 0) {
    errors.assetName = 'Asset name is required';
  }

  if (!input.direction) {
    errors.direction = 'Direction is required';
  }

  // ── Options validation ────────────────────────────────────────────────────
  if (input.instrumentType === 'options') {
    if (!input.optionType) {
      errors.optionType = 'Selecciona Call o Put';
    }
    const strike = input.strike ? cleanParse(input.strike) : NaN;
    if (isNaN(strike) || strike <= 0) {
      errors.strike = 'El strike es requerido';
    }
    if (!input.expirationDate) {
      errors.expirationDate = 'La fecha de expiración es requerida';
    }
    if (input.expirationDate && input.entryDate && input.expirationDate < input.entryDate) {
      errors.expirationDate = 'La expiración debe ser posterior a la entrada';
    }
    const contracts = input.contracts ? parseInt(input.contracts) : NaN;
    if (isNaN(contracts) || contracts < 1) {
      errors.contracts = 'Mínimo 1 contrato';
    }
    const premiumEntry = cleanParse(input.premiumEntry);
    if (isNaN(premiumEntry) || premiumEntry <= 0) {
      errors.premiumEntry = 'El premium de entrada es requerido';
    }
    return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
  }

  // ── Spot / Futures validation ─────────────────────────────────────────────
  const entry = cleanParse(input.entryPrice);
  const sl = cleanParse(input.stopLoss);

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

  const tp = input.takeProfit ? cleanParse(input.takeProfit) : undefined;
  if (tp !== undefined && !isNaN(tp) && tp <= 0) {
    errors.takeProfit = 'Take profit must be greater than 0';
  }

  const ep = input.exitPrice ? cleanParse(input.exitPrice) : undefined;
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

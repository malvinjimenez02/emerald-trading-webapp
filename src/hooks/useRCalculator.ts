import type { InstrumentType } from '../types/trade';

interface RCalculatorResult {
  oneR: number | null           // valor absoluto de 1R en puntos/pips
  rrPlanned: number | null      // R:R planeado (requiere takeProfit)
  rExecuted: number | null      // R ejecutado (requiere exitPrice o premiumExit)
  duration: string | null       // "Xh Ym"
  isReady: boolean
}

interface OptionsConfig {
  premiumEntry: number | null
  premiumExit: number | null
  stopLossPct: number | null    // % del premium como stop (ej: 50)
  contracts: number | null
}

function calcDuration(entryDateTime: Date | null, closeDateTime: Date | null): string | null {
  if (!entryDateTime || !closeDateTime || closeDateTime < entryDateTime) return null;
  const mins = Math.round((closeDateTime.getTime() - entryDateTime.getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function useRCalculator(
  directionStr: 'long' | 'short' | null,
  entryPrice: number | null,
  stopLoss: number | null,
  takeProfit: number | null,
  exitPrice: number | null,
  entryDateTime: Date | null,
  closeDateTime: Date | null,
  instrumentType?: InstrumentType,
  optionsConfig?: OptionsConfig
): RCalculatorResult {
  const duration = calcDuration(entryDateTime, closeDateTime);

  // ── Options path ──────────────────────────────────────────────────────────
  if (instrumentType === 'options' && optionsConfig) {
    const { premiumEntry, premiumExit, stopLossPct, contracts } = optionsConfig;

    const pe = (premiumEntry !== null && premiumEntry > 0) ? premiumEntry : null;
    const numContracts = (contracts !== null && contracts >= 1) ? contracts : 1;

    let stopPrice: number | null = null;
    if (pe !== null) {
      if (stopLossPct !== null && stopLossPct > 0 && stopLossPct < 100) {
        stopPrice = pe * (1 - stopLossPct / 100);
      } else if (stopLoss !== null && stopLoss > 0 && stopLoss < pe) {
        stopPrice = stopLoss;
      }
    }

    let oneR: number | null = null;
    if (pe !== null && stopPrice !== null) {
      const riskPerShare = pe - stopPrice;
      if (riskPerShare > 0) oneR = riskPerShare * 100 * numContracts;
    }

    let rrPlanned: number | null = null;
    if (oneR !== null && pe !== null && stopPrice !== null && takeProfit !== null && takeProfit > 0) {
      const riskPerShare = pe - stopPrice;
      const rawRR = (takeProfit - pe) / riskPerShare;
      if (rawRR > 0) rrPlanned = Math.round(rawRR * 100) / 100;
    }

    let rExecuted: number | null = null;
    if (oneR !== null && pe !== null && stopPrice !== null && premiumExit !== null && premiumExit > 0) {
      const riskPerShare = pe - stopPrice;
      rExecuted = Math.round(((premiumExit - pe) / riskPerShare) * 100) / 100;
    }

    return { oneR, rrPlanned, rExecuted, duration, isReady: oneR !== null };
  }

  // ── Spot / Futures path (unchanged) ───────────────────────────────────────
  const ep = (entryPrice !== null && entryPrice > 0) ? entryPrice : null;
  const sl = (stopLoss !== null && stopLoss > 0) ? stopLoss : null;
  const tp = (takeProfit !== null && takeProfit > 0) ? takeProfit : null;
  const xp = (exitPrice !== null && exitPrice > 0) ? exitPrice : null;

  let oneR: number | null = null;
  if (ep !== null && sl !== null && ep !== sl) {
    oneR = Math.abs(ep - sl);
  }

  let rrPlanned: number | null = null;
  if (oneR !== null && tp !== null && directionStr !== null) {
    const rawRR = directionStr === 'long'
      ? (tp - ep!) / oneR
      : (ep! - tp) / oneR;
    if (rawRR > 0) rrPlanned = Math.round(rawRR * 100) / 100;
  }

  let rExecuted: number | null = null;
  if (oneR !== null && xp !== null && directionStr !== null) {
    const rawR = directionStr === 'long'
      ? (xp - ep!) / oneR
      : (ep! - xp) / oneR;
    rExecuted = Math.round(rawR * 100) / 100;
  }

  return { oneR, rrPlanned, rExecuted, duration, isReady: oneR !== null };
}

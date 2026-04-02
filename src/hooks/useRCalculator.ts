import { TradeResult } from '../types/trade';

interface RCalculatorResult {
  oneR: number | null           // valor absoluto de 1R en puntos/pips
  rrPlanned: number | null      // R:R planeado (requiere takeProfit)
  rExecuted: number | null      // R ejecutado (requiere exitPrice)
  duration: string | null       // "Xh Ym" calculado desde entryDateTime y closeDateTime
  isReady: boolean              // true si al menos oneR está calculado
}

export function useRCalculator(
  directionStr: 'long' | 'short' | null,
  entryPrice: number | null,
  stopLoss: number | null,
  takeProfit: number | null,
  exitPrice: number | null,
  entryDateTime: Date | null,
  closeDateTime: Date | null
): RCalculatorResult {
  // Normalize inputs: ignore negative or invalid number prices
  const ep = (entryPrice !== null && entryPrice > 0) ? entryPrice : null;
  const sl = (stopLoss !== null && stopLoss > 0) ? stopLoss : null;
  const tp = (takeProfit !== null && takeProfit > 0) ? takeProfit : null;
  const xp = (exitPrice !== null && exitPrice > 0) ? exitPrice : null;

  // 1. oneR calculation
  let oneR: number | null = null;
  if (ep !== null && sl !== null && ep !== sl) {
    oneR = Math.abs(ep - sl);
  }

  // 2. rrPlanned calculation
  let rrPlanned: number | null = null;
  if (oneR !== null && tp !== null && directionStr !== null) {
    const rawRR = directionStr === 'long'
      ? (tp - ep!) / oneR
      : (ep! - tp) / oneR;
    if (rawRR > 0) {
      rrPlanned = Math.round(rawRR * 100) / 100;
    }
  }

  // 3. rExecuted calculation
  let rExecuted: number | null = null;
  if (oneR !== null && xp !== null && directionStr !== null) {
    const rawR = directionStr === 'long'
      ? (xp - ep!) / oneR
      : (ep! - xp) / oneR;
    rExecuted = Math.round(rawR * 100) / 100;
  }

  // 4. duration calculation
  let duration: string | null = null;
  if (entryDateTime && closeDateTime && closeDateTime >= entryDateTime) {
    const mins = Math.round((closeDateTime.getTime() - entryDateTime.getTime()) / 60000);
    if (mins < 60) {
      duration = `${mins} min`;
    } else {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      duration = m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
  }

  return {
    oneR,
    rrPlanned,
    rExecuted,
    duration,
    isReady: oneR !== null,
  };
}

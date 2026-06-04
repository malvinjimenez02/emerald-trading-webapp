import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Trade, TradeFormData } from '../types/trade';
import { TradeDirection, TradeResult, TradeStatus } from '../types/trade';
import type { JournalMetrics } from '../types/metrics';
import type { AccountConfig } from '../types/account';
import { journalToConfig } from '../types/account';
import { calculateMetrics, calculateR } from '../utils/calculations';
import { useAuthStore } from './useAuthStore';
import { parsePrice } from '../utils/numbers';

// ─── Empty metrics fallback ───────────────────────────────────────────────────

const emptyMetrics: JournalMetrics = {
  totalTrades: 0,
  winRate: 0,
  totalRProfit: 0,
  profitFactor: 0,
  accountValue: 0,
  percentageChange: 0,
  equityCurve: [],
};

// ─── Supabase row shape ───────────────────────────────────────────────────────

interface TradeRow {
  id: string;
  journal_id: string;
  user_id: string;
  asset_name: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number | null;
  exit_price: number | null;
  result: string;
  r_value: number | null;
  pnl_amount: number | null;
  status: string;
  notes: string | null;
  screenshot_uri: string | null;
  entry_date: string | null;
  close_date: string | null;
  created_at: string;
  closed_at: string | null;
  instrument_type: string;
  option_type: string | null;
  strike: number | null;
  expiration_date: string | null;
  contracts: number | null;
  premium_entry: number | null;
  premium_exit: number | null;
  stop_loss_pct: number | null;
  strategy: string | null;
  close_type: string | null;
  delta_entry: number | null;
  theta_entry: number | null;
  iv_entry: number | null;
  dte_entry: number | null;
}

// ─── Mapper helpers ───────────────────────────────────────────────────────────

function mapFromSupabase(row: TradeRow): Trade {
  return {
    id: row.id,
    assetName: row.asset_name,
    direction: row.direction as TradeDirection,
    entryPrice: row.entry_price,
    stopLoss: row.stop_loss,
    takeProfit: row.take_profit ?? undefined,
    exitPrice: row.exit_price ?? undefined,
    result: row.result as TradeResult,
    rValue: row.r_value ?? undefined,
    pnlAmount: row.pnl_amount ?? undefined,
    status: row.status as TradeStatus,
    notes: row.notes ?? undefined,
    screenshotUri: row.screenshot_uri ?? undefined,
    entryDate: row.entry_date ?? null,
    closeDate: row.close_date ?? null,
    createdAt: row.created_at,
    closedAt: row.closed_at ?? undefined,
    synced: true,
    // Options fields
    instrumentType: (row.instrument_type as import('../types/trade').InstrumentType) ?? 'spot_futures',
    optionType: (row.option_type as import('../types/trade').OptionType) ?? undefined,
    strike: row.strike ?? undefined,
    expirationDate: row.expiration_date ?? undefined,
    contracts: row.contracts ?? undefined,
    premiumEntry: row.premium_entry ?? undefined,
    premiumExit: row.premium_exit ?? undefined,
    stopLossPct: row.stop_loss_pct ?? undefined,
    strategy: (row.strategy as import('../types/trade').OptionStrategy) ?? undefined,
    closeType: (row.close_type as import('../types/trade').OptionCloseType) ?? undefined,
    greeks: (row.delta_entry || row.theta_entry || row.iv_entry || row.dte_entry) ? {
      delta: row.delta_entry ?? undefined,
      theta: row.theta_entry ?? undefined,
      iv: row.iv_entry ?? undefined,
      dte: row.dte_entry ?? undefined,
    } : undefined,
  };
}

function mapToSupabase(
  trade: Trade,
  journalId: string,
  userId: string
): TradeRow {
  return {
    id: trade.id,
    journal_id: journalId,
    user_id: userId,
    asset_name: trade.assetName,
    direction: trade.direction,
    entry_price: trade.entryPrice,
    stop_loss: trade.stopLoss,
    take_profit: trade.takeProfit ?? null,
    exit_price: trade.exitPrice ?? null,
    result: trade.result,
    r_value: trade.rValue ?? null,
    pnl_amount: trade.pnlAmount ?? null,
    status: trade.status,
    notes: trade.notes ?? null,
    screenshot_uri: trade.screenshotUri ?? null,
    entry_date: trade.entryDate ?? null,
    close_date: trade.closeDate ?? null,
    created_at: trade.createdAt,
    closed_at: trade.closedAt ?? null,
    instrument_type: trade.instrumentType ?? 'spot_futures',
    option_type: trade.optionType ?? null,
    strike: trade.strike ?? null,
    expiration_date: trade.expirationDate ?? null,
    contracts: trade.contracts ?? null,
    premium_entry: trade.premiumEntry ?? null,
    premium_exit: trade.premiumExit ?? null,
    stop_loss_pct: trade.stopLossPct ?? null,
    strategy: trade.strategy ?? null,
    close_type: trade.closeType ?? null,
    delta_entry: trade.greeks?.delta ?? null,
    theta_entry: trade.greeks?.theta ?? null,
    iv_entry: trade.greeks?.iv ?? null,
    dte_entry: trade.greeks?.dte ?? null,
  };
}

function mapUpdatesToSupabase(updates: Partial<Trade>): Partial<TradeRow> {
  const row: Partial<TradeRow> = {};
  if (updates.assetName !== undefined)      row.asset_name      = updates.assetName;
  if (updates.direction !== undefined)      row.direction       = updates.direction;
  if (updates.entryPrice !== undefined)     row.entry_price     = updates.entryPrice;
  if (updates.stopLoss !== undefined)       row.stop_loss       = updates.stopLoss;
  if (updates.takeProfit !== undefined)     row.take_profit     = updates.takeProfit ?? null;
  if (updates.exitPrice !== undefined)      row.exit_price      = updates.exitPrice ?? null;
  if (updates.result !== undefined)         row.result          = updates.result;
  if (updates.rValue !== undefined)         row.r_value         = updates.rValue ?? null;
  if (updates.pnlAmount !== undefined)      row.pnl_amount      = updates.pnlAmount ?? null;
  if (updates.status !== undefined)         row.status          = updates.status;
  if (updates.notes !== undefined)          row.notes           = updates.notes ?? null;
  if (updates.screenshotUri !== undefined)  row.screenshot_uri  = updates.screenshotUri ?? null;
  if (updates.entryDate !== undefined)      row.entry_date      = updates.entryDate ?? null;
  if (updates.closeDate !== undefined)      row.close_date      = updates.closeDate ?? null;
  if (updates.closedAt !== undefined)       row.closed_at       = updates.closedAt ?? null;
  if (updates.instrumentType !== undefined) row.instrument_type = updates.instrumentType;
  if (updates.optionType !== undefined)     row.option_type     = updates.optionType ?? null;
  if (updates.strike !== undefined)         row.strike          = updates.strike ?? null;
  if (updates.expirationDate !== undefined) row.expiration_date = updates.expirationDate ?? null;
  if (updates.contracts !== undefined)      row.contracts       = updates.contracts ?? null;
  if (updates.premiumEntry !== undefined)   row.premium_entry   = updates.premiumEntry ?? null;
  if (updates.premiumExit !== undefined)    row.premium_exit    = updates.premiumExit ?? null;
  if (updates.stopLossPct !== undefined)    row.stop_loss_pct   = updates.stopLossPct ?? null;
  if (updates.strategy !== undefined)       row.strategy        = updates.strategy ?? null;
  if (updates.closeType !== undefined)      row.close_type      = updates.closeType ?? null;
  if (updates.greeks !== undefined) {
    row.delta_entry = updates.greeks?.delta ?? null;
    row.theta_entry = updates.greeks?.theta ?? null;
    row.iv_entry    = updates.greeks?.iv    ?? null;
    row.dte_entry   = updates.greeks?.dte   ?? null;
  }
  return row;
}

function buildTradeFromForm(
  form: TradeFormData,
  _journalId: string,
  _userId: string | undefined
): Trade {
  const isClosed = form.result !== TradeResult.Open;
  const entryDateISO = combineDatetime(form.entryDate, form.entryTime);
  const closeDateISO = isClosed ? combineDatetime(form.closeDate, form.closeTime) : null;
  const pnlAmount = parsePrice(form.pnlAmount);
  const takeProfit = parsePrice(form.takeProfit);

  // ── Options path ────────────────────────────────────────────────────────
  if (form.instrumentType === 'options') {
    const pe = parsePrice(form.premiumEntry) || 0;
    const px = parsePrice(form.premiumExit);
    const pct = parsePrice(form.stopLossPct);
    const numContracts = parseInt(form.contracts) || 1;

    // Compute stop price: % of premium or manual field
    const stopPrice = pct && pct > 0 && pct < 100
      ? pe * (1 - pct / 100)
      : (parsePrice(form.stopLoss) || pe * 0.5);

    let rValue: number | undefined;
    const riskPerShare = pe - stopPrice;
    if (px !== null && riskPerShare > 0) {
      rValue = Math.round(((px - pe) / riskPerShare) * 100) / 100;
    }

    return {
      id: crypto.randomUUID(),
      assetName: form.assetName,
      direction: form.direction,
      entryPrice: pe,
      stopLoss: stopPrice,
      takeProfit: takeProfit ?? undefined,
      exitPrice: px ?? undefined,
      result: form.result,
      rValue,
      pnlAmount: pnlAmount ?? undefined,
      status: isClosed ? TradeStatus.Closed : TradeStatus.Open,
      notes: form.notes || undefined,
      screenshotUri: form.screenshotUri || undefined,
      entryDate: entryDateISO,
      closeDate: closeDateISO,
      createdAt: new Date().toISOString(),
      closedAt: isClosed ? new Date().toISOString() : undefined,
      synced: true,
      instrumentType: 'options',
      optionType: form.optionType || undefined,
      strike: form.strike ? parseFloat(form.strike) : undefined,
      expirationDate: form.expirationDate || undefined,
      contracts: numContracts,
      premiumEntry: pe,
      premiumExit: px ?? undefined,
      stopLossPct: pct ?? undefined,
      strategy: form.strategy || undefined,
      closeType: form.closeType || undefined,
      greeks: (form.deltaEntry || form.thetaEntry || form.ivEntry || form.dteEntry) ? {
        delta: parsePrice(form.deltaEntry) ?? undefined,
        theta: parsePrice(form.thetaEntry) ?? undefined,
        iv: parsePrice(form.ivEntry) ?? undefined,
        dte: form.dteEntry ? parseInt(form.dteEntry) : undefined,
      } : undefined,
    };
  }

  // ── Spot / Futures path ──────────────────────────────────────────────────
  const entryPrice = parsePrice(form.entryPrice) || 0;
  const stopLoss   = parsePrice(form.stopLoss) || 0;
  const exitPrice  = parsePrice(form.exitPrice);

  let rValue: number | undefined;
  if (exitPrice !== null && !isNaN(exitPrice)) {
    const computed = calculateR(form.direction, entryPrice!, exitPrice!, stopLoss!);
    if (computed !== null) rValue = computed;
  } else if (isClosed && pnlAmount !== null && !isNaN(pnlAmount)) {
    const riskPerTrade = 100;
    rValue = form.result === TradeResult.Win
      ? Math.abs(pnlAmount!) / riskPerTrade
      : -(Math.abs(pnlAmount!) / riskPerTrade);
  }

  return {
    id: crypto.randomUUID(),
    assetName: form.assetName,
    direction: form.direction,
    entryPrice,
    stopLoss,
    takeProfit: takeProfit ?? undefined,
    exitPrice: exitPrice ?? undefined,
    result: form.result,
    rValue,
    pnlAmount: pnlAmount ?? undefined,
    status: isClosed ? TradeStatus.Closed : TradeStatus.Open,
    notes: form.notes || undefined,
    screenshotUri: form.screenshotUri || undefined,
    entryDate: entryDateISO,
    closeDate: closeDateISO,
    createdAt: new Date().toISOString(),
    closedAt: isClosed ? new Date().toISOString() : undefined,
    synced: true,
    instrumentType: 'spot_futures',
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function combineDatetime(date: string, time: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || '00:00'}:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── Journal config fetch ─────────────────────────────────────────────────────

async function getJournalConfig(journalId: string): Promise<AccountConfig> {
  const { data } = await supabase
    .from('journals')
    .select('id, name, initial_capital, currency, is_active, created_at')
    .eq('id', journalId)
    .single();

  if (!data) {
    return { journalName: 'Journal', initialCapital: 10_000, riskPerTrade: 100, currency: 'USD' };
  }

  return journalToConfig({
    id: data.id,
    name: data.name,
    initialCapital: data.initial_capital,
    currency: data.currency,
    isActive: data.is_active,
    createdAt: data.created_at,
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface TradeState {
  trades: Trade[];
  metrics: JournalMetrics;
  activeJournalId: string | null;
  isLoading: boolean;

  loadTrades: (journalId: string) => Promise<void>;
  addTrade: (form: TradeFormData, journalId: string) => Promise<Trade>;
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
}

export const useTradeStore = create<TradeState>((set, get) => ({
  trades: [],
  metrics: emptyMetrics,
  activeJournalId: null,
  isLoading: true,

  loadTrades: async (journalId) => {
    set({ isLoading: true, activeJournalId: journalId });

    const userId = useAuthStore.getState().user?.id;
    if (!userId) { set({ isLoading: false }); return; }

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('journal_id', journalId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[useTradeStore] loadTrades error:', error.message);
      set({ isLoading: false });
      return;
    }

    const trades = (data as TradeRow[] ?? []).map(mapFromSupabase);
    const config = await getJournalConfig(journalId);
    const metrics = calculateMetrics(trades, config);
    set({ trades, metrics, isLoading: false });
  },

  addTrade: async (form, journalId) => {
    const userId = useAuthStore.getState().user?.id;
    const accessToken = useAuthStore.getState().session?.access_token;
    if (!accessToken) throw new Error('No active session');

    const trade = buildTradeFromForm(form, journalId, userId);
    const row = mapToSupabase(trade, journalId, userId!);

    // Bypass GoTrueClient (which can deadlock on token refresh) using direct fetch
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const res = await fetch(`${supabaseUrl}/rest/v1/trades`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      const error = new Error(`Insert failed ${res.status}: ${body}`);
      console.error('[useTradeStore] addTrade error:', body);
      throw error;
    }

    const trades = [trade, ...get().trades];
    // Keep save path fast; refresh metrics with best-effort config in background.
    const fallbackConfig: AccountConfig = {
      journalName: 'Journal',
      initialCapital: 10_000,
      riskPerTrade: 100,
      currency: 'USD',
    };
    set({ trades, metrics: calculateMetrics(trades, fallbackConfig) });
    void (async () => {
      try {
        const config = await getJournalConfig(journalId);
        set({ metrics: calculateMetrics(get().trades, config) });
      } catch (err) {
        console.warn('[useTradeStore] addTrade metrics refresh skipped:', err);
      }
    })();
    return trade;
  },

  updateTrade: async (id, updates) => {
    const accessToken = useAuthStore.getState().session?.access_token;
    if (!accessToken) throw new Error('No active session');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const res = await fetch(`${supabaseUrl}/rest/v1/trades?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(mapUpdatesToSupabase(updates)),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      const error = new Error(`Update failed ${res.status}: ${body}`);
      console.error('[useTradeStore] updateTrade error:', body);
      throw error;
    }

    // Optimistic update: reflect changes immediately so the UI doesn't wait
    // for the background loadTrades refetch.
    const optimisticTrades = get().trades.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    set({ trades: optimisticTrades });

    // Refetch in background to get authoritative data from DB.
    const journalId = get().activeJournalId;
    if (journalId) void get().loadTrades(journalId);
  },

  deleteTrade: async (id) => {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[useTradeStore] deleteTrade error:', error.message);
      throw error;
    }

    const journalId = get().activeJournalId!;
    const trades = get().trades.filter((t) => t.id !== id);
    const config = await getJournalConfig(journalId);
    set({ trades, metrics: calculateMetrics(trades, config) });
  },
}));

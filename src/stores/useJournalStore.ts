import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Journal } from '../types/account';
import { useAuthStore } from './useAuthStore';
import { useTradeStore } from './useTradeStore';

// ─── Supabase row shape ───────────────────────────────────────────────────────
// Schema mirrors the mobile SQLite table (journals), with user_id added for
// multi-user scoping in Supabase.
//
// SQL (run once in Supabase dashboard if the table doesn't exist yet):
//
//   CREATE TABLE IF NOT EXISTS journals (
//     id           TEXT PRIMARY KEY,
//     user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//     name         TEXT NOT NULL,
//     initial_capital NUMERIC NOT NULL DEFAULT 10000,
//     currency     TEXT NOT NULL DEFAULT 'USD',
//     is_active    BOOLEAN NOT NULL DEFAULT FALSE,
//     created_at   TEXT NOT NULL
//   );
//   CREATE INDEX IF NOT EXISTS journals_user_id_idx ON journals(user_id);
//   ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "Users manage own journals"
//     ON journals FOR ALL USING (auth.uid() = user_id);

interface JournalRow {
  id: string;
  user_id: string;
  name: string;
  initial_capital: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapFromRow(row: JournalRow): Journal {
  return {
    id: row.id,
    name: row.name,
    initialCapital: row.initial_capital,
    currency: row.currency,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapToRow(
  journal: Journal,
  userId: string
): JournalRow {
  return {
    id: journal.id,
    user_id: userId,
    name: journal.name,
    initial_capital: journal.initialCapital,
    currency: journal.currency,
    is_active: journal.isActive,
    created_at: journal.createdAt,
  };
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface JournalState {
  journals: Journal[];
  activeJournal: Journal | null;
  isLoading: boolean;

  loadJournals: () => Promise<void>;
  createJournal: (name: string, capital: number, currency: string) => Promise<Journal>;
  switchJournal: (id: string) => Promise<void>;
  updateJournal: (id: string, updates: Partial<Pick<Journal, 'name' | 'initialCapital' | 'currency'>>) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useJournalStore = create<JournalState>((set, get) => ({
  journals: [],
  activeJournal: null,
  isLoading: true,

  loadJournals: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    set({ isLoading: true });

    // Helper: fall back to a virtual journal and load trades by user_id
    const useFallback = async (reason: string) => {
      console.warn('[useJournalStore] using fallback journal:', reason);
      const fallback: Journal = {
        id: userId,
        name: 'My Journal',
        initialCapital: 10_000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      set({ journals: [fallback], activeJournal: fallback, isLoading: false });
      await useTradeStore.getState().loadTrades(fallback.id);
    };

    // 1. Try to read journals from Supabase
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      await useFallback(error.message);
      return;
    }

    const journals = (data as JournalRow[] ?? []).map(mapFromRow);

    // 2. No journals yet → try to create one, fall back if creation fails
    if (journals.length === 0) {
      try {
        const defaultJournal = await get().createJournal('My Journal', 10_000, 'USD');
        const active = { ...defaultJournal, isActive: true };
        set({ journals: [active], activeJournal: active, isLoading: false });
        await useTradeStore.getState().loadTrades(defaultJournal.id);
      } catch (createErr) {
        await useFallback('createJournal failed');
      }
      return;
    }

    // 3. Journals found — activate the right one
    const active = journals.find(j => j.isActive) ?? journals[0];
    set({ journals, activeJournal: active, isLoading: false });

    // Migrate orphan trades to the active journal (one-time, safe to repeat)
    // Case 1: mobile trades with no journal_id
    const { error: m1, count: c1 } = await supabase
      .from('trades')
      .update({ journal_id: active.id })
      .eq('user_id', userId)
      .is('journal_id', null)
      .select('id', { count: 'exact', head: true });
    if (m1) console.error('[migrate] null journal_id:', m1.message);
    else console.log('[migrate] null → active:', c1);

    // Case 2: trades saved with the fallback virtual journal (journal_id = userId)
    const { error: m2, count: c2 } = await supabase
      .from('trades')
      .update({ journal_id: active.id })
      .eq('user_id', userId)
      .eq('journal_id', userId)
      .select('id', { count: 'exact', head: true });
    if (m2) console.error('[migrate] fallback journal_id:', m2.message);
    else console.log('[migrate] fallback → active:', c2);

    await useTradeStore.getState().loadTrades(active.id);
  },

  createJournal: async (name, capital, currency) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const journal: Journal = {
      id: crypto.randomUUID(),
      name,
      initialCapital: capital,
      currency,
      isActive: false,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('journals')
      .insert(mapToRow(journal, userId));

    if (error) {
      console.error('[useJournalStore] createJournal error:', error.message);
      throw error;
    }

    set(state => ({ journals: [...state.journals, journal] }));
    return journal;
  },

  switchJournal: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const journals = get().journals;
    const next = journals.find(j => j.id === id);
    if (!next) return;

    // Deactivate all, activate the selected one
    const { error } = await supabase
      .from('journals')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      console.error('[useJournalStore] switchJournal deactivate error:', error.message);
      throw error;
    }

    const { error: activateError } = await supabase
      .from('journals')
      .update({ is_active: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (activateError) {
      console.error('[useJournalStore] switchJournal activate error:', activateError.message);
      throw activateError;
    }

    const updated = journals.map(j => ({ ...j, isActive: j.id === id }));
    const active = updated.find(j => j.id === id)!;
    set({ journals: updated, activeJournal: active });

    // Load trades for the new active journal
    await useTradeStore.getState().loadTrades(id);
  },

  updateJournal: async (id, updates) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const rowUpdates: Partial<JournalRow> = {};
    if (updates.name !== undefined)           rowUpdates.name            = updates.name;
    if (updates.initialCapital !== undefined) rowUpdates.initial_capital = updates.initialCapital;
    if (updates.currency !== undefined)       rowUpdates.currency        = updates.currency;

    const { error } = await supabase
      .from('journals')
      .update(rowUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[useJournalStore] updateJournal error:', error.message);
      throw error;
    }

    const journals = get().journals.map(j =>
      j.id === id ? { ...j, ...updates } : j
    );
    const activeJournal = journals.find(j => j.id === get().activeJournal?.id) ?? get().activeJournal;
    set({ journals, activeJournal });

    // Recalculate metrics if the active journal's capital changed
    if (id === get().activeJournal?.id && updates.initialCapital !== undefined) {
      const journalId = get().activeJournal?.id;
      if (journalId) await useTradeStore.getState().loadTrades(journalId);
    }
  },

  deleteJournal: async (id) => {
    const { journals } = get();

    if (journals.length <= 1) {
      console.warn('[useJournalStore] Cannot delete the last journal.');
      return;
    }

    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    // Cascade: delete associated trades first
    const { error: tradesError } = await supabase
      .from('trades')
      .delete()
      .eq('journal_id', id);

    if (tradesError) {
      console.error('[useJournalStore] deleteJournal trades cascade error:', tradesError.message);
      throw tradesError;
    }

    const { error } = await supabase
      .from('journals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[useJournalStore] deleteJournal error:', error.message);
      throw error;
    }

    const remaining = journals.filter(j => j.id !== id);
    const wasActive = get().activeJournal?.id === id;

    if (wasActive) {
      // Switch to the first remaining journal
      set({ journals: remaining, activeJournal: null });
      await get().switchJournal(remaining[0].id);
    } else {
      set({ journals: remaining });
    }
  },
}));

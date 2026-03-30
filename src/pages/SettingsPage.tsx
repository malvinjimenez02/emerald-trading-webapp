import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  X,
  LogOut,
  Pencil,
  ArrowLeftRight,
} from 'lucide-react';
import { useJournalStore } from '../stores/useJournalStore';
import { useTradeStore } from '../stores/useTradeStore';
import { useAuthStore } from '../stores/useAuthStore';
import type { Journal } from '../types/account';
import { supabase } from '../services/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCSV(trades: ReturnType<typeof useTradeStore.getState>['trades']): string {
  const headers = [
    'ID', 'Asset', 'Direction', 'Entry Price', 'Stop Loss', 'Take Profit',
    'Exit Price', 'Result', 'R Value', 'PnL (USD)', 'Status',
    'Notes', 'Created At', 'Closed At',
  ];
  const rows = trades.map(t => [
    t.id,
    t.assetName,
    t.direction,
    t.entryPrice,
    t.stopLoss,
    t.takeProfit ?? '',
    t.exitPrice ?? '',
    t.result,
    t.rValue ?? '',
    t.pnlAmount ?? '',
    t.status,
    (t.notes ?? '').replace(/"/g, '""'),
    t.createdAt,
    t.closedAt ?? '',
  ].map(v => `"${v}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-bg-surface rounded-xl p-6 flex flex-col gap-4">
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{title}</h2>
    {children}
  </div>
);

const InputRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-[13px] text-text-secondary shrink-0 w-36">{label}</label>
    <div className="flex-1">{children}</div>
  </div>
);

const inputCls = 'w-full bg-bg border border-divider rounded-lg px-3 py-2 text-[13px] text-text placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors';

// ─── Delete All Trades Modal ──────────────────────────────────────────────────

const DeleteAllModal: React.FC<{ onConfirm: () => void; onCancel: () => void; isDeleting: boolean }> = ({
  onConfirm, onCancel, isDeleting,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-bg-surface border border-divider rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-negative/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-negative" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-text">Delete All Trades</h3>
            <p className="text-[12px] text-text-secondary mt-0.5">This cannot be undone</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-text-tertiary hover:text-text transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-[13px] text-text-secondary">
        All trades in this account will be permanently deleted. Are you absolutely sure?
      </p>
      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-divider text-[13px] font-medium text-text-secondary hover:bg-accent/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex-1 py-2.5 rounded-xl bg-negative text-white text-[13px] font-semibold hover:bg-negative/80 transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting…' : 'Yes, Delete All'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Journals Section ─────────────────────────────────────────────────────────

const JournalsSection: React.FC = () => {
  const { journals, activeJournal, switchJournal, deleteJournal, createJournal, updateJournal } = useJournalStore();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCapital, setNewCapital] = useState('10000');
  const [newCurrency, setNewCurrency] = useState('USD');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCapital, setEditCapital] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (j: Journal) => {
    setEditingId(j.id);
    setEditName(j.name);
    setEditCapital(String(j.initialCapital));
    setEditCurrency(j.currency);
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (j: Journal) => {
    setSaving(true);
    try {
      await updateJournal(j.id, {
        name: editName.trim() || j.name,
        initialCapital: parseFloat(editCapital) || j.initialCapital,
        currency: editCurrency.toUpperCase() || j.currency,
      });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createJournal(newName.trim(), parseFloat(newCapital) || 10000, newCurrency.toUpperCase() || 'USD');
      setShowNewForm(false);
      setNewName('');
      setNewCapital('10000');
      setNewCurrency('USD');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? JSON.stringify(err);
      console.error('[SettingsPage] createJournal failed:', err);
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleSwitch = async (id: string) => {
    setSwitching(id);
    try { await switchJournal(id); } finally { setSwitching(null); }
  };

  const handleDelete = async (j: Journal) => {
    if (!confirm(`Delete journal "${j.name}" and all its trades? This cannot be undone.`)) return;
    setDeleting(j.id);
    try { await deleteJournal(j.id); } finally { setDeleting(null); }
  };

  return (
    <SectionCard title="Journals">
      <div className="flex flex-col gap-2">
        {journals.map(j => {
          const isActive = j.id === activeJournal?.id;
          const isEditing = editingId === j.id;

          if (isEditing) {
            return (
              <div key={j.id} className="flex flex-col gap-3 p-3 rounded-xl border border-accent/30 bg-accent/5">
                <InputRow label="Name">
                  <input
                    className={inputCls}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                  />
                </InputRow>
                <InputRow label="Initial Capital">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary pointer-events-none">$</span>
                    <input
                      className={`${inputCls} pl-6`}
                      type="number"
                      min={0}
                      value={editCapital}
                      onChange={e => setEditCapital(e.target.value)}
                    />
                  </div>
                </InputRow>
                <InputRow label="Currency">
                  <input
                    className={inputCls}
                    value={editCurrency}
                    maxLength={3}
                    onChange={e => setEditCurrency(e.target.value.toUpperCase())}
                  />
                </InputRow>
                <div className="flex gap-2">
                  <button
                    onClick={cancelEdit}
                    className="flex-1 py-2 rounded-xl border border-divider text-[13px] text-text-secondary hover:bg-accent/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(j)}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-accent text-bg text-[13px] font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={j.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                isActive ? 'border-accent/30 bg-accent/5' : 'border-divider/50 hover:border-divider'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-text-secondary'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-text truncate">{j.name}</span>
                    {isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded-full shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-tertiary">
                    ${j.initialCapital.toLocaleString()} · {j.currency}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => startEdit(j)}
                  title="Edit"
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {!isActive && (
                  <>
                    <button
                      onClick={() => handleSwitch(j.id)}
                      disabled={switching === j.id}
                      title="Switch to this journal"
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                    {journals.length > 1 && (
                      <button
                        onClick={() => handleDelete(j)}
                        disabled={deleting === j.id}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-negative hover:bg-negative/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showNewForm ? (
        <div className="flex flex-col gap-3 pt-2 border-t border-divider/50">
          <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">New Journal</p>
          <InputRow label="Name">
            <input
              className={inputCls}
              placeholder="My Journal"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
          </InputRow>
          <InputRow label="Initial Capital">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary pointer-events-none">$</span>
              <input
                className={`${inputCls} pl-6`}
                type="number"
                min={0}
                placeholder="10000"
                value={newCapital}
                onChange={e => setNewCapital(e.target.value)}
              />
            </div>
          </InputRow>
          <InputRow label="Currency">
            <input
              className={inputCls}
              placeholder="USD"
              maxLength={3}
              value={newCurrency}
              onChange={e => setNewCurrency(e.target.value.toUpperCase())}
            />
          </InputRow>
          {createError && (
            <p className="text-[12px] text-negative bg-negative/10 rounded-lg px-3 py-2">
              Error: {createError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNewForm(false); setCreateError(null); }}
              className="flex-1 py-2 rounded-xl border border-divider text-[13px] text-text-secondary hover:bg-accent/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex-1 py-2 rounded-xl bg-accent text-bg text-[13px] font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 text-[13px] font-medium text-accent hover:text-accent/80 transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          New Journal
        </button>
      )}
    </SectionCard>
  );
};

// ─── Data Section ─────────────────────────────────────────────────────────────

const DataSection: React.FC = () => {
  const { trades, loadTrades, activeJournalId } = useTradeStore();
  const { user } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = () => {
    const csv = generateCSV(trades);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emerald-trades.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      if (activeJournalId) await loadTrades(activeJournalId);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SectionCard title="Data">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-text">Export to CSV</p>
              <p className="text-[11px] text-text-secondary mt-0.5">Download all {trades.length} trades as a spreadsheet</p>
            </div>
            <button
              onClick={handleExport}
              disabled={trades.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-divider text-[13px] font-medium text-text hover:bg-accent/5 hover:border-accent/30 hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="border-t border-divider/50 pt-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-negative">Delete All Trades</p>
              <p className="text-[11px] text-text-secondary mt-0.5">Permanently remove all trade data</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={trades.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-negative/30 text-[13px] font-medium text-negative hover:bg-negative/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete All
            </button>
          </div>
        </div>
      </SectionCard>

      {showDeleteModal && (
        <DeleteAllModal
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};

// ─── Session Section ──────────────────────────────────────────────────────────

const SessionSection: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <SectionCard title="Session">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">Signed in as</p>
          <p className="text-[14px] font-medium text-text mt-0.5">{user?.email ?? '—'}</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-negative/40 text-[13px] font-semibold text-negative hover:bg-negative/10 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </SectionCard>
  );
};

// ─── About Section ────────────────────────────────────────────────────────────

const AboutSection: React.FC = () => {
  const { trades } = useTradeStore();
  const rows: [string, string][] = [
    ['Version', '1.0.0'],
    ['Platform', 'Desktop'],
    ['Total Trades', String(trades.length)],
  ];
  return (
    <SectionCard title="About">
      <div className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-1">
            <span className="text-[13px] text-text-secondary">{label}</span>
            <span className="text-[13px] font-medium text-text tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => (
  <div className="space-y-5">
    <div>
      <h1 className="text-2xl font-bold text-text">Settings</h1>
      <p className="text-[13px] text-text-secondary mt-1">Manage your journal, data, and account</p>
    </div>

    <div className="max-w-2xl flex flex-col gap-4">
      <JournalsSection />
      <DataSection />
      <SessionSection />
      <AboutSection />
    </div>
  </div>
);

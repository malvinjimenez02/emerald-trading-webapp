import React, { useRef, useEffect, useState } from 'react';
import { Search, User, ChevronDown, Check, BookOpen, Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useJournalStore } from '../../stores/useJournalStore';
import { DateFilterDropdown } from './DateFilterDropdown';

export const TopNavbar: React.FC = () => {
  const { user, profile } = useAuthStore();
  const { journals, activeJournal, switchJournal } = useJournalStore();
  const [journalOpen, setJournalOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userEmail = user?.email || 'user@example.com';
  const username = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : userEmail.split('@')[0];

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : userEmail[0].toUpperCase();

  useEffect(() => {
    if (!journalOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setJournalOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [journalOpen]);

  const handleSwitch = async (id: string) => {
    if (id === activeJournal?.id) { setJournalOpen(false); return; }
    setSwitching(id);
    try {
      await switchJournal(id);
    } finally {
      setSwitching(null);
      setJournalOpen(false);
    }
  };

  return (
    <header className="bg-bg border-b border-divider shrink-0 sticky top-0 z-40">
      {/* ── Mobile header ── */}
      <div className="md:hidden flex items-center justify-between px-4 h-[60px]">
        {/* Journal selector */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setJournalOpen(o => !o)}
            className="flex flex-col text-left group cursor-pointer"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Journal
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[15px] font-bold text-text leading-tight">
                {activeJournal?.name ?? 'Journal'}
              </span>
              <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${journalOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Journal dropdown */}
          {journalOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-bg-surface border border-divider rounded-xl shadow-xl overflow-hidden z-50">
              {journals.map(j => {
                const isActive = j.id === activeJournal?.id;
                const isLoading = switching === j.id;
                return (
                  <button
                    key={j.id}
                    onClick={() => handleSwitch(j.id)}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/10 ${
                      isActive ? 'text-accent' : 'text-text-secondary hover:text-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">{j.name}</p>
                        <p className="text-[10px] text-text-tertiary">${j.initialCapital.toLocaleString()} · {j.currency}</p>
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 shrink-0" />}
                    {isLoading && <span className="text-[10px] text-text-tertiary shrink-0">…</span>}
                  </button>
                );
              })}
              {journals.length <= 1 && (
                <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-accent hover:bg-accent/10 transition-colors border-t border-divider/50">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="text-[13px] font-medium">Add another journal</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: date filter + avatar */}
        <div className="flex items-center gap-2">
          <DateFilterDropdown />
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-[11px] font-bold shrink-0">
            {initials}
          </div>
        </div>
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden md:flex items-center justify-between px-8 h-[80px]">
        <div className="flex-1" />
        <div className="w-full flex items-center justify-between">
          {/* Search Input */}
          <div className="relative w-[360px]">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-text-secondary" />
            </div>
            <input
              type="text"
              placeholder="Search"
              className="w-full h-[40px] bg-bg-surface border border-divider rounded-[12px] pl-11 pr-4 text-[14px] text-white placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-[0_0_8px_rgba(0,200,83,0.15)] transition-all"
            />
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <span className="text-[12px] text-text-tertiary">⌘ + F</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-8">
            <DateFilterDropdown />
            <button className="flex items-center gap-3 hover:bg-bg-surface/50 p-2 rounded-[16px] transition-colors -m-2">
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 text-accent">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[14px] font-semibold text-white leading-tight">{username}</p>
                <p className="text-[12px] text-text-secondary leading-tight capitalize">Trader</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

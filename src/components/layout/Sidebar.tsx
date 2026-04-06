import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  BarChart3,
  Settings,
  Plus,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Check,
} from 'lucide-react';
// import LogoIcon from '../../assets/Emerald-loading.svg'; // Removed as we inline the new logo
import { useAuthStore } from '../../stores/useAuthStore';
import { useJournalStore } from '../../stores/useJournalStore';
import { TradeForm } from '../trade/TradeForm';

// ─── Journal Switcher ─────────────────────────────────────────────────────────

const JournalSwitcher: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
  const { journals, activeJournal, switchJournal } = useJournalStore();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSwitch = async (id: string) => {
    if (id === activeJournal?.id) { setOpen(false); return; }
    setSwitching(id);
    try { await switchJournal(id); } finally {
      setSwitching(null);
      setOpen(false);
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center p-2 rounded-lg hover:bg-accent/10 text-text-secondary hover:text-accent transition-colors"
        title={activeJournal?.name ?? 'Journal'}
      >
        <BookOpen className="w-5 h-5 shrink-0" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full p-2 rounded-[12px] hover:bg-accent/10 text-text-secondary hover:text-accent transition-colors"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <BookOpen className="w-5 h-5 shrink-0" />
          <span className="truncate text-subhead font-medium">
            {activeJournal?.name ?? 'Journal'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && journals.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-surface border border-divider rounded-xl shadow-xl overflow-hidden z-50">
          {journals.map(j => {
            const isActive = j.id === activeJournal?.id;
            const isLoading = switching === j.id;
            return (
              <button
                key={j.id}
                onClick={() => handleSwitch(j.id)}
                disabled={isLoading}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/10 ${isActive ? 'text-accent' : 'text-text-secondary hover:text-accent'
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
        </div>
      )}
    </div>
  );
};

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'History', path: '/history', icon: Clock },
  { name: 'Analysis', path: '/analysis', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const { signOut } = useAuthStore();

  return (
    <>
      <aside
        className={`relative z-10 flex flex-col bg-bg-surface border-r border-divider transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[64px] overflow-visible' : 'w-[240px]'
          }`}
      >
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute -right-3 top-5 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-bg-surface border border-accent/40 text-accent hover:bg-accent hover:text-white transition-colors shadow-md"
            title="Expand sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Brand / Logo */}
        <div className={`flex items-center h-16 border-b border-divider/50 shrink-0 transition-all ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          <NavLink
            to="/"
            style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
            className="min-w-0 overflow-hidden"
          >
            <div style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(34,197,94,0.4)",
            }} className="shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <g transform="translate(1, 1) scale(0.92)">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </g>
              </svg>
            </div>
            {!isCollapsed && (
              <span className="text-[18px] font-[500] tracking-[-0.5px] text-white whitespace-nowrap">
                EMERALD
              </span>
            )}
          </NavLink>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-colors ${isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-accent/10 hover:text-accent'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </NavLink>
          ))}

          {/* New Trade Button */}
          <div className="pt-4 mt-4 border-t border-divider/50 px-1">
            <button
              className={`w-full flex items-center justify-center gap-2 bg-accent-dark text-white rounded-[12px] p-3 hover:bg-accent transition-colors ${isCollapsed ? 'px-0' : 'px-3'
                }`}
              onClick={() => setShowTradeForm(true)}
            >
              <Plus className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="font-semibold">New Trade</span>}
            </button>
          </div>
        </nav>

        {/* Footer Area: Journal Switcher & Collapse Toggle */}
        <div className="p-3 border-t border-divider shrink-0 flex flex-col gap-2">
          <JournalSwitcher isCollapsed={isCollapsed} />

          <button
            onClick={() => signOut()}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} w-full p-2 rounded-[12px] text-negative hover:bg-negative/10 transition-colors mt-2`}
            title="Log out"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="ml-3 truncate text-subhead font-medium">Log Out</span>}
          </button>

        </div>
      </aside>

      {showTradeForm && (
        <TradeForm onClose={() => setShowTradeForm(false)} />
      )}
    </>
  );
};

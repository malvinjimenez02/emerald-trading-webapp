import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, Plus, BarChart3, User } from 'lucide-react';
import { TradeForm } from '../trade/TradeForm';

export const BottomNav: React.FC = () => {
  const [showTradeForm, setShowTradeForm] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-divider h-16 px-2">
        <div className="flex items-end justify-around h-full pb-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`
            }
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-medium">Historial</span>
          </NavLink>

          {/* FAB flotante */}
          <div className="flex flex-col items-center -translate-y-4">
            <button
              onClick={() => setShowTradeForm(true)}
              className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-[0_0_24px_rgba(34,197,94,0.45)] hover:bg-accent-dark transition-colors cursor-pointer"
            >
              <Plus className="w-7 h-7 text-white" />
            </button>
          </div>

          <NavLink
            to="/analysis"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`
            }
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-medium">Análisis</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`
            }
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Perfil</span>
          </NavLink>
        </div>
      </nav>

      {showTradeForm && <TradeForm onClose={() => setShowTradeForm(false)} />}
    </>
  );
};

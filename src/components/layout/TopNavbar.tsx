import React from 'react';
import { Search, User } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { DateFilterDropdown } from './DateFilterDropdown';

export const TopNavbar: React.FC = () => {
  const { user, profile } = useAuthStore();
  const userEmail = user?.email || 'user@example.com';
  const username = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : userEmail.split('@')[0];

  return (
    <header className="h-[80px] bg-bg flex items-center justify-between px-8 border-b border-divider shrink-0 sticky top-0 z-40 relative">
      <div className="flex-1" /> {/* Spacer since TopNavbar content is centered in the layout below */}
      
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

          {/* Profile Dropdown */}
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
    </header>
  );
};

import React, { useRef } from 'react';
import { Compass, Search, X, Bookmark, Filter, Layers, Shield } from 'lucide-react';

interface HeaderProps {
  activeTab: 'home' | 'saved' | 'admin' | 'all';
  setActiveTab: (tab: 'home' | 'saved' | 'admin' | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  savedCount: number;
  onOpenFilters?: () => void;
  isFiltersOpen?: boolean;
  onNavigateHome: () => void;
  onOpenAdminLogin: () => void;
  isAdminAuthenticated: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  savedCount,
  onOpenFilters,
  isFiltersOpen,
  onNavigateHome,
  onOpenAdminLogin,
  isAdminAuthenticated,
}) => {
  // 5-click hidden admin entry tracker
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      onOpenAdminLogin();
      return;
    }

    // Reset counter if user stops clicking for > 1200ms
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 1200);

    // If single click, perform normal navigation
    if (clickCountRef.current === 1) {
      onNavigateHome();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080c1f]/60 backdrop-blur-[24px] saturate-[180%] border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Top row: Logo and Navigation */}
        <div className="flex items-center justify-between gap-4">
          {/* APXELUZ Logo with Hidden 5-Click Admin Trigger */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF] rounded-2xl p-1 -m-1 select-none cursor-pointer"
            aria-label="APXELUZ Home"
            title="APXELUZ"
          >
            {/* Liquid Glass Crystal Icon */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/20 via-white/10 to-transparent border border-white/25 shadow-[0_4px_16px_rgba(10,132,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl flex items-center justify-center text-[#0A84FF] group-hover:scale-105 transition-all duration-300">
              <Layers className="w-5 h-5 text-[#0A84FF] drop-shadow-[0_0_8px_rgba(10,132,255,0.6)]" />
            </div>
            <div className="flex flex-col">
              <span className="heading-font font-bold text-xl tracking-tight text-white flex items-center gap-1.5 leading-none">
                APXE<span className="bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2] bg-clip-text text-transparent">LUZ</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
                App & Mod Repository
              </span>
            </div>
          </button>

          {/* Navigation Items (Notice: Community link is removed completely per requirement 1) */}
          <nav className="flex items-center gap-2">
            {/* Discover / Home */}
            <button
              onClick={() => {
                setActiveTab('home');
                onNavigateHome();
              }}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'home'
                  ? 'text-white bg-white/15 border border-white/25 shadow-[0_4px_20px_rgba(10,132,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl'
                  : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
              aria-label="Discover"
            >
              <Compass className={`w-4 h-4 ${activeTab === 'home' ? 'text-[#0A84FF]' : ''}`} />
              <span>Discover</span>
              {activeTab === 'home' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A84FF] shadow-[0_0_8px_#0A84FF]"></span>
              )}
            </button>

            {/* Saved Items */}
            <button
              onClick={() => {
                setActiveTab('saved');
                if (window.location.pathname !== '/saved') {
                  window.history.pushState(null, '', '/saved');
                }
              }}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'saved'
                  ? 'text-white bg-white/15 border border-white/25 shadow-[0_4px_20px_rgba(10,132,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl'
                  : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
              aria-label="Saved Items"
              title="Saved Items"
            >
              <Bookmark className={`w-4 h-4 ${activeTab === 'saved' ? 'text-[#0A84FF]' : ''}`} />
              <span className="hidden sm:inline">Saved</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2] text-white font-bold shadow-sm">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Admin Dashboard shortcut visible ONLY when authenticated as Admin */}
            {isAdminAuthenticated && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  if (window.location.pathname !== '/admin') {
                    window.history.pushState(null, '', '/admin');
                  }
                }}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'admin'
                    ? 'text-white bg-[#0A84FF]/25 border border-[#0A84FF]/50 shadow-[0_4px_20px_rgba(10,132,255,0.3)] backdrop-blur-xl'
                    : 'text-[#0A84FF] hover:bg-white/10 border border-[#0A84FF]/30'
                }`}
                aria-label="Admin Dashboard"
                title="Admin Dashboard"
              >
                <Shield className="w-4 h-4 text-[#0A84FF]" />
                <span className="hidden sm:inline font-bold">Admin Panel</span>
              </button>
            )}
          </nav>
        </div>

        {/* Liquid Glass Search Bar */}
        <div className="mt-3 relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games, apps & mods (2+ characters)..."
              className="w-full bg-white/[0.07] text-white text-sm placeholder:text-slate-400 pl-11 pr-24 py-3 rounded-2xl border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 focus:bg-white/[0.10] focus:ring-2 focus:ring-[#0A84FF]/30 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {onOpenFilters && (
                <button
                  onClick={onOpenFilters}
                  className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-300 ${
                    isFiltersOpen
                      ? 'bg-[#0A84FF]/25 text-[#0A84FF] border border-[#0A84FF]/50 shadow-[0_0_12px_rgba(10,132,255,0.3)]'
                      : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15 border border-white/15'
                  }`}
                  aria-label="Toggle filters"
                  title="Filter options"
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useRef, useState } from 'react';
import { Compass, Search, X, Bookmark, Filter, Layers, Shield, Crown } from 'lucide-react';

const WEB_PROFILE_ICON_URL =
  'https://cdn.phototourl.com/anon/2026-11-15-95ccde76-958a-450f-91b0-60424cee492b.jpg';

interface HeaderProps {
  activeTab: 'home' | 'saved' | 'premium' | 'admin' | 'all';
  setActiveTab: (tab: 'home' | 'saved' | 'premium' | 'admin' | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  savedCount: number;
  onOpenFilters?: () => void;
  isFiltersOpen?: boolean;
  onNavigateHome: () => void;
  onNavigatePremium?: () => void;
  onOpenAdminLogin: () => void;
  isAdminAuthenticated: boolean;
  showRepositorySearch?: boolean;
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
  onNavigatePremium,
  onOpenAdminLogin,
  isAdminAuthenticated,
  showRepositorySearch = true,
}) => {
  // 5-click hidden admin entry tracker
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [profileIconFailed, setProfileIconFailed] = useState(false);

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

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 1200);

    if (clickCountRef.current === 1) {
      onNavigateHome();
    }
  };

  const handleMobileSearchJump = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 180);
  };

  return (
    <>
      {/* Compact Sticky Top Bar (< 15% mobile height combined with bottom nav) */}
      <header className="sticky top-0 z-40 w-full bg-white/65 backdrop-blur-2xl saturate-150 border-b border-white/80 shadow-[0_6px_20px_-8px_rgba(22,82,94,0.10)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-auto md:py-3 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-line Brand Wordmark with 3D Liquid Crystal Icon */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] rounded-2xl p-1 -m-1 select-none cursor-pointer tactile-press shrink-0"
            aria-label="APXELUZ Home"
            title="APXELUZ"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl overflow-hidden bg-[#D6F2EE] border border-[#D3DDE3] shadow-[0_6px_14px_-4px_rgba(13,148,136,0.22),inset_0_1.5px_1px_rgba(255,255,255,0.95),inset_0_-2px_0_rgba(13,148,136,0.20)] flex items-center justify-center text-[#0D9488] shrink-0">
              {!profileIconFailed ? (
                <img
                  src={WEB_PROFILE_ICON_URL}
                  alt="APXELUZ Profile"
                  referrerPolicy="no-referrer"
                  onError={() => setProfileIconFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Layers className="w-4 h-4 md:w-5 md:h-5 text-[#0D9488]" />
              )}
            </div>
            <span className="heading-font font-extrabold text-lg md:text-xl tracking-tight text-[#10242E] text-3d-subtle whitespace-nowrap">
              APXE<span className="text-[#0D9488]">LUZ</span>
            </span>
          </button>

          {/* Zone 2 (Desktop): Clean Navigation Links */}
          <nav className="hidden md:flex items-center gap-2" aria-label="Primary Navigation">
            <button
              onClick={() => {
                setActiveTab('home');
                onNavigateHome();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer tactile-press ${
                activeTab === 'home'
                  ? 'text-[#0F766E] bg-[#D6F2EE] border border-[#0D9488]/30 shadow-[0_4px_12px_-4px_rgba(13,148,136,0.20),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-2px_0_rgba(13,148,136,0.22)]'
                  : 'text-[#4A6270] hover:text-[#10242E] hover:bg-[#E6ECEF] border border-transparent'
              }`}
              aria-label="Discover"
            >
              <Compass className="w-4 h-4 text-[#0D9488]" />
              <span>Discover</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('premium');
                if (onNavigatePremium) onNavigatePremium();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer tactile-press ${
                activeTab === 'premium'
                  ? 'text-[#7C4A03] bg-[#FEF3C7] border border-[#D97706]/35 shadow-[0_4px_12px_-4px_rgba(217,119,6,0.18),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-2px_0_rgba(217,119,6,0.22)]'
                  : 'text-[#7C4A03] hover:bg-[#FEF3C7]/70 border border-transparent'
              }`}
              aria-label="Premium Game"
            >
              <Crown className="w-4 h-4 text-[#D97706]" />
              <span>Premium Game</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('saved');
                if (window.location.pathname !== '/saved') {
                  window.history.pushState(null, '', '/saved');
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer tactile-press ${
                activeTab === 'saved'
                  ? 'text-[#165985] bg-[#DBEAF6] border border-[#1D6FA5]/30 shadow-[0_4px_12px_-4px_rgba(29,111,165,0.20),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-2px_0_rgba(29,111,165,0.22)]'
                  : 'text-[#4A6270] hover:text-[#10242E] hover:bg-[#E6ECEF] border border-transparent'
              }`}
              aria-label="Saved Items"
              title="Saved Items"
            >
              <Bookmark className="w-4 h-4 text-[#1D6FA5]" />
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="ml-0.5 text-xs font-bold tabular-nums text-[#1D6FA5]">
                  ({savedCount})
                </span>
              )}
            </button>

            {isAdminAuthenticated && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  if (window.location.pathname !== '/admin') {
                    window.history.pushState(null, '', '/admin');
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer tactile-press ${
                  activeTab === 'admin'
                    ? 'text-white liquid-glass-button'
                    : 'text-[#0d9488] hover:bg-white/60 border border-transparent'
                }`}
                aria-label="Admin Dashboard"
                title="Admin Dashboard"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Zone 3 (Desktop): Search Input + Filter Action */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[#4a6f7d] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!showRepositorySearch && e.target.value.trim()) {
                    setActiveTab('home');
                    onNavigateHome();
                  }
                }}
                placeholder="Search games, apps & mods..."
                className="w-full bg-white/75 text-[#0f2c38] text-sm placeholder:text-[#5c7f8c] pl-10 pr-9 py-2 rounded-2xl border border-white/90 focus:outline-none focus:border-[#0d9488]/60 focus:bg-white/90 focus:ring-2 focus:ring-[#0d9488]/15 shadow-[inset_0_2px_4px_rgba(22,82,94,0.06),0_2px_8px_rgba(255,255,255,0.6)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 rounded-xl text-[#4a6f7d] hover:text-[#0f2c38] hover:bg-white/70 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {onOpenFilters && (
              <button
                onClick={onOpenFilters}
                className={`min-w-[40px] min-h-[40px] p-2.5 rounded-2xl flex items-center justify-center cursor-pointer tactile-press shrink-0 ${
                  isFiltersOpen
                    ? 'text-white liquid-glass-button'
                    : 'liquid-glass-button-secondary text-[#2c4f5e] hover:text-[#0f2c38]'
                }`}
                aria-label="Toggle filters"
                title="Filter options"
              >
                <Filter className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Top Bar Right Action (Search Quick Focus + Filter Trigger on Discovery route only) */}
          {showRepositorySearch && (
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              <button
                onClick={handleMobileSearchJump}
                className="min-w-[44px] min-h-[44px] rounded-2xl liquid-glass-subtle flex items-center justify-center text-[#2c4f5e] cursor-pointer"
                aria-label="Focus search"
              >
                <Search className="w-4 h-4" />
              </button>
              {onOpenFilters && (
                <button
                  onClick={onOpenFilters}
                  className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center cursor-pointer tactile-press ${
                    isFiltersOpen
                      ? 'liquid-glass-button text-white'
                      : 'liquid-glass-subtle text-[#2c4f5e]'
                  }`}
                  aria-label="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Scrollable Search Capsule (Only shown on Discovery/Home route to keep Premium, Saved, and Admin clean) */}
      {showRepositorySearch && (
        <div className="md:hidden max-w-7xl w-full mx-auto px-4 pt-3">
          <div className="relative flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[#4a6f7d] pointer-events-none" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games, apps & mods..."
              aria-label="Search games, apps & mods"
              className="w-full min-h-[46px] bg-white/75 text-[#0f2c38] text-sm placeholder:text-[#5c7f8c] pl-11 pr-11 py-2.5 rounded-2xl border border-white/90 focus:outline-none focus:border-[#0d9488]/60 focus:bg-white/95 focus:ring-2 focus:ring-[#0d9488]/15 backdrop-blur-xl shadow-[0_8px_20px_-8px_rgba(22,82,94,0.12),inset_0_2px_4px_rgba(22,82,94,0.05)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 z-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#4a6f7d] hover:text-[#0f2c38] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar (Thumb Zone Ergonomics, <= 62px height) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/75 backdrop-blur-2xl saturate-150 border-t border-white/85 shadow-[0_-8px_24px_-8px_rgba(22,82,94,0.12)]"
        aria-label="Mobile Navigation"
      >
        <div
          className={`grid ${isAdminAuthenticated ? 'grid-cols-4' : 'grid-cols-3'} items-center h-[62px] max-w-md mx-auto px-2`}
        >
          <button
            onClick={() => {
              setActiveTab('home');
              onNavigateHome();
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl mx-1 tactile-press cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#D6F2EE] text-[#0F766E] border border-[#0D9488]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_0_rgba(13,148,136,0.2)]'
                : 'text-[#4A6270]'
            }`}
            aria-label="Discover"
          >
            <Compass className={`w-5 h-5 ${activeTab === 'home' ? 'text-[#0D9488]' : ''}`} />
            <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">Discover</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('premium');
              if (onNavigatePremium) onNavigatePremium();
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl mx-1 tactile-press cursor-pointer ${
              activeTab === 'premium'
                ? 'bg-[#FEF3C7] text-[#7C4A03] border border-[#D97706]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_0_rgba(217,119,6,0.2)]'
                : 'text-[#4A6270]'
            }`}
            aria-label="Premium Game"
          >
            <Crown className={`w-5 h-5 ${activeTab === 'premium' ? 'text-[#D97706]' : ''}`} />
            <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">Premium</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('saved');
              if (window.location.pathname !== '/saved') {
                window.history.pushState(null, '', '/saved');
              }
            }}
            className={`relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl mx-1 tactile-press cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-[#DBEAF6] text-[#165985] border border-[#1D6FA5]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_0_rgba(29,111,165,0.2)]'
                : 'text-[#4A6270]'
            }`}
            aria-label="Saved Items"
          >
            <div className="relative">
              <Bookmark className={`w-5 h-5 ${activeTab === 'saved' ? 'text-[#1D6FA5]' : ''}`} />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#1D6FA5] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {savedCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">Saved</span>
          </button>

          {isAdminAuthenticated && (
            <button
              onClick={() => {
                setActiveTab('admin');
                if (window.location.pathname !== '/admin') {
                  window.history.pushState(null, '', '/admin');
                }
              }}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl mx-1 tactile-press cursor-pointer ${
                activeTab === 'admin'
                  ? 'liquid-glass-button text-white'
                  : 'text-[#4a6f7d]'
              }`}
              aria-label="Admin Dashboard"
            >
              <Shield className="w-5 h-5" />
              <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};

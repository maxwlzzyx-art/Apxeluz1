import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { HotCategories } from './components/HotCategories';
import { BrowseFilters } from './components/BrowseFilters';
import { GameRow } from './components/GameRow';
import { GameCard } from './components/GameCard';
import { GameDetailModal } from './components/GameDetailModal';
import { DownloadModal } from './components/DownloadModal';
import { ModPage } from './components/ModPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { REGISTERED_MODS } from './data/games';
import { Game, FilterOptions } from './types/game';
import { Item, Category, WebsiteSettings } from './types/admin';
import { filterGames, sortGames } from './utils/gameFilters';
import { formatFileSize } from './utils/adminValidation';
import {
  Bookmark,
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeToPublishedItems,
  subscribeToCategories,
  subscribeToSettings,
} from './lib/firestoreService';
import { safeFetchJson } from './utils/apiClient';

function itemToGame(item: Item): Game {
  const fileSize = item.formattedFileSize || formatFileSize(item.fileSizeValue, item.fileSizeUnit);
  return {
    id: item.id,
    slug: item.slug,
    type: item.type,
    title: item.title,
    version: item.version,
    status: item.status,
    category: item.category as any,
    tags: item.tags || [],
    coverUrl: item.coverUrl,
    bannerUrl: item.bannerUrl,
    rating: item.rating || 5.0,
    ratingCount: item.ratingCount || 1,
    downloads: item.downloads || '0',
    downloadCount: item.downloadCount || 0,
    fileSize,
    formattedFileSize: fileSize,
    developer: item.developer,
    porter: item.porter,
    packageName: `com.apxeluz.${item.type}.${item.slug.replace(/[^a-z0-9]/g, '')}`,
    minAndroid: item.minAndroid || 'Android 8.0+',
    architecture: item.architecture || 'ARM64',
    obbRequired: Boolean(item.obbRequired),
    updatedDate: item.updatedDate || new Date().toISOString().split('T')[0],
    releaseDate: item.releaseDate || new Date().toISOString().split('T')[0],
    isNewlyAdded: item.isNewlyAdded,
    isFeatured: item.isFeatured,
    isPopular: item.isPopular,
    description: item.description,
    features: item.shortDescription ? [item.shortDescription] : [],
    screenshots: item.screenshots || [],
    changelog: item.changelog || [
      { version: item.version, date: item.updatedDate, changes: ['Initial release published'] },
    ],
    sha256: item.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    virusTotalClean: true,
    downloadFilename: `${item.slug}_${item.version}.apk`,
    downloadLinks: item.downloadLinks,
    versions: item.versions || [],
  };
}

function AppContent() {
  const { status, user, adminToken, adminUsername, signOut: authSignOut } = useAuth();

  // Routing State based on browser URL
  const [currentRoute, setCurrentRoute] = useState<{
    view: 'home' | 'saved' | 'item-detail' | 'admin-login' | 'admin-dashboard';
    slug?: string;
    itemType?: 'game' | 'app' | 'mod';
  }>(() => {
    const path = window.location.pathname;
    if (path === '/admin/login') {
      return { view: 'admin-login' };
    }
    if (path === '/admin') {
      return { view: 'admin-dashboard' };
    }
    if (path.startsWith('/mod/')) {
      return { view: 'item-detail', slug: path.slice('/mod/'.length).trim(), itemType: 'mod' };
    }
    if (path.startsWith('/game/')) {
      return { view: 'item-detail', slug: path.slice('/game/'.length).trim(), itemType: 'game' };
    }
    if (path.startsWith('/app/')) {
      return { view: 'item-detail', slug: path.slice('/app/'.length).trim(), itemType: 'app' };
    }
    if (path === '/saved') {
      return { view: 'saved' };
    }
    return { view: 'home' };
  });

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin/login') {
        setCurrentRoute({ view: 'admin-login' });
      } else if (path === '/admin') {
        setCurrentRoute({ view: 'admin-dashboard' });
      } else if (path.startsWith('/mod/')) {
        setCurrentRoute({ view: 'item-detail', slug: path.slice('/mod/'.length).trim(), itemType: 'mod' });
      } else if (path.startsWith('/game/')) {
        setCurrentRoute({ view: 'item-detail', slug: path.slice('/game/'.length).trim(), itemType: 'game' });
      } else if (path.startsWith('/app/')) {
        setCurrentRoute({ view: 'item-detail', slug: path.slice('/app/'.length).trim(), itemType: 'app' });
      } else if (path === '/saved') {
        setCurrentRoute({ view: 'saved' });
      } else {
        setCurrentRoute({ view: 'home' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    if (path === '/admin/login') {
      setCurrentRoute({ view: 'admin-login' });
    } else if (path === '/admin') {
      setCurrentRoute({ view: 'admin-dashboard' });
    } else if (path.startsWith('/mod/')) {
      setCurrentRoute({ view: 'item-detail', slug: path.slice('/mod/'.length).trim(), itemType: 'mod' });
    } else if (path.startsWith('/game/')) {
      setCurrentRoute({ view: 'item-detail', slug: path.slice('/game/'.length).trim(), itemType: 'game' });
    } else if (path.startsWith('/app/')) {
      setCurrentRoute({ view: 'item-detail', slug: path.slice('/app/'.length).trim(), itemType: 'app' });
    } else if (path === '/saved') {
      setCurrentRoute({ view: 'saved' });
    } else {
      setCurrentRoute({ view: 'home' });
    }
  };

  // Synchronize authenticated state with admin-login route:
  // If user is already authenticated and visits /admin/login, auto-redirect to /admin
  useEffect(() => {
    if (status === 'authenticated' && currentRoute.view === 'admin-login') {
      navigateTo('/admin');
    }
  }, [status, currentRoute.view]);

  // Persistent Server Database State
  const [rawItems, setRawItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);

  // Fallback REST fetcher for static/fullstack environments
  const fetchPublicData = useCallback(async () => {
    try {
      const [itemsRes, catsRes, settingsRes] = await Promise.all([
        safeFetchJson<Item[]>('/api/items'),
        safeFetchJson<Category[]>('/api/categories'),
        safeFetchJson<WebsiteSettings>('/api/settings'),
      ]);

      if (itemsRes.ok && Array.isArray(itemsRes.data) && itemsRes.data.length > 0) {
        setRawItems((prev) => (prev.length === 0 ? itemsRes.data! : prev));
      }
      if (catsRes.ok && Array.isArray(catsRes.data)) {
        setCategories((prev) => (prev.length === 0 ? catsRes.data! : prev));
      }
      if (settingsRes.ok && settingsRes.data) {
        setWebsiteSettings((prev) => prev || settingsRes.data!);
      }
    } catch (err) {
      console.warn('Public repository data REST fallback notice:', err);
    }
  }, []);

  // Real-Time Firestore Synchronization for Public Visitors & Admin
  // Changes in Firestore update the UI dynamically without any redeployment!
  useEffect(() => {
    const unsubItems = subscribeToPublishedItems(
      (firestoreItems) => {
        if (firestoreItems && firestoreItems.length > 0) {
          setRawItems(firestoreItems);
        } else {
          // Fallback to REST if Firestore collection empty or initializing
          fetchPublicData();
        }
      },
      (err) => {
        console.warn('Firestore subscription fallback:', err);
        fetchPublicData();
      }
    );

    const unsubCategories = subscribeToCategories((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    });

    const unsubSettings = subscribeToSettings((sett) => {
      if (sett) {
        setWebsiteSettings(sett);
      }
    });

    fetchPublicData();

    return () => {
      unsubItems();
      unsubCategories();
      unsubSettings();
    };
  }, [fetchPublicData]);

  // Map server items to public Game model
  const repositoryGames: Game[] = useMemo(() => {
    return rawItems.map(itemToGame);
  }, [rawItems]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'All',
    status: 'All',
    architecture: 'All',
    minAndroid: 'All',
    searchQuery: '',
    sortBy: 'latest',
  });

  // Modal States
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [downloadingGame, setDownloadingGame] = useState<Game | null>(null);

  // Saved / Bookmarks
  const [savedGameIds, setSavedGameIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('apxeluz_saved_items');
      return stored ? new Set(JSON.parse(stored)) : new Set([]);
    } catch {
      return new Set([]);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('apxeluz_saved_items', JSON.stringify(Array.from(savedGameIds)));
    } catch (e) {
      console.error('Failed to save bookmarks to localStorage', e);
    }
  }, [savedGameIds]);

  // Sync search query with filters
  useEffect(() => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, [searchQuery]);

  const handleToggleSave = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      category: 'All',
      status: 'All',
      architecture: 'All',
      minAndroid: 'All',
      searchQuery: '',
      sortBy: 'latest',
    });
    setSearchQuery('');
  };

  // Item lookup for shareable detail URLs
  const activeDetailItem = useMemo(() => {
    if (currentRoute.view !== 'item-detail' || !currentRoute.slug) return undefined;
    const slug = currentRoute.slug.toLowerCase();

    // Check server items
    const match = repositoryGames.find((g) => g.slug.toLowerCase() === slug);
    if (match) return match;

    // Check registered mods demo registry
    if (REGISTERED_MODS[slug]) return REGISTERED_MODS[slug];

    return undefined;
  }, [currentRoute, repositoryGames]);

  // Filtered & Sorted Games for general search view
  const filteredAndSortedGames = useMemo(() => {
    const filtered = filterGames(repositoryGames, filters);
    return sortGames(filtered, filters.sortBy);
  }, [repositoryGames, filters]);

  // Homepage collections
  const newlyAddedGames = useMemo(() => repositoryGames.filter((g) => g.isNewlyAdded), [repositoryGames]);
  const featuredGames = useMemo(() => repositoryGames.filter((g) => g.isFeatured), [repositoryGames]);
  const popularGames = useMemo(() => repositoryGames.filter((g) => g.isPopular), [repositoryGames]);
  const latestMods = useMemo(() => repositoryGames.filter((g) => g.type === 'mod'), [repositoryGames]);
  const savedGames = useMemo(() => repositoryGames.filter((g) => savedGameIds.has(g.id)), [repositoryGames, savedGameIds]);

  // Format categories for HotCategories component
  const hotCategoryItems = useMemo(() => {
    return categories.map((c) => ({
      id: c.name as any,
      name: c.name,
      icon: c.icon || 'Sparkles',
      count: c.itemCount || 0,
      color: 'from-[#0A84FF]/20 to-[#BF5AF2]/20',
    }));
  }, [categories]);

  const isBrowsingOrSearching = searchQuery.trim().length > 0 || (filters.category !== 'All' && repositoryGames.length > 0);

  // Handle Logout
  const handleAdminLogout = async () => {
    await authSignOut();
    navigateTo('/');
  };

  // Handle Login Success
  const handleAdminLoginSuccess = () => {
    navigateTo('/admin');
  };

  const isAdminAuthenticated = status === 'authenticated';

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#0A84FF]/30 selection:text-white">
      {/* Liquid Glass Header with APXELUZ Branding */}
      <Header
        activeTab={
          currentRoute.view === 'admin-dashboard'
            ? 'admin'
            : currentRoute.view === 'saved'
            ? 'saved'
            : 'home'
        }
        setActiveTab={(tab) => {
          if (tab === 'home') navigateTo('/');
          else if (tab === 'saved') navigateTo('/saved');
          else if (tab === 'admin') navigateTo('/admin');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        savedCount={savedGameIds.size}
        onOpenFilters={() => setIsFiltersOpen((prev) => !prev)}
        isFiltersOpen={isFiltersOpen}
        onNavigateHome={() => {
          handleResetFilters();
          navigateTo('/');
        }}
        onOpenAdminLogin={() => navigateTo('/admin/login')}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Website Announcement Banner if configured */}
      {websiteSettings?.announcement && (
        <div className="bg-[#0A84FF]/15 border-b border-[#0A84FF]/30 py-2 px-4 text-center text-xs text-white backdrop-blur-md">
          <span>{websiteSettings.announcement}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-16">
        {/* VIEW 1: Dedicated Shareable Item Page (/mod/:slug, /game/:slug, /app/:slug) */}
        {currentRoute.view === 'item-detail' ? (
          <ModPage
            slug={currentRoute.slug || ''}
            mod={activeDetailItem}
            onNavigateHome={() => navigateTo('/')}
            onOpenDownload={(item) => setDownloadingGame(item)}
            isSaved={activeDetailItem ? savedGameIds.has(activeDetailItem.id) : false}
            onToggleSave={handleToggleSave}
          />
        ) : currentRoute.view === 'admin-login' ? (
          /* VIEW 2: Admin Login */
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            onNavigateHome={() => navigateTo('/')}
          />
        ) : currentRoute.view === 'admin-dashboard' ? (
          /* VIEW 3: Admin CMS Dashboard with Robust Async Auth Guarding */
          status === 'loading' ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-3xl liquid-glass border border-white/20 flex items-center justify-center text-[#0A84FF] shadow-lg">
                <Loader2 className="w-7 h-7 animate-spin text-[#0A84FF]" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Verifying Administrator Session...
              </p>
              <p className="text-xs text-slate-400">
                Synchronizing with Firebase Authentication
              </p>
            </div>
          ) : status === 'unauthorized' ? (
            <div className="max-w-md mx-auto py-16 px-4">
              <div className="p-8 rounded-3xl liquid-glass border border-rose-500/30 text-center space-y-4 shadow-2xl">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h2 className="heading-font text-xl font-bold text-white">Access Denied</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Google account {user?.email ? `"${user.email}"` : ''} is not authorized for administrator access. Only authorized administrators are permitted.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => authSignOut()}
                    className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
                  >
                    Sign Out & Switch Account
                  </button>
                  <button
                    onClick={() => navigateTo('/')}
                    className="text-xs text-slate-400 hover:text-white py-1 transition-colors cursor-pointer"
                  >
                    Return to Public Repository
                  </button>
                </div>
              </div>
            </div>
          ) : status === 'authenticated' ? (
            <AdminDashboard
              adminToken={adminToken}
              adminUsername={adminUsername || user?.displayName || user?.email || 'Admin'}
              onLogout={handleAdminLogout}
              onNavigateHome={() => navigateTo('/')}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={handleAdminLoginSuccess}
              onNavigateHome={() => navigateTo('/')}
            />
          )
        ) : currentRoute.view === 'saved' ? (
          /* VIEW 4: Saved Items Collection */
          <section className="py-4 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Bookmark className="w-5 h-5 text-[#0A84FF]" />
                <h1 className="heading-font text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                  Saved Items ({savedGames.length})
                </h1>
              </div>
              <button
                onClick={() => navigateTo('/')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-[#0A84FF]" />
                <span>Back to Discover</span>
              </button>
            </div>

            {savedGames.length === 0 ? (
              <div className="text-center py-16 liquid-glass rounded-3xl border border-white/15 space-y-3.5">
                <Bookmark className="w-10 h-10 mx-auto text-slate-400" />
                <h3 className="heading-font text-lg font-bold text-white">No Saved Items</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Bookmark any mod, game, or application card to store it in your personal collection.
                </p>
                <button
                  onClick={() => navigateTo('/')}
                  className="px-5 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-xs cursor-pointer"
                >
                  Explore Repository
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {savedGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={setSelectedGame}
                    isSaved={true}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            )}
          </section>
        ) : isBrowsingOrSearching ? (
          /* VIEW 5: Search & Active Filter Results */
          <section className="py-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <button onClick={handleResetFilters} className="hover:text-white cursor-pointer">
                    Discover
                  </button>
                  <span>/</span>
                  <span className="text-[#0A84FF]">
                    {searchQuery ? `Search: "${searchQuery}"` : 'Browse All'}
                  </span>
                </div>
                <h1 className="heading-font text-xl sm:text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2.5">
                  <span>Search & Filter Results</span>
                  <span className="text-sm font-mono text-[#0A84FF]">
                    ({filteredAndSortedGames.length})
                  </span>
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                    isFiltersOpen
                      ? 'bg-[#0A84FF]/25 text-[#0A84FF] border-[#0A84FF]/50 shadow-sm'
                      : 'liquid-glass-subtle text-slate-300 hover:text-white border-white/15'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>

                {searchQuery && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-2 rounded-2xl liquid-glass-subtle border border-white/15 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Search</span>
                  </button>
                )}
              </div>
            </div>

            <BrowseFilters
              isOpen={isFiltersOpen}
              onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
              filters={filters}
              setFilters={setFilters}
              totalMatches={filteredAndSortedGames.length}
              onReset={handleResetFilters}
            />

            {filteredAndSortedGames.length === 0 ? (
              <div className="text-center py-20 liquid-glass rounded-3xl border border-white/15 space-y-3.5">
                <Search className="w-12 h-12 mx-auto text-slate-400" />
                <h3 className="heading-font text-lg font-bold text-white uppercase tracking-tight">
                  No Matching Items Found
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  {searchQuery
                    ? `No releases matched query "${searchQuery}".`
                    : 'The repository is currently waiting for new uploads.'}
                </p>
                <div className="pt-2 flex justify-center gap-2.5">
                  <button
                    onClick={handleResetFilters}
                    className="px-5 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-xs cursor-pointer"
                  >
                    Reset Search & Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredAndSortedGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={setSelectedGame}
                    isSaved={savedGameIds.has(game.id)}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* VIEW 6: Main Homepage in Liquid Glass */
          <div className="space-y-8">
            {/* 1. Hot Category Section */}
            <HotCategories
              selectedCategory={filters.category}
              onSelectCategory={(cat) => setFilters((prev) => ({ ...prev, category: cat }))}
              onSeeMore={() => setIsFiltersOpen(true)}
              categories={hotCategoryItems}
            />

            {/* 2. Browse All & Filters Button */}
            <BrowseFilters
              isOpen={isFiltersOpen}
              onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
              filters={filters}
              setFilters={setFilters}
              totalMatches={filteredAndSortedGames.length}
              onReset={handleResetFilters}
            />

            {/* 3. Newly Added Section */}
            <GameRow
              title="NEWLY ADDED"
              iconType="package"
              games={newlyAddedGames}
              onSelectGame={setSelectedGame}
              savedGameIds={savedGameIds}
              onToggleSave={handleToggleSave}
              emptyMessage="No newly added releases currently listed. The repository is cleared and ready for new uploads."
            />

            {/* 4. Featured Games Section */}
            <GameRow
              title="FEATURED GAMES"
              iconType="lightning"
              games={featuredGames}
              onSelectGame={setSelectedGame}
              savedGameIds={savedGameIds}
              onToggleSave={handleToggleSave}
              emptyMessage="No featured games curated at this time. Editorial picks will appear here."
            />

            {/* 5. Popular Games Section */}
            <GameRow
              title="POPULAR GAMES"
              iconType="trophy"
              games={popularGames}
              onSelectGame={setSelectedGame}
              savedGameIds={savedGameIds}
              onToggleSave={handleToggleSave}
              showRanking={true}
              emptyMessage="No trending download statistics recorded yet."
            />

            {/* 6. Latest Mods Section */}
            <GameRow
              title="LATEST MODS"
              iconType="sparkles"
              games={latestMods}
              onSelectGame={setSelectedGame}
              savedGameIds={savedGameIds}
              onToggleSave={handleToggleSave}
              emptyMessage="No community mods published in this collection yet. Direct URLs remain accessible."
            />
          </div>
        )}
      </main>

      {/* Footer in Liquid Glass */}
      <Footer />

      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onOpenDownload={(item) => {
            setSelectedGame(null);
            setDownloadingGame(item);
          }}
          isSaved={savedGameIds.has(selectedGame.id)}
          onToggleSave={handleToggleSave}
          allGames={repositoryGames}
          onSelectGame={(g) => setSelectedGame(g)}
          savedGameIds={savedGameIds}
          onOpenModPage={(slug) => {
            setSelectedGame(null);
            const targetType = selectedGame.type || 'mod';
            navigateTo(`/${targetType}/${slug}`);
          }}
        />
      )}

      {/* Dedicated Download Dialog with File Delivery */}
      {downloadingGame && (
        <DownloadModal
          game={downloadingGame}
          onClose={() => setDownloadingGame(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

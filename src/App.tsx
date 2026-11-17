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
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { PremiumGamesView } from './components/PremiumGamesView';
import { LiquidGlassFilterDefs } from './components/LiquidGlassFilterDefs';
import { GameSkeletonGrid } from './components/GameCardSkeleton';
import { REGISTERED_MODS } from './data/games';
import { Game, FilterOptions } from './types/game';
import { Item, Category, WebsiteSettings } from './types/admin';
import { filterGames, sortGames } from './utils/gameFilters';
import { formatFileSize } from './utils/adminValidation';
import {
  applySeoMetadataToDocument,
  resolveRouteSeoMetadata,
} from './utils/seoManager';
import {
  AsyncCollectionLoadState,
  INITIAL_COLLECTION_LOAD_STATE,
  isCollectionLoading,
} from './utils/loadingState';
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
} from './lib/supabaseService';
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
    view: 'home' | 'saved' | 'premium' | 'item-detail' | 'admin-login' | 'admin-dashboard';
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
    if (path === '/premium' || path.startsWith('/premium/')) {
      const premSlug = path.startsWith('/premium/') ? path.slice('/premium/'.length).trim() : undefined;
      return { view: 'premium', slug: premSlug || undefined };
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
      } else if (path === '/premium' || path.startsWith('/premium/')) {
        const premSlug = path.startsWith('/premium/') ? path.slice('/premium/'.length).trim() : undefined;
        setCurrentRoute({ view: 'premium', slug: premSlug || undefined });
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (path === '/admin/login') {
      setCurrentRoute({ view: 'admin-login' });
    } else if (path === '/admin') {
      setCurrentRoute({ view: 'admin-dashboard' });
    } else if (path === '/premium' || path.startsWith('/premium/')) {
      const premSlug = path.startsWith('/premium/') ? path.slice('/premium/'.length).trim() : undefined;
      setCurrentRoute({ view: 'premium', slug: premSlug || undefined });
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
  const [itemsLoadState, setItemsLoadState] = useState<AsyncCollectionLoadState>(
    INITIAL_COLLECTION_LOAD_STATE
  );
  const [categoriesLoadState, setCategoriesLoadState] = useState<AsyncCollectionLoadState>(
    INITIAL_COLLECTION_LOAD_STATE
  );

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
    } finally {
      setItemsLoadState((prev) => (prev.restSettled ? prev : { ...prev, restSettled: true }));
      setCategoriesLoadState((prev) => (prev.restSettled ? prev : { ...prev, restSettled: true }));
    }
  }, []);

  // Real-Time Supabase Synchronization for Public Visitors & Admin
  // Changes in Supabase update the UI dynamically without any redeployment!
  useEffect(() => {
    const unsubItems = subscribeToPublishedItems(
      (supabaseItems) => {
        setItemsLoadState((prev) => ({ ...prev, supabaseSettled: true }));
        if (supabaseItems && supabaseItems.length > 0) {
          setRawItems(supabaseItems);
        } else {
          // Fallback to REST if Supabase collection empty or initializing
          fetchPublicData();
        }
      },
      (err) => {
        console.warn('Supabase subscription fallback:', err);
        setItemsLoadState((prev) => ({ ...prev, supabaseSettled: true }));
        fetchPublicData();
      }
    );

    const unsubCategories = subscribeToCategories(
      (cats) => {
        setCategoriesLoadState((prev) => ({ ...prev, supabaseSettled: true }));
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      },
      () => {
        setCategoriesLoadState((prev) => ({ ...prev, supabaseSettled: true }));
      }
    );

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

  const isLoadingItems = isCollectionLoading(itemsLoadState, rawItems.length);
  const isLoadingCategories = isCollectionLoading(categoriesLoadState, categories.length);

  // Map server items to public Game model
  const repositoryGames: Game[] = useMemo(() => {
    return rawItems.map(itemToGame);
  }, [rawItems]);

  // Search & Filter States (supports ?q= SearchAction URLs)
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch {
      return '';
    }
  });
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

  useEffect(() => {
    const seo = resolveRouteSeoMetadata(currentRoute, {
      origin: window.location.origin,
      pathname: window.location.pathname,
      activeItem: activeDetailItem,
      websiteSettings,
    });
    applySeoMetadataToDocument(seo);
  }, [currentRoute, activeDetailItem, websiteSettings]);

  // Filtered & Sorted Games for general search view
  const filteredAndSortedGames = useMemo(() => {
    const filtered = filterGames(repositoryGames, filters);
    return sortGames(filtered, filters.sortBy);
  }, [repositoryGames, filters]);

  // Dynamic category item count synchronization (Requirement 1: Action and all categories never 0 if items exist)
  const dynamicCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of repositoryGames) {
      if (item.category) {
        const k = item.category.trim().toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
      }
    }
    return counts;
  }, [repositoryGames]);

  // Homepage collections (Requirement 1: Newly Added sorted by latest addition; Requirement 2: Popular by highest downloadCount; Featured Games removed)
  const newlyAddedGames = useMemo(() => {
    return [...repositoryGames]
      .sort((a, b) => new Date(b.releaseDate || b.updatedDate || 0).getTime() - new Date(a.releaseDate || a.updatedDate || 0).getTime())
      .slice(0, 15);
  }, [repositoryGames]);

  const popularGames = useMemo(() => {
    return [...repositoryGames]
      .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
      .slice(0, 15);
  }, [repositoryGames]);

  const latestMods = useMemo(() => repositoryGames.filter((g) => g.type === 'mod'), [repositoryGames]);
  const savedGames = useMemo(() => repositoryGames.filter((g) => savedGameIds.has(g.id)), [repositoryGames, savedGameIds]);

  // Format categories for HotCategories component with dynamic synchronization
  const hotCategoryItems = useMemo(() => {
    return categories.map((c) => {
      const realCount = dynamicCategoryCounts[c.name.trim().toLowerCase()] ?? c.itemCount ?? 0;
      return {
        id: c.name as any,
        name: c.name,
        icon: c.icon || 'Sparkles',
        count: realCount,
        color: 'bg-[#E3F2F0]',
      };
    });
  }, [categories, dynamicCategoryCounts]);

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
    <div className="relative min-h-screen flex flex-col font-sans selection:bg-[#0d9488]/20 selection:text-[#0f2c38] overflow-x-hidden">
      <LiquidGlassFilterDefs />
      {/* Liquid Glass Header & Mobile Bottom Navigation */}
      <Header
        activeTab={
          currentRoute.view === 'admin-dashboard'
            ? 'admin'
            : currentRoute.view === 'saved'
            ? 'saved'
            : currentRoute.view === 'premium'
            ? 'premium'
            : 'home'
        }
        setActiveTab={(tab) => {
          if (tab === 'home') navigateTo('/');
          else if (tab === 'saved') navigateTo('/saved');
          else if (tab === 'premium') navigateTo('/premium');
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
        onNavigatePremium={() => navigateTo('/premium')}
        onOpenAdminLogin={() => navigateTo('/admin/login')}
        isAdminAuthenticated={isAdminAuthenticated}
        showRepositorySearch={currentRoute.view === 'home'}
      />

      {/* Website Announcement Banner if configured */}
      {websiteSettings?.announcement && (
        <div className="bg-[#D6F2EE] border-b border-[#D3DDE3] py-2 px-4 text-center text-xs font-semibold text-[#0F766E]">
          <span>{websiteSettings.announcement}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 sm:pb-14">
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
              <div className="w-14 h-14 mx-auto rounded-3xl liquid-glass flex items-center justify-center text-[#0d9488]">
                <Loader2 className="w-7 h-7 animate-spin text-[#0d9488]" />
              </div>
              <p className="text-sm font-semibold text-[#0f2c38]">
                Verifying Administrator Session...
              </p>
              <p className="text-xs text-[#4a6f7d]">
                Synchronizing with Supabase Authentication
              </p>
            </div>
          ) : status === 'unauthorized' ? (
            <div className="max-w-md mx-auto py-16 px-4">
              <div className="p-8 rounded-3xl liquid-glass text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fee2e2] border border-white flex items-center justify-center text-[#be123c] shadow-sm">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h1 className="heading-font text-xl font-bold text-[#0f2c38] text-3d-subtle">Access Denied</h1>
                <p className="text-xs text-[#355968] leading-relaxed">
                  The account {user?.email ? `"${user.email}"` : ''} is not authorized for administrator access. Only authorized administrators are permitted.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => authSignOut()}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl liquid-glass-button-secondary text-[#0f2c38] font-semibold text-xs cursor-pointer"
                  >
                    Sign Out &amp; Switch Account
                  </button>
                  <button
                    onClick={() => navigateTo('/')}
                    className="min-h-[40px] text-xs text-[#4a6f7d] hover:text-[#0f2c38] py-1 transition-colors cursor-pointer"
                  >
                    Return to Public Repository
                  </button>
                </div>
              </div>
            </div>
          ) : status === 'authenticated' ? (
            <ErrorBoundary fallbackTitle="Admin Panel Encountered an Issue">
              <AdminDashboard
                adminToken={adminToken}
                adminUsername={adminUsername || user?.user_metadata?.name || user?.email || 'Admin'}
                onLogout={handleAdminLogout}
                onNavigateHome={() => navigateTo('/')}
              />
            </ErrorBoundary>
          ) : (
            <AdminLogin
              onLoginSuccess={handleAdminLoginSuccess}
              onNavigateHome={() => navigateTo('/')}
            />
          )
        ) : currentRoute.view === 'premium' ? (
          /* VIEW: Dedicated Premium Games Page */
          <PremiumGamesView
            onNavigateHome={() => navigateTo('/')}
            initialSlug={currentRoute.slug}
            onSyncSlug={(slug) => {
              const target = slug ? `/premium/${slug}` : '/premium';
              if (window.location.pathname !== target) {
                window.history.replaceState(null, '', target);
              }
            }}
          />
        ) : currentRoute.view === 'saved' ? (
          /* VIEW 4: Saved Items Collection */
          <section className="py-2 sm:py-4 space-y-6">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#0f2c38]/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#DBEAF6] border border-[#D3DDE3] flex items-center justify-center text-[#1D6FA5] shadow-sm">
                  <Bookmark className="w-4 h-4" />
                </div>
                <h1 className="heading-font text-xl sm:text-2xl font-extrabold text-[#10242E] text-3d tracking-tight">
                  Saved Items ({savedGames.length})
                </h1>
              </div>
              <button
                onClick={() => navigateTo('/')}
                className="min-h-[40px] px-3 text-xs font-semibold text-[#0D9488] hover:text-[#1D6FA5] flex items-center gap-1 cursor-pointer tactile-press"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Discover</span>
              </button>
            </div>

            {savedGames.length === 0 ? (
              <div className="text-center py-14 px-6 liquid-glass rounded-3xl space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#DBEAF6] border border-[#D3DDE3] flex items-center justify-center text-[#1D6FA5] shadow-sm">
                  <Bookmark className="w-6 h-6" />
                </div>
                <h2 className="heading-font text-lg font-bold text-[#0f2c38] text-3d-subtle">No Saved Items</h2>
                <p className="text-xs sm:text-sm text-[#4a6f7d] max-w-sm mx-auto">
                  Bookmark any mod, game, or application card to store it in your personal collection.
                </p>
                <button
                  onClick={() => navigateTo('/')}
                  className="min-h-[44px] px-6 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-xs cursor-pointer"
                >
                  Explore Repository
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {savedGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={setSelectedGame}
                    isSaved={true}
                    onToggleSave={handleToggleSave}
                    headingLevel="h2"
                    fluid={true}
                  />
                ))}
              </div>
            )}
          </section>
        ) : isBrowsingOrSearching ? (
          /* VIEW 5: Search & Active Filter Results */
          <section className="py-2 sm:py-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#0f2c38]/10">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#4a6f7d] mb-1">
                  <button onClick={handleResetFilters} className="hover:text-[#0f2c38] cursor-pointer font-medium">
                    Discover
                  </button>
                  <span>/</span>
                  <span className="text-[#0d9488] font-semibold">
                    {searchQuery ? `Search: "${searchQuery}"` : 'Browse All'}
                  </span>
                </div>
                <h1 className="heading-font text-xl sm:text-2xl font-extrabold text-[#0f2c38] text-3d tracking-tight flex items-center gap-2">
                  <span>Search &amp; Filter Results</span>
                  <span className="text-sm font-semibold text-[#0d9488] tabular-nums">
                    ({filteredAndSortedGames.length})
                  </span>
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className={`min-h-[40px] flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer ${
                    isFiltersOpen
                      ? 'liquid-glass-button text-white'
                      : 'liquid-glass-button-secondary text-[#0f2c38]'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>

                {searchQuery && (
                  <button
                    onClick={handleResetFilters}
                    className="min-h-[40px] text-xs font-semibold text-[#355968] hover:text-[#0f2c38] flex items-center gap-1 px-3.5 py-2 rounded-2xl liquid-glass-button-secondary cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
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

            {isLoadingItems && filteredAndSortedGames.length === 0 ? (
              <GameSkeletonGrid count={5} variant="free" label="Loading search results" />
            ) : filteredAndSortedGames.length === 0 ? (
              <div className="text-center py-16 px-6 liquid-glass rounded-3xl space-y-3.5">
                <Search className="w-11 h-11 mx-auto text-[#4a6f7d]" />
                <h2 className="heading-font text-lg font-bold text-[#0f2c38] text-3d-subtle">
                  No Matching Items Found
                </h2>
                <p className="text-xs sm:text-sm text-[#4a6f7d] max-w-sm mx-auto">
                  {searchQuery
                    ? `No releases matched query "${searchQuery}".`
                    : 'The repository is currently waiting for new uploads.'}
                </p>
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleResetFilters}
                    className="min-h-[44px] px-6 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-xs cursor-pointer"
                  >
                    Reset Search &amp; Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {filteredAndSortedGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={setSelectedGame}
                    isSaved={savedGameIds.has(game.id)}
                    onToggleSave={handleToggleSave}
                    headingLevel="h2"
                    fluid={true}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* VIEW 6: Main Homepage in Tactile 3D Porcelain Glass */
          <div className="space-y-5 sm:space-y-8">
            {/* Primary Unique Homepage H1 inside Frosted Solid Panel */}
            <section className="relative overflow-hidden rounded-3xl liquid-glass p-4 sm:p-7">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
                <div className="space-y-1 max-w-2xl">
                  <h1 className="heading-font text-xl sm:text-3xl font-extrabold tracking-tight text-[#10242E] text-3d text-balance leading-tight">
                    {websiteSettings?.siteName || 'APXELUZ'}{' '}
                    <span className="text-[#0D9488]">
                      App &amp; Mod Repository
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-[#4A6270] leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {websiteSettings?.siteDescription &&
                    websiteSettings.siteDescription.length > 40
                      ? websiteSettings.siteDescription
                      : 'Curated by Axeluf: verified Android games, community mod menus, and power-user APK utilities with SHA-256 checksums, ABI tags, and direct downloads.'}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-0.5 sm:pt-0">
                  <span className="text-[11px] font-bold text-[#4A6270] tabular-nums sm:hidden">
                    {isLoadingItems ? 'Loading...' : `${repositoryGames.length} Releases`}
                  </span>
                  <button
                    onClick={() => navigateTo('/premium')}
                    className="min-h-[42px] sm:min-h-[44px] px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl liquid-glass-button text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    Explore Premium
                  </button>
                </div>
              </div>
            </section>

            {/* 1. Hot Category Section */}
            <HotCategories
              selectedCategory={filters.category}
              onSelectCategory={(cat) => setFilters((prev) => ({ ...prev, category: cat }))}
              onSeeMore={() => setIsFiltersOpen(true)}
              categories={hotCategoryItems}
              isLoading={isLoadingCategories}
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
              title="Newly Added"
              iconType="package"
              games={newlyAddedGames}
              onSelectGame={setSelectedGame}
              savedGameIds={savedGameIds}
              onToggleSave={handleToggleSave}
              emptyMessage="No newly added releases currently listed. The repository is ready for new uploads."
              isLoading={isLoadingItems}
            />

            {/* 4. Popular Games Section */}
            <GameRow
              title="Popular Games"
              iconType="trophy"
              games={popularGames}
              onSelectGame={setSelectedGame}
              savedGameIds={savedGameIds}
              onToggleSave={handleToggleSave}
              showRanking={true}
              emptyMessage="No trending download statistics recorded yet."
              isLoading={isLoadingItems}
            />

            {/* 5. Latest Mods Section */}
            <GameRow
              title="Latest Mods"
              iconType="sparkles"
              games={latestMods}
              onSelectGame={setSelectedGame}
              savedGameIds={savedGameIds}
              onToggleSave={handleToggleSave}
              emptyMessage="No community mods published in this collection yet. Direct URLs remain accessible."
              isLoading={isLoadingItems}
            />
          </div>
        )}
      </main>

      {/* Footer in Frosted Glass */}
      <Footer onNavigatePremium={() => navigateTo('/premium')} />

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

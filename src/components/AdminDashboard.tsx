import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Gamepad2,
  Sparkles,
  Smartphone,
  FolderTree,
  Image as ImageIcon,
  Settings,
  UserCheck,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  Upload,
  ArrowUp,
  ArrowDown,
  Layers,
  Shield,
  HardDrive,
  Download,
  Crown,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { Item, Category, WebsiteSettings, AdminStats, ItemType } from '../types/admin';
import { PremiumGame, Order } from '../types/premium';
import { ItemFormModal } from './ItemFormModal';
import { AdminPremiumModal } from './AdminPremiumModal';
import { PRIMARY_ADMIN_EMAIL } from '../lib/auth';
import { safeFetchJson } from '../utils/apiClient';
import { slugify } from '../utils/adminValidation';
import {
  subscribeToAllAdminItems,
  subscribeToCategories,
  subscribeToSettings,
  subscribeToPremiumGames,
  deleteItemFromSupabase,
  toggleItemVisibilityInSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  saveSettingsToSupabase,
  savePremiumGameToSupabase,
  deletePremiumGameFromSupabase,
  ensureUUID,
} from '../lib/supabaseService';
import { uploadToSupabaseStorage } from '../lib/storageService';

interface AdminDashboardProps {
  adminToken: string;
  adminUsername: string;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminToken,
  adminUsername,
  onLogout,
  onNavigateHome,
}) => {
  const [activeSection, setActiveSection] = useState<
    | 'overview'
    | 'games'
    | 'apps'
    | 'premium'
    | 'categories'
    | 'images'
    | 'settings'
    | 'account'
  >('overview');

  // Server data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings>({
    siteName: 'APXELUZ',
    siteDescription: 'Next-generation app and mod repository designed with Apple\'s Liquid Glass interface.',
    announcement: '',
    enableDownloads: true,
    maintenanceMode: false,
    defaultArchitecture: 'ARM64',
  });
  const [premiumGames, setPremiumGames] = useState<PremiumGame[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalDefaultType, setItemModalDefaultType] = useState<ItemType>('game');
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Premium modal states
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [editingPremiumGame, setEditingPremiumGame] = useState<PremiumGame | null>(null);
  const [deletingPremiumGame, setDeletingPremiumGame] = useState<PremiumGame | null>(null);

  // Category editing state
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Sparkles');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Settings Form
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);

  // Copy feedback
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Image tester state
  const [testImageUrl, setTestImageUrl] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageUploadFeedback, setImageUploadFeedback] = useState<string | null>(null);

  // Fetch all administrative data (safely handles both full-stack and static deployments)
  const fetchData = async () => {
    try {
      const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined;

      const [statsRes, itemsRes, catsRes, settingsRes, premRes, ordersRes] = await Promise.all([
        safeFetchJson<AdminStats>('/api/admin/stats', { headers }),
        safeFetchJson<Item[]>('/api/admin/items', { headers }),
        safeFetchJson<Category[]>('/api/categories'),
        safeFetchJson<WebsiteSettings>('/api/admin/settings', { headers }),
        safeFetchJson<PremiumGame[]>('/api/admin/premium-games', { headers }),
        safeFetchJson<{ orders: Order[] }>('/api/admin/orders', { headers }),
      ]);

      if (statsRes.ok && statsRes.data) setStats(statsRes.data);
      if (itemsRes.ok && Array.isArray(itemsRes.data) && itemsRes.data.length > 0) setItems(itemsRes.data);
      if (catsRes.ok && Array.isArray(catsRes.data) && catsRes.data.length > 0) setCategories(catsRes.data);
      if (settingsRes.ok && settingsRes.data) setSettings(settingsRes.data);

      if (premRes.ok && Array.isArray(premRes.data) && premRes.data.length > 0) {
        setPremiumGames(premRes.data);
      } else {
        // Fallback: public endpoint /api/v1/premium-games
        const pubPremRes = await safeFetchJson<PremiumGame[]>('/api/v1/premium-games');
        if (pubPremRes.ok && Array.isArray(pubPremRes.data) && pubPremRes.data.length > 0) {
          setPremiumGames(pubPremRes.data);
        } else {
          // Fallback: localStorage cached premium games
          try {
            const cached = localStorage.getItem('apxeluz_cached_premium_games');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setPremiumGames(parsed);
              }
            }
          } catch {
            // Ignore
          }
        }
      }

      if (ordersRes.ok && Array.isArray(ordersRes.data?.orders)) setOrders(ordersRes.data.orders);
    } catch (err) {
      console.warn('Administrative data load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Supabase subscriptions for Administrator
  useEffect(() => {
    const unsubItems = subscribeToAllAdminItems((liveItems) => {
      const safeList = Array.isArray(liveItems) ? liveItems : [];
      setItems(safeList);
      setLoading(false);
      // Auto-compute live stats from Supabase collection
      const games = safeList.filter((i) => i && (i.type === 'game' || i.type === 'mod')).length;
      const apps = safeList.filter((i) => i && i.type === 'app').length;
      const downloads = safeList.reduce((acc, curr) => acc + (curr?.downloadCount || 0), 0);
      setStats((prev) => ({
        totalGames: games,
        totalMods: 0,
        totalApps: apps,
        totalCategories: prev?.totalCategories || 8,
        totalDownloads: downloads,
        recentItems: safeList.slice(0, 5),
      }));
    });

    const unsubCats = subscribeToCategories((liveCats) => {
      if (Array.isArray(liveCats) && liveCats.length > 0) {
        setCategories(liveCats);
        setStats((prev) => (prev ? { ...prev, totalCategories: liveCats.length } : null));
      }
    });

    const unsubSett = subscribeToSettings((liveSettings) => {
      if (liveSettings) setSettings(liveSettings);
    });

    const unsubPrem = subscribeToPremiumGames((livePrem) => {
      if (Array.isArray(livePrem) && livePrem.length > 0) {
        setPremiumGames(livePrem);
      }
    });

    fetchData();

    return () => {
      unsubItems();
      unsubCats();
      unsubSett();
      unsubPrem();
    };
  }, [adminToken]);

  // Copy public URL
  const handleCopyPublicUrl = (item: Item) => {
    const url = `${window.location.origin}/${item.type}/${item.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedSlug(item.slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Delete Item from Supabase
  const handleConfirmDeleteItem = async () => {
    if (!deletingItem) return;
    try {
      await deleteItemFromSupabase(deletingItem.id);
      fetch(`/api/admin/items/${deletingItem.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
      setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
      setDeletingItem(null);
    } catch (err) {
      console.error('Delete item error', err);
    }
  };

  // Toggle Item Visibility in Supabase
  const handleToggleVisibility = async (item: Item) => {
    const newVis = item.visibility === 'published' ? 'draft' : 'published';
    try {
      await toggleItemVisibilityInSupabase(item.id, newVis);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, visibility: newVis } : i)));
      safeFetchJson<Item>(`/api/admin/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ visibility: newVis }),
      }).catch(() => {});
    } catch (err) {
      console.error('Update visibility error', err);
    }
  };

  // Create or Update Category in Supabase
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const catId = editingCategory ? editingCategory.id : `cat-${Date.now()}`;
    const catObj: Category = {
      id: catId,
      name: newCatName.trim(),
      slug: newCatName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
      icon: newCatIcon,
      order: editingCategory ? editingCategory.order : categories.length,
      itemCount: editingCategory ? editingCategory.itemCount : 0,
    };

    try {
      await saveCategoryToSupabase(catObj);
      if (editingCategory) {
        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? catObj : c)));
        setEditingCategory(null);
      } else {
        setCategories((prev) => [...prev, catObj]);
      }
      setNewCatName('');
    } catch (err) {
      console.error('Category save error', err);
    }
  };

  // Delete Category from Supabase
  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategoryFromSupabase(deletingCategory.id);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      setDeletingCategory(null);
    } catch (err) {
      console.error('Delete category error', err);
    }
  };

  // Reorder Category
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= categories.length) return;

    const copy = [...categories];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);

    const orderedIds = copy.map((c) => c.id);
    setCategories(copy);

    try {
      await fetch('/api/admin/categories/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (err) {
      console.error('Reorder error', err);
    }
  };

  // Save Website Settings to Supabase
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await saveSettingsToSupabase(settings);
      fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(settings),
      }).catch(() => {});
      setSettingsFeedback('Website settings saved to Supabase successfully!');
      setTimeout(() => setSettingsFeedback(null), 3000);
    } catch (err) {
      console.error('Settings save error', err);
    }
  };

  // Image Upload Tester directly to Supabase Storage
  const handleImageUploadTester = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const storagePath = `gallery/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { promise } = uploadToSupabaseStorage(file, storagePath, undefined, 'screenshots');
      const res = await promise;
      setUploadedImages([res.downloadUrl, ...uploadedImages]);
      setImageUploadFeedback(`Uploaded to Supabase Storage: ${res.downloadUrl}`);
      setTimeout(() => setImageUploadFeedback(null), 4000);
    } catch (storageErr) {
      console.warn('Storage upload fallback:', storageErr);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const apiRes = await safeFetchJson<{ url: string }>('/api/admin/upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              filename: file.name,
              base64Data,
            }),
          });

          if (apiRes.ok && apiRes.data?.url) {
            const uploaded = apiRes.data.url;
            setUploadedImages([uploaded, ...uploadedImages]);
            setImageUploadFeedback(`Uploaded: ${uploaded}`);
            setTimeout(() => setImageUploadFeedback(null), 3000);
          }
        } catch (err) {
          console.error('Tester upload error', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Premium Games Handlers (Requirement 4 & 5)
  const handleSavePremiumGame = async (gameData: Partial<PremiumGame>) => {
    try {
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      };

      if (gameData.id) {
        await safeFetchJson(`/api/admin/premium-games/${gameData.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(gameData),
        });
      } else {
        await safeFetchJson('/api/admin/premium-games', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(gameData),
        });
      }
      try {
        await savePremiumGameToSupabase(gameData);
      } catch (e) {
        // Non-fatal
      }
      fetchData();
    } catch (err) {
      console.error('Save premium game error:', err);
    }
  };

  const handleDeletePremiumGame = async () => {
    if (!deletingPremiumGame) return;
    try {
      const authHeaders: Record<string, string> = adminToken
        ? { Authorization: `Bearer ${adminToken}` }
        : {};
      await safeFetchJson(`/api/admin/premium-games/${deletingPremiumGame.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      try {
        await deletePremiumGameFromSupabase(deletingPremiumGame.id);
      } catch (e) {
        // Non-fatal
      }
      setPremiumGames((prev) => prev.filter((p) => p.id !== deletingPremiumGame.id));
      setDeletingPremiumGame(null);
    } catch (err) {
      console.error('Delete premium game error:', err);
    }
  };

  const handleTogglePremiumActive = async (game: PremiumGame) => {
    try {
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      };

      const updated = { ...game, isActive: !game.isActive };
      await safeFetchJson(`/api/admin/premium-games/${game.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ isActive: !game.isActive }),
      });
      try {
        await savePremiumGameToSupabase(updated);
      } catch (e) {
        // Non-fatal
      }
      setPremiumGames((prev) => prev.map((p) => (p.id === game.id ? updated : p)));
    } catch (err) {
      console.error('Toggle premium active error:', err);
    }
  };

  const safeItems = Array.isArray(items) ? items : [];
  // Requirement 2: Merge Game and Mod into Games; Merge App and Mod into Apps
  const gamesList = safeItems.filter((i) => i && (i.type === 'game' || i.type === 'mod'));
  const appsList = safeItems.filter((i) => i && i.type === 'app');
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <div className="w-full max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-6 space-y-6 text-left">
      {/* Top Header Bar */}
      <div className="p-5 sm:p-6 rounded-[28px] liquid-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl liquid-glass-subtle flex items-center justify-center text-[#0d9488] flex-shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-[#0f2c38] text-3d-subtle tracking-tight">
                APXELUZ Control Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#d7f5eb] text-[#0f766e] border border-[#99e8cc]">
                Administrator
              </span>
            </div>
            <p className="text-xs text-[#355968]">
              Logged in as <strong className="text-[#0f2c38]">{adminUsername}</strong> • Full CMS Write Access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={onNavigateHome}
            className="flex-1 md:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button-secondary text-xs font-semibold text-[#0f2c38] cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#0284c7]" />
            <span>View Public Site</span>
          </button>

          <button
            onClick={onLogout}
            className="flex-1 md:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors tactile-press cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs for the 8 Admin Sections */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard, count: undefined },
          { id: 'games', label: 'Games & Mods', icon: Gamepad2, count: gamesList.length },
          { id: 'apps', label: 'Apps & Tools', icon: Smartphone, count: appsList.length },
          { id: 'premium', label: 'Premium Games', icon: Crown, count: premiumGames.length },
          { id: 'categories', label: 'Categories', icon: FolderTree, count: safeCategories.length },
          { id: 'images', label: 'Image Storage', icon: ImageIcon, count: undefined },
          { id: 'settings', label: 'Website Settings', icon: Settings, count: undefined },
          { id: 'account', label: 'Account', icon: UserCheck, count: undefined },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`snap-start flex-shrink-0 min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer ${
                isActive
                  ? 'liquid-glass-button text-white'
                  : 'liquid-glass-subtle text-[#355968] hover:text-[#0f2c38]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#0284c7]'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/25 text-white' : 'bg-white/80 text-[#0f2c38]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Real Database Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-3xl liquid-glass-card space-y-1">
              <div className="flex items-center justify-between text-[#4a6f7d] text-xs font-semibold">
                <span>Total Games</span>
                <Gamepad2 className="w-4 h-4 text-[#0284c7]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f2c38] text-3d-subtle font-mono">
                {stats?.totalGames || 0}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl liquid-glass-card space-y-1">
              <div className="flex items-center justify-between text-[#4a6f7d] text-xs font-semibold">
                <span>Total Mods</span>
                <Sparkles className="w-4 h-4 text-[#0d9488]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f2c38] text-3d-subtle font-mono">
                {stats?.totalMods || 0}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl liquid-glass-card space-y-1">
              <div className="flex items-center justify-between text-[#4a6f7d] text-xs font-semibold">
                <span>Total Apps</span>
                <Smartphone className="w-4 h-4 text-[#0284c7]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f2c38] text-3d-subtle font-mono">
                {stats?.totalApps || 0}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl liquid-glass-card space-y-1">
              <div className="flex items-center justify-between text-[#4a6f7d] text-xs font-semibold">
                <span>Categories</span>
                <FolderTree className="w-4 h-4 text-[#0d9488]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f2c38] text-3d-subtle font-mono">
                {stats?.totalCategories || 0}
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-5 rounded-3xl liquid-glass space-y-3">
            <h2 className="heading-font text-xs font-extrabold text-[#0f2c38] uppercase tracking-wider">
              Quick Administration Actions
            </h2>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setItemModalDefaultType('game');
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Game</span>
              </button>

              <button
                onClick={() => {
                  setItemModalDefaultType('mod');
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Mod</span>
              </button>

              <button
                onClick={() => {
                  setItemModalDefaultType('app');
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add App</span>
              </button>

              <button
                onClick={() => setActiveSection('categories')}
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button-secondary text-xs font-bold text-[#0f2c38] cursor-pointer"
              >
                <FolderTree className="w-4 h-4 text-[#0d9488]" />
                <span>Manage Categories</span>
              </button>
            </div>
          </div>

          {/* Recently Added Content */}
          <div className="p-5 sm:p-6 rounded-3xl liquid-glass space-y-4">
            <h2 className="heading-font text-sm font-extrabold text-[#0f2c38] uppercase tracking-wider">
              Recently Managed Content
            </h2>
            {items.length === 0 ? (
              <p className="text-xs text-[#4a6f7d]">
                Database currently empty. Use the quick actions above to add games, mods, or apps.
              </p>
            ) : (
              <div className="divide-y divide-[#0f2c38]/10">
                {items.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-12 rounded-xl overflow-hidden bg-white/80 border border-white flex-shrink-0">
                        <img src={item.coverUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#0f2c38] truncate">{item.title}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#dff1ff] text-[#0369a1]">
                            /{item.type}/{item.slug}
                          </span>
                        </div>
                        <div className="text-xs text-[#4a6f7d]">
                          {item.formattedFileSize} • {item.category} • {item.visibility}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleCopyPublicUrl(item)}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] cursor-pointer"
                        title="Copy Public URL"
                      >
                        {copiedSlug === item.slug ? <Check className="w-4 h-4 text-[#0d9488]" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsItemModalOpen(true);
                        }}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl liquid-glass-subtle text-[#0284c7] cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTIONS 2 & 3: CONTENT MANAGEMENT (GAMES & MODS / APPS) */}
      {(activeSection === 'games' || activeSection === 'apps') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="heading-font text-lg font-extrabold text-[#0f2c38] text-3d-subtle uppercase tracking-wider">
                Manage {activeSection === 'games' ? 'Games & Mods' : 'Apps'}
              </h2>
              <p className="text-xs text-[#355968]">
                Create, edit, toggle visibility, and delete {activeSection === 'games' ? 'games and mods' : 'apps'}. All changes reflect instantly on the public website.
              </p>
            </div>
            <button
              onClick={() => {
                setItemModalDefaultType(activeSection === 'games' ? 'game' : 'app');
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              className="min-h-[44px] flex items-center gap-1.5 px-5 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New {activeSection === 'games' ? 'Game/Mod' : 'App'}</span>
            </button>
          </div>

          {/* Table / List */}
          <div className="p-4 sm:p-6 rounded-3xl liquid-glass overflow-x-auto">
            {(activeSection === 'games' ? gamesList : appsList).length === 0 ? (
              <div className="text-center py-14 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl liquid-glass-subtle flex items-center justify-center text-[#4a6f7d]">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#0f2c38]">No {activeSection} found in database</h3>
                <p className="text-xs text-[#4a6f7d] max-w-sm mx-auto">
                  Click the "Add New" button above to publish your first {activeSection === 'games' ? 'game' : 'app'}.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-[#355968]">
                <thead>
                  <tr className="border-b border-[#0f2c38]/10 text-[#4a6f7d] uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pl-2">Item</th>
                    <th className="pb-3">URL Slug</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Visibility</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f2c38]/10">
                  {(activeSection === 'games' ? gamesList : appsList).map((item) => (
                    <tr key={item.id} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded-xl overflow-hidden bg-white/80 border border-white flex-shrink-0">
                            <img src={item.coverUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="font-bold text-[#0f2c38]">{item.title}</div>
                            <div className="text-[10px] text-[#4a6f7d]">
                              {item.version} • {item.developer}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[#0284c7]">
                        /{item.type}/{item.slug}
                      </td>
                      <td className="py-3">{item.category}</td>
                      <td className="py-3 font-mono">{item.formattedFileSize}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleVisibility(item)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 cursor-pointer ${
                            item.visibility === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white/80 text-[#4a6f7d] border-[#0f2c38]/15'
                          }`}
                        >
                          {item.visibility === 'published' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{item.visibility}</span>
                        </button>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyPublicUrl(item)}
                            className="p-2 rounded-xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] cursor-pointer"
                            title="Copy URL"
                          >
                            {copiedSlug === item.slug ? <Check className="w-3.5 h-3.5 text-[#0d9488]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={`/${item.type}/${item.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38]"
                            title="Open Public Preview"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsItemModalOpen(true);
                            }}
                            className="p-2 rounded-xl liquid-glass-subtle text-[#0284c7] cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingItem(item)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: CATEGORY MANAGEMENT */}
      {activeSection === 'categories' && (
        <div className="space-y-6">
          <div>
            <h2 className="heading-font text-lg font-extrabold text-[#0f2c38] text-3d-subtle uppercase tracking-wider">
              Category Management
            </h2>
            <p className="text-xs text-[#355968]">
              Create, rename, reorder, and remove categories. Visitors only view categories and browse their assigned items.
            </p>
          </div>

          {/* Create Category Form */}
          <form onSubmit={handleSaveCategory} className="p-5 rounded-3xl liquid-glass flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-grow w-full">
              <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Action, RPG, Simulation, Tools"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488] shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>

            <div className="w-full sm:w-48">
              <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                Icon
              </label>
              <select
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
              >
                <option value="Sparkles" className="bg-[#f2faf7] text-[#0f2c38]">Sparkles</option>
                <option value="Sword" className="bg-[#f2faf7] text-[#0f2c38]">Sword</option>
                <option value="Compass" className="bg-[#f2faf7] text-[#0f2c38]">Compass</option>
                <option value="Layers" className="bg-[#f2faf7] text-[#0f2c38]">Layers</option>
                <option value="Shield" className="bg-[#f2faf7] text-[#0f2c38]">Shield</option>
                <option value="Cpu" className="bg-[#f2faf7] text-[#0f2c38]">Cpu</option>
                <option value="Gauge" className="bg-[#f2faf7] text-[#0f2c38]">Gauge</option>
                <option value="Trophy" className="bg-[#f2faf7] text-[#0f2c38]">Trophy</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white flex-shrink-0 cursor-pointer"
            >
              {editingCategory ? 'Update Category' : '+ Create Category'}
            </button>
            {editingCategory && (
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setNewCatName('');
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl liquid-glass-button-secondary text-xs font-semibold text-[#355968] hover:text-[#0f2c38] cursor-pointer"
              >
                Cancel
              </button>
            )}
          </form>

          {/* Categories List */}
          <div className="p-4 sm:p-6 rounded-3xl liquid-glass space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-[#4a6f7d] py-6 text-center">
                No categories created yet. Use the form above to add your first category.
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-2xl liquid-glass-subtle flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-mono text-xs text-[#4a6f7d] font-bold">
                        #{idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-white/80 border border-white flex items-center justify-center text-[#0d9488]">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[#0f2c38]">{cat.name}</div>
                        <div className="text-[11px] text-[#4a6f7d]">
                          /{cat.slug} • {cat.itemCount || 0} items assigned
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMoveCategory(idx, 'up')}
                        disabled={idx === 0}
                        className="p-2 rounded-xl liquid-glass-subtle text-[#355968] disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveCategory(idx, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-2 rounded-xl liquid-glass-subtle text-[#355968] disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setNewCatName(cat.name);
                          setNewCatIcon(cat.icon);
                        }}
                        className="p-2 rounded-xl liquid-glass-subtle text-[#0284c7] cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(cat)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 6: IMAGE MANAGEMENT */}
      {activeSection === 'images' && (
        <div className="space-y-6">
          <div>
            <h2 className="heading-font text-lg font-extrabold text-[#0f2c38] text-3d-subtle uppercase tracking-wider">
              Image Management & Uploads
            </h2>
            <p className="text-xs text-[#355968]">
              Upload images directly to server storage (/uploads), validate remote image URLs, and preview media.
            </p>
          </div>

          {imageUploadFeedback && (
            <div className="p-3.5 rounded-2xl bg-[#dff1ff] border border-[#a2ddfc] text-[#0369a1] text-xs font-medium">
              {imageUploadFeedback}
            </div>
          )}

          {/* Upload Widget */}
          <div className="p-6 rounded-3xl liquid-glass space-y-4">
            <h3 className="heading-font text-xs font-bold text-[#0f2c38] uppercase tracking-wider">
              Direct File Upload to Server
            </h3>
            <label className="border-2 border-dashed border-[#0d9488]/35 hover:border-[#0d9488] rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/55">
              <Upload className="w-8 h-8 text-[#0284c7] mb-2" />
              <span className="text-sm font-bold text-[#0f2c38]">Click or drag an image here to upload</span>
              <span className="text-xs text-[#4a6f7d] mt-1">Supports PNG, JPEG, WEBP, SVG (up to 8MB)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUploadTester}
                className="hidden"
              />
            </label>
          </div>

          {/* URL Tester */}
          <div className="p-6 rounded-3xl liquid-glass space-y-4">
            <h3 className="heading-font text-xs font-bold text-[#0f2c38] uppercase tracking-wider">
              Test & Preview Image URL
            </h3>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/cover.png"
                value={testImageUrl}
                onChange={(e) => setTestImageUrl(e.target.value)}
                className="w-full min-h-[44px] bg-white/80 text-xs text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 font-mono outline-none focus:border-[#0d9488]"
              />
            </div>
            {testImageUrl && (
              <div className="p-4 rounded-2xl liquid-glass-subtle flex items-center justify-center">
                <img
                  src={testImageUrl}
                  alt="Test preview"
                  referrerPolicy="no-referrer"
                  className="max-h-60 rounded-2xl object-contain border border-white"
                  onError={() =>
                    setImageUploadFeedback('Gagal memuat pratinjau gambar. Pastikan URL valid atau tidak diblokir CORS.')
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 7: WEBSITE SETTINGS */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          <div>
            <h2 className="heading-font text-lg font-extrabold text-[#0f2c38] text-3d-subtle uppercase tracking-wider">
              Website Settings
            </h2>
            <p className="text-xs text-[#355968]">
              Configure repository branding, global download toggles, and system maintenance mode.
            </p>
          </div>

          {settingsFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {settingsFeedback}
            </div>
          )}

          {settings && (
            <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl liquid-glass space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Site Description
                </label>
                <input
                  type="text"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Announcement Banner (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Server maintenance scheduled for midnight UTC"
                  value={settings.announcement || ''}
                  onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#355968] font-medium">
                  <input
                    type="checkbox"
                    checked={settings.enableDownloads}
                    onChange={(e) => setSettings({ ...settings, enableDownloads: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#0d9488]"
                  />
                  <span>Enable Public Downloads</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#355968] font-medium">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 rounded accent-rose-600"
                  />
                  <span>Maintenance Mode (Public site displays maintenance notification)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#0f2c38]/10 flex justify-end">
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SECTION 8: ACCOUNT SETTINGS */}
      {activeSection === 'account' && (
        <div className="space-y-6">
          <div>
            <h2 className="heading-font text-lg font-extrabold text-[#0f2c38] text-3d-subtle uppercase tracking-wider">
              Administrator Authentication
            </h2>
            <p className="text-xs text-[#355968]">
              Your administrative session is protected by Supabase Authentication with Row-Level Security and Role-Based Authorization.
            </p>
          </div>

          <div className="p-6 rounded-3xl liquid-glass space-y-5 max-w-xl">
            <div className="flex items-center gap-3 pb-4 border-b border-[#0f2c38]/10">
              <div className="w-12 h-12 rounded-2xl liquid-glass-subtle flex items-center justify-center text-[#0d9488]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0f2c38] flex flex-wrap items-center gap-2">
                  <span>{adminUsername}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    Authorized Admin
                  </span>
                </h3>
                <p className="text-xs text-[#4a6f7d] mt-0.5">Supabase Auth Provider (Email & Password)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-1">
                <span className="text-[11px] text-[#4a6f7d] uppercase font-semibold block">Primary Admin</span>
                <span className="text-[#0f2c38] font-mono text-[11px] font-semibold break-all">{PRIMARY_ADMIN_EMAIL}</span>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-1">
                <span className="text-[11px] text-[#4a6f7d] uppercase font-semibold block">Session Persistence</span>
                <span className="text-[#0d9488] font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Retained Across Sessions</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-1">
                <span className="text-[11px] text-[#4a6f7d] uppercase font-semibold block">Access Role</span>
                <span className="text-[#0f2c38] font-semibold">Full Repository CMS & Downloads</span>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-1">
                <span className="text-[#355968] font-mono text-[11px]">
                  Bearer ••••••••{(adminToken || '').slice(-6) || 'active'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#0f2c38]/10 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#4a6f7d]">Want to terminate this session?</span>
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[42px] flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: PREMIUM GAMES & QIOSPAY TRANSACTIONS (Requirement 4 & 5) */}
      {activeSection === 'premium' && (
        <div className="space-y-6">
          {/* Top Actions & Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl liquid-glass">
            <div>
              <h2 className="heading-font text-lg font-extrabold text-[#0f2c38] text-3d-subtle flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <span>Manajemen Game Premium & Transaksi QiosPay</span>
              </h2>
              <p className="text-xs text-[#355968] mt-1">
                Kelola katalog game berbayar, harga IDR, file unduhan, dan pantau status transaksi QiosPay secara real-time.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPremiumGame(null);
                setIsPremiumModalOpen(true);
              }}
              className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl liquid-glass-button text-white font-bold text-xs cursor-pointer flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Game Premium</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-3xl liquid-glass-card space-y-1">
              <span className="text-[11px] text-[#4a6f7d] uppercase font-semibold">Total Game Premium</span>
              <div className="text-2xl font-extrabold text-[#0f2c38] font-mono">{premiumGames.length}</div>
            </div>

            <div className="p-4 rounded-3xl liquid-glass-card space-y-1">
              <span className="text-[11px] text-[#4a6f7d] uppercase font-semibold">Total Pesanan</span>
              <div className="text-2xl font-extrabold text-[#0f2c38] font-mono">{orders.length}</div>
            </div>

            <div className="p-4 rounded-3xl liquid-glass-card space-y-1">
              <span className="text-[11px] text-[#4a6f7d] uppercase font-semibold">Pesanan Terbayar (PAID)</span>
              <div className="text-2xl font-extrabold text-[#0d9488] font-mono">
                {orders.filter((o) => o.status === 'PAID').length}
              </div>
            </div>

            <div className="p-4 rounded-3xl liquid-glass-card space-y-1">
              <span className="text-[11px] text-[#4a6f7d] uppercase font-semibold">Total Pendapatan (IDR)</span>
              <div className="text-xl font-extrabold text-[#0284c7] font-mono">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                  orders.filter((o) => o.status === 'PAID').reduce((acc, curr) => acc + (curr.amount || 0), 0)
                )}
              </div>
            </div>
          </div>

          {/* Premium Games Table */}
          <div className="rounded-3xl liquid-glass overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#0f2c38]/10 flex items-center justify-between">
              <h3 className="heading-font text-sm font-extrabold text-[#0f2c38] uppercase tracking-wider flex items-center gap-2">
                <span>Daftar Produk Premium</span>
                <span className="text-xs font-mono text-[#0284c7]">({premiumGames.length})</span>
              </h3>
            </div>

            {premiumGames.length === 0 ? (
              <div className="text-center py-12 text-[#4a6f7d] text-xs">
                Belum ada produk game premium yang terdaftar. Klik "Tambah Game Premium" untuk menambahkan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/50 text-[#4a6f7d] border-b border-[#0f2c38]/10">
                    <tr>
                      <th className="py-3 px-4">Game</th>
                      <th className="py-3 px-4">Harga (IDR)</th>
                      <th className="py-3 px-4">Versi & Ukuran</th>
                      <th className="py-3 px-4">Status Aktif</th>
                      <th className="py-3 px-4">Visibilitas</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0f2c38]/10 text-[#355968]">
                    {premiumGames.map((game) => (
                      <tr key={game.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={game.iconUrl || game.coverUrl}
                              alt={game.title}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-xl object-cover bg-white/80 border border-white"
                            />
                            <div>
                              <span className="font-bold text-[#0f2c38] block">{game.title}</span>
                              <span className="text-[10px] text-[#4a6f7d] font-mono">/{game.slug}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#0f766e]">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(game.price)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#355968]">
                          {game.version} • {game.fileSize}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleTogglePremiumActive(game)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer border transition-colors ${
                              game.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {game.isActive ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                              game.visibility === 'published'
                                ? 'text-[#0f766e] bg-[#d7f5eb]'
                                : 'text-[#4a6f7d] bg-white/70'
                            }`}
                          >
                            {game.visibility || 'published'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPremiumGame(game);
                                setIsPremiumModalOpen(true);
                              }}
                              className="p-2 rounded-xl liquid-glass-subtle text-[#0284c7] cursor-pointer"
                              title="Edit Produk"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingPremiumGame(game)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* QiosPay Orders & Transaction Logs Table */}
          <div className="rounded-3xl liquid-glass overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#0f2c38]/10 flex items-center justify-between">
              <h3 className="heading-font text-sm font-extrabold text-[#0f2c38] uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0284c7]" />
                <span>Riwayat Transaksi & Pembayaran QiosPay</span>
                <span className="text-xs font-mono text-[#0284c7]">({orders.length})</span>
              </h3>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12 text-[#4a6f7d] text-xs">
                Belum ada transaksi pembayaran yang tercatat. Transaksi pembelian akan muncul otomatis di sini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/50 text-[#4a6f7d] border-b border-[#0f2c38]/10">
                    <tr>
                      <th className="py-3 px-4">Order ID & QiosPay Invoice</th>
                      <th className="py-3 px-4">Pembeli</th>
                      <th className="py-3 px-4">Produk</th>
                      <th className="py-3 px-4">Nominal</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Tanggal Transaksi</th>
                      <th className="py-3 px-4 text-right">Akses Unduhan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0f2c38]/10 text-[#355968]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#0f2c38] block">{order.id}</span>
                          <span className="text-[10px] text-[#4a6f7d] font-mono">{order.qiospayInvoiceId || '-'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#0f2c38] block">{order.customerName}</span>
                          <span className="text-[10px] text-[#4a6f7d] font-mono">{order.customerEmail}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0f2c38]">{order.gameTitle}</td>
                        <td className="py-3 px-4 font-mono font-bold text-[#0f766e]">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                              order.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : order.status === 'EXPIRED' || order.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#4a6f7d] font-mono text-[11px]">
                          {new Date(order.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[10px]">
                          {order.status === 'PAID' ? (
                            <span className="text-[#0d9488] font-bold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Token Diberikan</span>
                            </span>
                          ) : (
                            <span className="text-[#4a6f7d]">Menunggu Pembayaran</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium Game Form Modal */}
      <AdminPremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => {
          setIsPremiumModalOpen(false);
          setEditingPremiumGame(null);
        }}
        onSave={handleSavePremiumGame}
        initialGame={editingPremiumGame}
      />

      {/* Delete Premium Game Confirmation Dialog */}
      {deletingPremiumGame && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setDeletingPremiumGame(null)}
        >
          <div
            className="w-full max-w-md liquid-glass rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="heading-font text-base font-extrabold text-[#0f2c38] uppercase tracking-wider">
                Hapus Game Premium
              </h3>
            </div>
            <p className="text-xs text-[#355968]">
              Apakah Anda yakin ingin menghapus produk game premium{' '}
              <strong className="text-[#0f2c38] font-bold">{deletingPremiumGame.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingPremiumGame(null)}
                className="min-h-[42px] px-4 py-2 rounded-2xl liquid-glass-button-secondary text-xs font-semibold text-[#355968] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeletePremiumGame}
                className="min-h-[42px] px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer tactile-press"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal (Create & Edit) */}
      {isItemModalOpen && (
        <ItemFormModal
          initialItem={editingItem}
          defaultType={itemModalDefaultType}
          categories={categories}
          adminToken={adminToken}
          onClose={() => setIsItemModalOpen(false)}
          onSaved={() => {
            fetchData();
          }}
        />
      )}

      {/* Delete Item Confirmation Dialog */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setDeletingItem(null)}
        >
          <div
            className="w-full max-w-md liquid-glass rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="heading-font text-base font-extrabold text-[#0f2c38] uppercase tracking-wider">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-xs text-[#355968]">
              Are you sure you want to permanently delete{' '}
              <strong className="text-[#0f2c38] font-bold">{deletingItem.title}</strong>? This action cannot be undone and will remove it from the public repository.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="min-h-[42px] px-4 py-2 rounded-2xl liquid-glass-button-secondary text-xs font-semibold text-[#355968] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteItem}
                className="min-h-[42px] px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer tactile-press"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {deletingCategory && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setDeletingCategory(null)}
        >
          <div
            className="w-full max-w-md liquid-glass rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="heading-font text-base font-extrabold text-[#0f2c38] uppercase tracking-wider">
                Delete Category
              </h3>
            </div>
            <p className="text-xs text-[#355968]">
              Are you sure you want to delete category <strong className="text-[#0f2c38]">{deletingCategory.name}</strong>?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingCategory(null)}
                className="min-h-[42px] px-4 py-2 rounded-2xl liquid-glass-button-secondary text-xs font-semibold text-[#355968] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteCategory}
                className="min-h-[42px] px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer tactile-press"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

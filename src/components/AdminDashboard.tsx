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
} from 'lucide-react';
import { Item, Category, WebsiteSettings, AdminStats, ItemType } from '../types/admin';
import { ItemFormModal } from './ItemFormModal';
import { PRIMARY_ADMIN_EMAIL } from '../lib/auth';
import { safeFetchJson } from '../utils/apiClient';
import {
  subscribeToAllAdminItems,
  subscribeToCategories,
  subscribeToSettings,
  deleteItemFromSupabase,
  toggleItemVisibilityInSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  saveSettingsToSupabase,
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
    | 'mods'
    | 'apps'
    | 'categories'
    | 'images'
    | 'settings'
    | 'account'
  >('overview');

  // Server data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalDefaultType, setItemModalDefaultType] = useState<ItemType>('game');
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

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
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      const [statsRes, itemsRes, catsRes, settingsRes] = await Promise.all([
        safeFetchJson<AdminStats>('/api/admin/stats', { headers }),
        safeFetchJson<Item[]>('/api/admin/items', { headers }),
        safeFetchJson<Category[]>('/api/categories'),
        safeFetchJson<WebsiteSettings>('/api/admin/settings', { headers }),
      ]);

      if (statsRes.status === 401 || itemsRes.status === 401) {
        onLogout();
        return;
      }

      if (statsRes.ok && statsRes.data) setStats(statsRes.data);
      if (itemsRes.ok && Array.isArray(itemsRes.data)) setItems(itemsRes.data);
      if (catsRes.ok && Array.isArray(catsRes.data)) setCategories(catsRes.data);
      if (settingsRes.ok && settingsRes.data) setSettings(settingsRes.data);
    } catch (err) {
      console.warn('Administrative data load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Supabase subscriptions for Administrator
  useEffect(() => {
    const unsubItems = subscribeToAllAdminItems((liveItems) => {
      setItems(liveItems);
      setLoading(false);
      // Auto-compute live stats from Supabase collection
      const games = liveItems.filter((i) => i.type === 'game').length;
      const mods = liveItems.filter((i) => i.type === 'mod').length;
      const apps = liveItems.filter((i) => i.type === 'app').length;
      const downloads = liveItems.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
      setStats((prev) => ({
        totalGames: games,
        totalMods: mods,
        totalApps: apps,
        totalCategories: prev?.totalCategories || 8,
        totalDownloads: downloads,
        recentItems: liveItems.slice(0, 5),
      }));
    });

    const unsubCats = subscribeToCategories((liveCats) => {
      if (liveCats && liveCats.length > 0) {
        setCategories(liveCats);
        setStats((prev) => prev ? { ...prev, totalCategories: liveCats.length } : null);
      }
    });

    const unsubSett = subscribeToSettings((liveSettings) => {
      if (liveSettings) setSettings(liveSettings);
    });

    fetchData();

    return () => {
      unsubItems();
      unsubCats();
      unsubSett();
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

  const gamesList = items.filter((i) => i.type === 'game');
  const modsList = items.filter((i) => i.type === 'mod');
  const appsList = items.filter((i) => i.type === 'app');

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 text-left">
      {/* Top Header Bar */}
      <div className="p-5 sm:p-6 rounded-3xl liquid-glass border border-white/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0A84FF]/25 to-[#BF5AF2]/25 border border-white/25 flex items-center justify-center text-[#0A84FF] shadow-[0_4px_16px_rgba(10,132,255,0.3)]">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">APXELUZ Control Center</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0A84FF]/20 text-[#0A84FF] border border-[#0A84FF]/40">
                Administrator
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Logged in as <strong className="text-white">{adminUsername}</strong> • Full CMS Write Access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-subtle hover:bg-white/20 text-xs font-semibold text-slate-200 border border-white/15 transition-all"
          >
            <Eye className="w-4 h-4 text-[#0A84FF]" />
            <span>View Public Site</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs for the 8 Admin Sections */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard, count: undefined },
          { id: 'games', label: 'Manage Games', icon: Gamepad2, count: gamesList.length },
          { id: 'mods', label: 'Manage Mods', icon: Sparkles, count: modsList.length },
          { id: 'apps', label: 'Manage Apps', icon: Smartphone, count: appsList.length },
          { id: 'categories', label: 'Categories', icon: FolderTree, count: categories.length },
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
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-[#0A84FF]/25 to-[#BF5AF2]/25 text-white border-[#0A84FF]/60 shadow-[0_4px_18px_rgba(10,132,255,0.3)]'
                  : 'liquid-glass-subtle text-slate-300 hover:text-white hover:bg-white/10 border-white/10'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#0A84FF]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-slate-300 font-mono">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl liquid-glass border border-white/15 space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Games</span>
                <Gamepad2 className="w-4 h-4 text-[#0A84FF]" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                {stats?.totalGames || 0}
              </div>
            </div>

            <div className="p-5 rounded-3xl liquid-glass border border-white/15 space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Mods</span>
                <Sparkles className="w-4 h-4 text-[#BF5AF2]" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                {stats?.totalMods || 0}
              </div>
            </div>

            <div className="p-5 rounded-3xl liquid-glass border border-white/15 space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Apps</span>
                <Smartphone className="w-4 h-4 text-[#0A84FF]" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                {stats?.totalApps || 0}
              </div>
            </div>

            <div className="p-5 rounded-3xl liquid-glass border border-white/15 space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Categories</span>
                <FolderTree className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                {stats?.totalCategories || 0}
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-5 rounded-3xl liquid-glass border border-white/15 space-y-3">
            <h3 className="heading-font text-xs font-bold text-white uppercase tracking-wider">
              Quick Administration Actions
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setItemModalDefaultType('game');
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Game</span>
              </button>

              <button
                onClick={() => {
                  setItemModalDefaultType('mod');
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Mod</span>
              </button>

              <button
                onClick={() => {
                  setItemModalDefaultType('app');
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add App</span>
              </button>

              <button
                onClick={() => setActiveSection('categories')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-subtle hover:bg-white/20 text-xs font-semibold text-white border border-white/20"
              >
                <FolderTree className="w-4 h-4 text-emerald-400" />
                <span>Manage Categories</span>
              </button>
            </div>
          </div>

          {/* Recently Added Content */}
          <div className="p-6 rounded-3xl liquid-glass border border-white/15 space-y-4">
            <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider">
              Recently Managed Content
            </h3>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400">
                Database currently empty. Use the quick actions above to add games, mods, or apps.
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {items.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-12 rounded-xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                        <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">{item.title}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-[#0A84FF]">
                            /{item.type}/{item.slug}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.formattedFileSize} • {item.category} • {item.visibility}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleCopyPublicUrl(item)}
                        className="p-2 rounded-xl liquid-glass-subtle hover:bg-white/20 text-slate-300 hover:text-white"
                        title="Copy Public URL"
                      >
                        {copiedSlug === item.slug ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsItemModalOpen(true);
                        }}
                        className="p-2 rounded-xl liquid-glass-subtle hover:bg-white/20 text-slate-300 hover:text-white"
                        title="Edit Item"
                      >
                        <Edit className="w-4 h-4 text-[#0A84FF]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTIONS 2, 3, 4: CONTENT MANAGEMENT (GAMES / MODS / APPS) */}
      {(activeSection === 'games' || activeSection === 'mods' || activeSection === 'apps') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="heading-font text-lg font-bold text-white uppercase tracking-wider">
                Manage {activeSection.toUpperCase()}
              </h2>
              <p className="text-xs text-slate-400">
                Create, edit, toggle visibility, and delete {activeSection}. All changes reflect instantly on the public website.
              </p>
            </div>
            <button
              onClick={() => {
                setItemModalDefaultType(activeSection === 'games' ? 'game' : activeSection === 'mods' ? 'mod' : 'app');
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New {activeSection.slice(0, -1)}</span>
            </button>
          </div>

          {/* Table / List */}
          <div className="p-4 sm:p-6 rounded-3xl liquid-glass border border-white/15 overflow-x-auto shadow-2xl">
            {items.filter((i) => i.type === (activeSection === 'games' ? 'game' : activeSection === 'mods' ? 'mod' : 'app')).length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-slate-400">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white">No {activeSection} found in database</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click the "+ Add New" button above to publish your first {activeSection.slice(0, -1)}.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pl-2">Item</th>
                    <th className="pb-3">URL Slug</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Visibility</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {items
                    .filter((i) => i.type === (activeSection === 'games' ? 'game' : activeSection === 'mods' ? 'mod' : 'app'))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-12 rounded-xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                              <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="font-bold text-white">{item.title}</div>
                              <div className="text-[10px] text-slate-400">{item.version} • {item.developer}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-[#0A84FF]">
                          /{item.type}/{item.slug}
                        </td>
                        <td className="py-3">{item.category}</td>
                        <td className="py-3 font-mono">{item.formattedFileSize}</td>
                        <td className="py-3">
                          <button
                            onClick={() => handleToggleVisibility(item)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                              item.visibility === 'published'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-400 border-white/10'
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
                              className="p-1.5 rounded-xl liquid-glass-subtle hover:bg-white/20 text-slate-300 hover:text-white"
                              title="Copy URL"
                            >
                              {copiedSlug === item.slug ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={`/${item.type}/${item.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl liquid-glass-subtle hover:bg-white/20 text-slate-300 hover:text-white"
                              title="Open Public Preview"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setIsItemModalOpen(true);
                              }}
                              className="p-1.5 rounded-xl liquid-glass-subtle hover:bg-white/20 text-[#0A84FF]"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="p-1.5 rounded-xl liquid-glass-subtle hover:bg-white/20 text-rose-400 hover:text-rose-300"
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
            <h2 className="heading-font text-lg font-bold text-white uppercase tracking-wider">
              Category Management
            </h2>
            <p className="text-xs text-slate-400">
              Create, rename, reorder, and remove categories. Visitors only view categories and browse their assigned items.
            </p>
          </div>

          {/* Create Category Form */}
          <form onSubmit={handleSaveCategory} className="p-5 rounded-3xl liquid-glass border border-white/15 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-grow w-full">
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Action, RPG, Simulation, Tools"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
              />
            </div>

            <div className="w-full sm:w-48">
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Icon
              </label>
              <select
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
              >
                <option value="Sparkles" className="bg-[#0f172a]">Sparkles</option>
                <option value="Sword" className="bg-[#0f172a]">Sword</option>
                <option value="Compass" className="bg-[#0f172a]">Compass</option>
                <option value="Layers" className="bg-[#0f172a]">Layers</option>
                <option value="Shield" className="bg-[#0f172a]">Shield</option>
                <option value="Cpu" className="bg-[#0f172a]">Cpu</option>
                <option value="Gauge" className="bg-[#0f172a]">Gauge</option>
                <option value="Trophy" className="bg-[#0f172a]">Trophy</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white flex-shrink-0"
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
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl liquid-glass-subtle text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            )}
          </form>

          {/* Categories List */}
          <div className="p-4 sm:p-6 rounded-3xl liquid-glass border border-white/15 space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
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
                      <span className="w-6 text-center font-mono text-xs text-slate-500 font-bold">
                        #{idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#0A84FF]">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white">{cat.name}</div>
                        <div className="text-[10px] text-slate-400">/{cat.slug} • {cat.itemCount || 0} items assigned</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMoveCategory(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-xl liquid-glass-subtle text-slate-300 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveCategory(idx, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-1.5 rounded-xl liquid-glass-subtle text-slate-300 disabled:opacity-30"
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
                        className="p-1.5 rounded-xl liquid-glass-subtle text-[#0A84FF]"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(cat)}
                        className="p-1.5 rounded-xl liquid-glass-subtle text-rose-400"
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
            <h2 className="heading-font text-lg font-bold text-white uppercase tracking-wider">
              Image Management & Uploads
            </h2>
            <p className="text-xs text-slate-400">
              Upload images directly to server storage (/uploads), validate remote image URLs, and preview media.
            </p>
          </div>

          {imageUploadFeedback && (
            <div className="p-3.5 rounded-2xl bg-[#0A84FF]/20 border border-[#0A84FF]/40 text-[#0A84FF] text-xs">
              {imageUploadFeedback}
            </div>
          )}

          {/* Upload Widget */}
          <div className="p-6 rounded-3xl liquid-glass border border-white/15 space-y-4">
            <h3 className="heading-font text-xs font-bold text-white uppercase tracking-wider">
              Direct File Upload to Server
            </h3>
            <label className="border-2 border-dashed border-white/20 hover:border-[#0A84FF]/60 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/5">
              <Upload className="w-8 h-8 text-[#0A84FF] mb-2" />
              <span className="text-sm font-semibold text-white">Click or drag an image here to upload</span>
              <span className="text-xs text-slate-400 mt-1">Supports PNG, JPEG, WEBP, SVG (up to 8MB)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUploadTester}
                className="hidden"
              />
            </label>
          </div>

          {/* URL Tester */}
          <div className="p-6 rounded-3xl liquid-glass border border-white/15 space-y-4">
            <h3 className="heading-font text-xs font-bold text-white uppercase tracking-wider">
              Test & Preview Image URL
            </h3>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/cover.png"
                value={testImageUrl}
                onChange={(e) => setTestImageUrl(e.target.value)}
                className="w-full bg-white/[0.08] text-xs text-white rounded-2xl px-3.5 py-2.5 border border-white/15 font-mono"
              />
            </div>
            {testImageUrl && (
              <div className="p-4 rounded-2xl liquid-glass-subtle flex items-center justify-center">
                <img
                  src={testImageUrl}
                  alt="Test preview"
                  className="max-h-60 rounded-2xl object-contain border border-white/15"
                  onError={() => alert('Failed loading image. URL may be blocked by CORS or invalid.')}
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
            <h2 className="heading-font text-lg font-bold text-white uppercase tracking-wider">
              Website Settings
            </h2>
            <p className="text-xs text-slate-400">
              Configure repository branding, global download toggles, and system maintenance mode.
            </p>
          </div>

          {settingsFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs">
              {settingsFeedback}
            </div>
          )}

          {settings && (
            <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl liquid-glass border border-white/15 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Site Description
                </label>
                <input
                  type="text"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Announcement Banner (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Server maintenance scheduled for midnight UTC"
                  value={settings.announcement || ''}
                  onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.enableDownloads}
                    onChange={(e) => setSettings({ ...settings, enableDownloads: e.target.checked })}
                    className="rounded text-[#0A84FF]"
                  />
                  <span>Enable Public Downloads</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="rounded text-rose-500"
                  />
                  <span>Maintenance Mode (Public site displays maintenance notification)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white shadow-lg"
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
            <h2 className="heading-font text-lg font-bold text-white uppercase tracking-wider">
              Administrator Authentication
            </h2>
            <p className="text-xs text-slate-400">
              Your administrative session is protected by Supabase Authentication with Row-Level Security and Role-Based Authorization.
            </p>
          </div>

          <div className="p-6 rounded-3xl liquid-glass border border-white/15 space-y-5 max-w-xl shadow-xl">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A84FF]/25 to-[#BF5AF2]/25 border border-white/20 flex items-center justify-center text-[#0A84FF]">
                <Shield className="w-6 h-6 text-[#0A84FF]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{adminUsername}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    Authorized Admin
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Supabase Auth Provider (Email & Password)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Primary Admin</span>
                <span className="text-white font-mono text-[11px] font-medium">{PRIMARY_ADMIN_EMAIL}</span>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Session Persistence</span>
                <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Retained Across Sessions</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Access Role</span>
                <span className="text-white font-semibold">Full Repository CMS & Downloads</span>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Authorization Token</span>
                <span className="text-slate-300 font-mono text-[11px]">Bearer ••••••••{adminToken.slice(-6)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400">Want to terminate this session?</span>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Admin</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040714]/80 backdrop-blur-xl"
          onClick={() => setDeletingItem(null)}
        >
          <div
            className="w-full max-w-md liquid-glass rounded-3xl border border-rose-500/30 p-6 shadow-2xl text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="heading-font text-base font-bold text-white uppercase tracking-wider">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete <strong className="text-white font-bold">{deletingItem.title}</strong>? This action cannot be undone and will remove it from the public repository.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-2xl liquid-glass-subtle text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteItem}
                className="px-5 py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040714]/80 backdrop-blur-xl"
          onClick={() => setDeletingCategory(null)}
        >
          <div
            className="w-full max-w-md liquid-glass rounded-3xl border border-rose-500/30 p-6 shadow-2xl text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="heading-font text-base font-bold text-white uppercase tracking-wider">
                Delete Category
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete category <strong className="text-white">{deletingCategory.name}</strong>?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-2xl liquid-glass-subtle text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteCategory}
                className="px-5 py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md"
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

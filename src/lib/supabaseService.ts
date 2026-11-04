import { supabase } from './supabase';
import { Item, Category, WebsiteSettings, ItemVersion } from '../types/admin';

export type Unsubscribe = () => void;

// Safe row mapper from Supabase apps table to frontend Item
export function appRowToItem(row: any): Item {
  const fileSizeStr = row.file_size || `${row.file_size_value || 100} ${row.file_size_unit || 'MB'}`;
  
  return {
    id: row.id,
    type: (row.type as 'game' | 'mod' | 'app') || 'game',
    title: row.title || row.name || 'Untitled',
    slug: row.slug,
    version: row.latest_version || 'v1.0.0',
    status: row.status === 'Official' ? 'Official' : 'Unofficial',
    category: row.category || 'Action',
    tags: Array.isArray(row.tags) ? row.tags : [],
    shortDescription: row.short_description || '',
    description: row.description || '',
    developer: row.developer || 'Independent Developer',
    porter: row.porter || '',
    platform: row.platform || 'Android',
    minAndroid: row.min_android || 'Android 8.0+',
    architecture: row.architecture || 'ARM64',
    obbRequired: Boolean(row.obb_required),
    fileSizeValue: row.file_size_value || 100,
    fileSizeUnit: (row.file_size_unit as 'MB' | 'GB') || 'MB',
    formattedFileSize: fileSizeStr,
    iconUrl: row.icon_url || '',
    coverUrl: row.cover_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
    bannerUrl: row.banner_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    screenshots: Array.isArray(row.screenshots) ? row.screenshots : [],
    downloadLinks: Array.isArray(row.download_links) ? row.download_links : [],
    rating: typeof row.rating === 'number' ? row.rating : 5.0,
    ratingCount: typeof row.rating_count === 'number' ? row.rating_count : 1,
    downloads: String(row.download_count ?? 0),
    downloadCount: Number(row.download_count ?? 0),
    releaseDate: (() => {
      try {
        return row.published_at
          ? new Date(row.published_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    })(),
    updatedDate: (() => {
      try {
        return row.updated_at
          ? new Date(row.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    })(),
    isNewlyAdded: Boolean(row.is_newly_added),
    isFeatured: Boolean(row.featured),
    isPopular: Boolean(row.is_popular),
    visibility: (row.visibility as 'published' | 'draft') || 'published',
    changelog: Array.isArray(row.changelog) ? row.changelog : [],
    sha256: row.sha256 || '',
    versions: Array.isArray(row.versions) ? row.versions : [],
  };
}

export function ensureUUID(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Maps frontend Item to Supabase apps table insert/update row
export function itemToAppRow(item: Item, userId?: string) {
  const safeId = ensureUUID(item.id);
  return {
    id: safeId,
    name: item.title,
    title: item.title,
    slug: item.slug,
    type: item.type,
    description: item.description,
    short_description: item.shortDescription || '',
    category: item.category,
    platform: item.platform || 'Android',
    developer: item.developer,
    porter: item.porter || '',
    icon_url: item.iconUrl || '',
    cover_url: item.coverUrl,
    banner_url: item.bannerUrl,
    screenshots: item.screenshots || [],
    latest_version: item.version,
    file_size: item.formattedFileSize,
    file_size_value: typeof item.fileSizeValue === 'number' ? item.fileSizeValue : parseFloat(String(item.fileSizeValue)) || 100,
    file_size_unit: item.fileSizeUnit || 'MB',
    min_android: item.minAndroid || 'Android 8.0+',
    architecture: item.architecture || 'ARM64',
    obb_required: Boolean(item.obbRequired),
    rating: item.rating || 5.0,
    rating_count: item.ratingCount || 1,
    download_count: item.downloadCount || 0,
    featured: Boolean(item.isFeatured),
    is_popular: Boolean(item.isPopular),
    is_newly_added: Boolean(item.isNewlyAdded),
    status: item.status,
    visibility: item.visibility,
    tags: item.tags || [],
    sha256: item.sha256 || '',
    download_links: item.downloadLinks || [],
    changelog: item.changelog || [],
    versions: item.versions || [],
    updated_at: new Date().toISOString(),
    ...(userId ? { created_by: userId } : {}),
  };
}

/**
 * Real-time listener for public visitors.
 * Subscribes to published items dynamically from Supabase.
 */
export function subscribeToPublishedItems(
  onSuccess: (items: Item[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  let isSubscribed = true;

  const fetchPublished = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('visibility', 'published')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (isSubscribed && data) {
        onSuccess(data.map(appRowToItem));
      }
    } catch (err) {
      console.warn('Supabase published apps fetch notice:', err);
      if (onError && isSubscribed) onError(err);
    }
  };

  fetchPublished();

  // Listen to live database changes via Supabase Realtime
  const channelName = `realtime_public_apps_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  let channel: any = null;

  try {
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apps' },
        () => {
          if (isSubscribed) fetchPublished();
        }
      )
      .subscribe();
  } catch (rtErr) {
    console.warn('Realtime public apps channel warning:', rtErr);
  }

  return () => {
    isSubscribed = false;
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Safe cleanup
      }
    }
  };
}

/**
 * Real-time listener for administrator to view all repository items (both published and drafts).
 */
export function subscribeToAllAdminItems(
  onSuccess: (items: Item[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  let isSubscribed = true;

  const fetchAll = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (isSubscribed && data) {
        onSuccess(data.map(appRowToItem));
      }
    } catch (err) {
      console.warn('Supabase admin items fetch notice:', err);
      if (onError && isSubscribed) onError(err);
    }
  };

  fetchAll();

  const channelName = `realtime_admin_apps_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  let channel: any = null;

  try {
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apps' },
        () => {
          if (isSubscribed) fetchAll();
        }
      )
      .subscribe();
  } catch (rtErr) {
    console.warn('Realtime admin apps channel warning:', rtErr);
  }

  return () => {
    isSubscribed = false;
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Safe cleanup
      }
    }
  };
}

/**
 * Real-time listener for categories.
 */
export function subscribeToCategories(
  onSuccess: (categories: Category[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  let isSubscribed = true;

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (isSubscribed && data) {
        onSuccess(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            icon: c.icon || 'Sparkles',
            order: c.display_order ?? c.order ?? 0,
            itemCount: c.item_count ?? c.itemCount ?? 0,
          }))
        );
      }
    } catch (err) {
      console.warn('Supabase categories fetch notice:', err);
      if (onError && isSubscribed) onError(err);
    }
  };

  fetchCategories();

  const channelName = `realtime_categories_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  let channel: any = null;

  try {
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          if (isSubscribed) fetchCategories();
        }
      )
      .subscribe();
  } catch (rtErr) {
    console.warn('Realtime categories channel warning:', rtErr);
  }

  return () => {
    isSubscribed = false;
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Safe cleanup
      }
    }
  };
}

/**
 * Real-time listener for website settings.
 */
export function subscribeToSettings(
  onSuccess: (settings: WebsiteSettings | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  let isSubscribed = true;

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (error) throw error;
      if (isSubscribed && data) {
        onSuccess({
          siteName: data.site_name || 'APXELUZ',
          siteDescription: data.site_description || '',
          announcement: data.announcement || '',
          enableDownloads: data.enable_downloads ?? true,
          maintenanceMode: data.maintenance_mode ?? false,
          defaultArchitecture: data.default_architecture || 'ARM64',
        });
      }
    } catch (err) {
      console.warn('Supabase settings fetch notice:', err);
      if (onError && isSubscribed) onError(err);
    }
  };

  fetchSettings();

  const channelName = `realtime_settings_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  let channel: any = null;

  try {
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'website_settings' },
        () => {
          if (isSubscribed) fetchSettings();
        }
      )
      .subscribe();
  } catch (rtErr) {
    console.warn('Realtime settings channel warning:', rtErr);
  }

  return () => {
    isSubscribed = false;
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Safe cleanup
      }
    }
  };
}

/**
 * Saves or updates an item in Supabase PostgreSQL permanently.
 */
export async function saveItemToSupabase(item: Item): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  const row = itemToAppRow(item, userId);

  const { error } = await supabase
    .from('apps')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('Supabase saveItem error:', error);
    throw new Error(error.message);
  }

  // Also sync version history records into app_versions table if versions exist
  if (Array.isArray(item.versions) && item.versions.length > 0) {
    for (const v of item.versions) {
      try {
        await supabase.from('app_versions').upsert({
          app_id: item.id,
          version: v.version,
          changelog: v.changelog || [],
          file_path: v.downloadLinks?.[0]?.storagePath || '',
          download_url: v.downloadLinks?.[0]?.url || '',
          file_size: v.formattedFileSize || item.formattedFileSize,
          release_date: v.releaseDate || item.releaseDate,
        }, { onConflict: 'app_id,version' });
      } catch (err) {
        console.warn('Failed syncing version history record:', err);
      }
    }
  }
}

/**
 * Permanently deletes an item from Supabase PostgreSQL.
 */
export async function deleteItemFromSupabase(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('apps')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Supabase deleteItem error:', error);
    throw new Error(error.message);
  }
}

/**
 * Atomically toggles item publication status.
 */
export async function toggleItemVisibilityInSupabase(
  itemId: string,
  newVisibility: 'published' | 'draft'
): Promise<void> {
  const { error } = await supabase
    .from('apps')
    .update({
      visibility: newVisibility,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Supabase toggle visibility error:', error);
    throw new Error(error.message);
  }
}

/**
 * Atomically increments the download counter when a visitor downloads an application.
 */
export async function incrementDownloadCounter(itemId: string): Promise<void> {
  if (!itemId) return;

  try {
    // Try RPC function first
    const { error } = await supabase.rpc('increment_app_download_count', {
      target_app_id: itemId,
    });

    if (error) {
      // Fallback: direct update
      const { data } = await supabase
        .from('apps')
        .select('download_count')
        .eq('id', itemId)
        .single();

      if (data) {
        await supabase
          .from('apps')
          .update({ download_count: (data.download_count || 0) + 1 })
          .eq('id', itemId);
      }
    }
  } catch (err) {
    console.warn('Failed to increment download counter (non-fatal):', err);
  }
}

/**
 * Saves a category to Supabase.
 */
export async function saveCategoryToSupabase(category: Category): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .upsert(
      {
        id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        display_order: category.order,
        item_count: category.itemCount,
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Supabase saveCategory error:', error);
    throw new Error(error.message);
  }
}

/**
 * Deletes a category from Supabase.
 */
export async function deleteCategoryFromSupabase(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('Supabase deleteCategory error:', error);
    throw new Error(error.message);
  }
}

/**
 * Saves website settings in Supabase.
 */
export async function saveSettingsToSupabase(settings: WebsiteSettings): Promise<void> {
  const { error } = await supabase
    .from('website_settings')
    .upsert(
      {
        id: 'default',
        site_name: settings.siteName,
        site_description: settings.siteDescription,
        announcement: settings.announcement || '',
        enable_downloads: settings.enableDownloads,
        maintenance_mode: settings.maintenanceMode,
        default_architecture: settings.defaultArchitecture,
        updated_at: new Date().toISOString(),
      },
    );

  if (error) {
    console.error('Supabase saveSettings error:', error);
    throw new Error(error.message);
  }
}


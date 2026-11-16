import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Package,
  Loader2,
  HardDrive,
  History,
} from 'lucide-react';
import { Item, ItemType, Category, DownloadLink, ItemVersion } from '../types/admin';
import { formatFileSize, slugify, validateSlug } from '../utils/adminValidation';
import { isValidHttpUrl } from '../utils/urlValidation';
import { safeFetchJson } from '../utils/apiClient';
import { uploadToSupabaseStorage, UploadProgress } from '../lib/storageService';
import { saveItemToSupabase } from '../lib/supabaseService';
import { useScrollLock } from '../utils/useScrollLock';
import { useSwipeToClose } from '../utils/useSwipeToClose';

interface ItemFormModalProps {
  initialItem?: Item | null;
  defaultType?: ItemType;
  categories: Category[];
  adminToken: string;
  onClose: () => void;
  onSaved: (item: Item) => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  initialItem,
  defaultType = 'game',
  categories,
  adminToken,
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(initialItem);
  useScrollLock(true);
  const { sheetMotionClass, handleBarClass, dragHandlers } = useSwipeToClose(onClose, true);

  const [type, setType] = useState<ItemType>(initialItem?.type || defaultType);
  const [title, setTitle] = useState(initialItem?.title || '');
  const [slug, setSlug] = useState(initialItem?.slug || '');
  const [version, setVersion] = useState(initialItem?.version || 'v1.0.0');
  const [status, setStatus] = useState<'Official' | 'Unofficial'>(initialItem?.status || 'Unofficial');
  const [category, setCategory] = useState(initialItem?.category || (categories[0]?.name || 'Action'));
  const [tags, setTags] = useState(initialItem?.tags?.join(', ') || '');
  const [developer, setDeveloper] = useState(initialItem?.developer || '');
  const [porter, setPorter] = useState(initialItem?.porter || '');
  const [platform, setPlatform] = useState(initialItem?.platform || 'Android');
  const [minAndroid, setMinAndroid] = useState(initialItem?.minAndroid || 'Android 8.0+');
  const [architecture, setArchitecture] = useState(initialItem?.architecture || 'ARM64');
  const [obbRequired, setObbRequired] = useState(Boolean(initialItem?.obbRequired));
  const [shortDescription, setShortDescription] = useState(initialItem?.shortDescription || '');
  const [description, setDescription] = useState(initialItem?.description || '');
  const [visibility, setVisibility] = useState<'published' | 'draft'>(initialItem?.visibility || 'published');
  const [isFeatured, setIsFeatured] = useState(Boolean(initialItem?.isFeatured));

  // Download section
  const [fileSizeValue, setFileSizeValue] = useState<number | string>(initialItem?.fileSizeValue || 150);
  const [fileSizeUnit, setFileSizeUnit] = useState<'MB' | 'GB'>(initialItem?.fileSizeUnit || 'MB');
  const [primaryName, setPrimaryName] = useState(
    initialItem?.downloadLinks?.[0]?.name || 'Primary Download'
  );
  const [primaryUrl, setPrimaryUrl] = useState(
    initialItem?.downloadLinks?.[0]?.url || 'https://example.com/download.apk'
  );
  const [downloadNotes, setDownloadNotes] = useState(initialItem?.downloadLinks?.[0]?.notes || '');

  // Alternative download mirrors
  const [altLinks, setAltLinks] = useState<DownloadLink[]>(
    initialItem?.downloadLinks?.slice(1) || []
  );

  // Images
  const [iconUrl, setIconUrl] = useState(initialItem?.iconUrl || '');
  const [coverUrl, setCoverUrl] = useState(
    initialItem?.coverUrl ||
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'
  );
  const [bannerUrl, setBannerUrl] = useState(
    initialItem?.bannerUrl ||
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80'
  );
  const [screenshots, setScreenshots] = useState<string[]>(
    initialItem?.screenshots || [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    ]
  );
  const [newScreenshotUrl, setNewScreenshotUrl] = useState('');

  // Supabase Storage upload progress tracking
  const [activeUpload, setActiveUpload] = useState<{
    target: 'package' | 'cover' | 'banner' | 'icon' | 'screenshot';
    progress: UploadProgress;
    filename: string;
    cancel?: () => void;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadSuccessFeedback, setUploadSuccessFeedback] = useState<string | null>(null);

  // Live formatted size
  const formattedSize = formatFileSize(fileSizeValue, fileSizeUnit);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && (!slug || slug === slugify(title))) {
      setSlug(slugify(val));
    }
  };

  const handleAddAltLink = (presetName?: string) => {
    setAltLinks([
      ...altLinks,
      {
        id: `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: presetName || `Alternative Download ${altLinks.length + 1}`,
        url: '',
        isPrimary: false,
        version,
      },
    ]);
  };

  const handleSetPrimary = (index: number) => {
    const target = altLinks[index];
    const prevPrimaryName = primaryName;
    const prevPrimaryUrl = primaryUrl;
    const prevPrimaryNotes = downloadNotes;

    setPrimaryName(target.name || 'Primary Download');
    setPrimaryUrl(target.url);
    setDownloadNotes(target.notes || '');

    const updated = [...altLinks];
    updated[index] = {
      ...target,
      name: prevPrimaryName,
      url: prevPrimaryUrl,
      notes: prevPrimaryNotes,
      isPrimary: false,
    };
    setAltLinks(updated);
  };

  const handleRemoveAltLink = (index: number) => {
    setAltLinks(altLinks.filter((_, i) => i !== index));
  };

  const handleAddScreenshot = () => {
    if (newScreenshotUrl.trim() && isValidHttpUrl(newScreenshotUrl.trim())) {
      setScreenshots([...screenshots, newScreenshotUrl.trim()]);
      setNewScreenshotUrl('');
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  // Upload handler for APK / Packages directly to Supabase Storage
  const handlePackageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadSuccessFeedback(null);

    const cleanSlug = slugify(slug) || 'package';
    const cleanVersion = version.trim() || 'v1.0.0';
    const storagePath = `apps/${cleanSlug}/${cleanVersion}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

    const { promise, cancel } = uploadToSupabaseStorage(file, storagePath, (progress) => {
      setActiveUpload({
        target: 'package',
        progress,
        filename: file.name,
        cancel,
      });
    }, 'apps');

    setActiveUpload({
      target: 'package',
      progress: { percentage: 0, bytesTransferred: 0, totalBytes: file.size, state: 'running' },
      filename: file.name,
      cancel,
    });

    try {
      const result = await promise;
      // Auto-set the primary download URL to the Supabase Storage download URL
      setPrimaryUrl(result.downloadUrl);
      setPrimaryName(`Supabase Storage (${file.name})`);
      setDownloadNotes(`Direct High-Speed Mirror • ${file.name}`);

      // Calculate file size value and unit automatically
      const mbSize = file.size / (1024 * 1024);
      if (mbSize >= 1000) {
        setFileSizeValue(parseFloat((mbSize / 1024).toFixed(2)));
        setFileSizeUnit('GB');
      } else {
        setFileSizeValue(parseFloat(mbSize.toFixed(1)));
        setFileSizeUnit('MB');
      }

      setUploadSuccessFeedback(
        `Package "${file.name}" uploaded to Supabase Storage! Download URL configured automatically.`
      );
      setTimeout(() => setUploadSuccessFeedback(null), 6000);
    } catch (err: any) {
      if (err?.code !== 'storage/canceled' && err?.message !== 'Upload cancelled') {
        console.error('Supabase storage upload error:', err);
        setError(`Package upload failed: ${err?.message || 'Storage error'}`);
      }
    } finally {
      setActiveUpload(null);
      e.target.value = '';
    }
  };

  // Upload handler for Images (Cover, Banner, Icon, Screenshots) directly to Supabase Storage
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'icon' | 'cover' | 'banner' | 'screenshot'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const cleanSlug = slugify(slug) || 'item';
    const bucket = target === 'icon' ? 'app-icons' : 'screenshots';
    const storagePath = target === 'icon'
      ? `app-icons/${cleanSlug}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      : `screenshots/${cleanSlug}/${Date.now()}_${target}_${file.name.replace(/\s+/g, '_')}`;

    const { promise, cancel } = uploadToSupabaseStorage(file, storagePath, (progress) => {
      setActiveUpload({
        target,
        progress,
        filename: file.name,
        cancel,
      });
    }, bucket);

    setActiveUpload({
      target,
      progress: { percentage: 0, bytesTransferred: 0, totalBytes: file.size, state: 'running' },
      filename: file.name,
      cancel,
    });

    try {
      const result = await promise;
      const uploadedUrl = result.downloadUrl;

      if (target === 'icon') setIconUrl(uploadedUrl);
      else if (target === 'cover') setCoverUrl(uploadedUrl);
      else if (target === 'banner') setBannerUrl(uploadedUrl);
      else if (target === 'screenshot') setScreenshots((prev) => [...prev, uploadedUrl]);

      setUploadSuccessFeedback(`Image uploaded successfully!`);
      setTimeout(() => setUploadSuccessFeedback(null), 4000);
    } catch (err: any) {
      if (err?.code !== 'storage/canceled') {
        console.warn('Direct storage upload fallback to base64 API:', err);
        // Fallback to base64 API if storage has an issue
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Data = reader.result as string;
            const apiRes = await safeFetchJson<{ url: string }>('/api/admin/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
              },
              body: JSON.stringify({ filename: file.name, base64Data }),
            });
            if (apiRes.ok && apiRes.data?.url) {
              const url = apiRes.data.url;
              if (target === 'icon') setIconUrl(url);
              else if (target === 'cover') setCoverUrl(url);
              else if (target === 'banner') setBannerUrl(url);
              else if (target === 'screenshot') setScreenshots((prev) => [...prev, url]);
            }
          };
          reader.readAsDataURL(file);
        } catch {
          setError('Failed to upload image.');
        }
      }
    } finally {
      setActiveUpload(null);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanSlug = slugify(slug);
    if (!cleanSlug || !validateSlug(cleanSlug)) {
      setError('Please provide a valid URL slug (lowercase letters, numbers, and hyphens).');
      return;
    }

    if (!primaryUrl.trim()) {
      setError('A Primary Download destination URL is required.');
      return;
    }

    if (!isValidHttpUrl(primaryUrl.trim())) {
      setError('Primary Download URL must be a valid HTTP or HTTPS destination.');
      return;
    }

    for (let i = 0; i < altLinks.length; i++) {
      const link = altLinks[i];
      if (link.url.trim() && !isValidHttpUrl(link.url.trim())) {
        setError(
          `Mirror "${link.name || `#${i + 1}`}" has an invalid URL. Only HTTP and HTTPS destinations are permitted.`
        );
        return;
      }
    }

    setLoading(true);

    const downloadLinks: DownloadLink[] = [
      {
        id: initialItem?.downloadLinks?.[0]?.id || 'dl-primary',
        name: primaryName.trim() || 'Primary Download',
        url: primaryUrl.trim(),
        isPrimary: true,
        version,
        notes: downloadNotes.trim(),
      },
      ...altLinks
        .filter((l) => l.url.trim().length > 0)
        .map((l) => ({
          ...l,
          name: l.name.trim() || 'Alternative Download',
          url: l.url.trim(),
          isPrimary: false,
        })),
    ];

    // Version Preservation Logic:
    // If editing and version number was bumped, preserve previous version in versions history
    let preservedVersions: ItemVersion[] = initialItem?.versions ? [...initialItem.versions] : [];

    if (isEditing && initialItem && initialItem.version && initialItem.version !== version.trim()) {
      const previousReleaseArchive: ItemVersion = {
        id: `ver-${Date.now()}-${initialItem.version.replace(/[^a-z0-9]/gi, '')}`,
        version: initialItem.version,
        releaseDate: initialItem.updatedDate || initialItem.releaseDate || new Date().toISOString(),
        formattedFileSize: initialItem.formattedFileSize,
        fileSizeValue: initialItem.fileSizeValue,
        fileSizeUnit: initialItem.fileSizeUnit,
        downloadLinks: initialItem.downloadLinks || [],
        changelog: (initialItem.changelog || []).map((c) => c.changes).flat(),
        notes: `Archived release ${initialItem.version}`,
        isLatest: false,
      };

      // Add previous version to the beginning of the version history
      preservedVersions = [previousReleaseArchive, ...preservedVersions];
    }

    const itemId = initialItem?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`);

    const completeItem: Item = {
      id: itemId,
      type,
      title: title.trim(),
      slug: cleanSlug,
      version: version.trim(),
      status,
      category,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      developer: developer.trim() || 'Community Developer',
      porter: porter.trim(),
      platform,
      minAndroid,
      architecture,
      obbRequired,
      fileSizeValue,
      fileSizeUnit,
      formattedFileSize: formattedSize,
      iconUrl,
      coverUrl,
      bannerUrl,
      screenshots,
      downloadLinks,
      rating: initialItem?.rating || 5.0,
      ratingCount: initialItem?.ratingCount || 1,
      downloads: initialItem?.downloads || '0',
      downloadCount: initialItem?.downloadCount || 0,
      releaseDate: initialItem?.releaseDate || new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      isNewlyAdded: !isEditing,
      isFeatured,
      isPopular: Boolean(initialItem?.isPopular),
      visibility,
      changelog: initialItem?.changelog || [
        {
          version: version.trim(),
          date: new Date().toISOString().split('T')[0],
          changes: ['Official release package published to APXELUZ repository.'],
        },
      ],
      sha256: initialItem?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      versions: preservedVersions,
    };

    try {
      // 1. Direct Supabase Cloud Persistence (Single Source of Truth)
      await saveItemToSupabase(completeItem);

      // 2. Also replicate to server REST API if available (non-blocking fallback)
      try {
        const url = isEditing && initialItem ? `/api/admin/items/${initialItem.id}` : '/api/admin/items';
        const method = isEditing ? 'PUT' : 'POST';
        await safeFetchJson<Item>(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(completeItem),
        });
      } catch (restErr) {
        console.warn('REST mirror sync notice (Supabase save succeeded):', restErr);
      }

      onSaved(completeItem);
      onClose();
    } catch (err: any) {
      console.error('Save item error:', err);
      setError(`Failed to save item to Supabase Database: ${err?.message || 'Database error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-[#0f2c38]/30 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-3xl liquid-glass rounded-t-[28px] sm:rounded-3xl shadow-2xl px-5 pb-5 pt-2 sm:px-8 sm:pb-8 sm:pt-3 overflow-hidden text-left my-auto max-h-[92vh] flex flex-col ${sheetMotionClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          {...dragHandlers}
          className="flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
          title="Geser ke bawah untuk menutup"
        >
          <div className="flex justify-center pt-1 pb-2.5">
            <div className={handleBarClass} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#10242E]/10 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl liquid-glass-subtle flex items-center justify-center text-[#0D9488] flex-shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="heading-font text-base sm:text-lg font-extrabold text-[#10242E] text-3d-subtle uppercase tracking-tight truncate">
                  {isEditing ? `Edit: ${initialItem?.title}` : `Publish New ${type.toUpperCase()}`}
                </h2>
                <p className="text-xs text-[#4A6270] truncate">
                  Upload packages to Supabase Storage and sync instantly with public visitors.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#4A6270] hover:text-[#10242E] cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upload Progress Bar Floating Banner */}
        {activeUpload && (
          <div className="my-3 p-3.5 rounded-2xl bg-[#dff1ff] border border-[#a2ddfc] text-[#0f2c38] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 truncate">
                <Loader2 className="w-4 h-4 animate-spin text-[#0284c7] flex-shrink-0" />
                <span className="truncate">Uploading {activeUpload.filename} to Cloud Storage...</span>
              </span>
              <span className="font-mono text-[#0284c7] font-bold flex-shrink-0 ml-2">
                {activeUpload.progress.percentage}%
              </span>
            </div>
            <progress
              value={activeUpload.progress.percentage}
              max={100}
              aria-label={`Upload progress for ${activeUpload.filename}`}
              className="w-full h-2 rounded-full overflow-hidden appearance-none bg-white/80 [&::-webkit-progress-bar]:bg-white/80 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-[#0D9488] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:bg-[#0D9488]"
            />
            <div className="flex items-center justify-between text-[11px] text-[#355968]">
              <span>
                {(activeUpload.progress.bytesTransferred / (1024 * 1024)).toFixed(1)} MB /{' '}
                {(activeUpload.progress.totalBytes / (1024 * 1024)).toFixed(1)} MB
              </span>
              {activeUpload.cancel && (
                <button
                  type="button"
                  onClick={activeUpload.cancel}
                  className="text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
                >
                  Cancel Upload
                </button>
              )}
            </div>
          </div>
        )}

        {/* Feedback Notices */}
        {uploadSuccessFeedback && (
          <div className="my-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{uploadSuccessFeedback}</span>
          </div>
        )}

        {error && (
          <div className="my-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6 pt-4 overflow-y-auto pr-1 flex-grow custom-scrollbar">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold text-[#0d9488] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>1. General Information</span>
              </h3>
              {/* Type Switcher */}
              <div className="flex rounded-2xl bg-white/75 p-1 border border-white/90 shadow-xs">
                {(['game', 'mod', 'app'] as ItemType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      type === t
                        ? 'liquid-glass-button text-white'
                        : 'text-[#355968] hover:text-[#0f2c38]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hollow Knight Mobile"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  placeholder="hollow-knight-mobile"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full min-h-[44px] bg-white/80 text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488] font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Version *
                </label>
                <input
                  type="text"
                  required
                  placeholder="v1.0.5"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                >
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name} className="bg-[#f2faf7] text-[#0f2c38]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                >
                  <option value="Unofficial" className="bg-[#f2faf7] text-[#0f2c38]">
                    Unofficial Port / Mod
                  </option>
                  <option value="Official" className="bg-[#f2faf7] text-[#0f2c38]">
                    Official Release
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Developer
                </label>
                <input
                  type="text"
                  placeholder="Team Cherry"
                  value={developer}
                  onChange={(e) => setDeveloper(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Porter / Modder
                </label>
                <input
                  type="text"
                  placeholder="APXELUZ Port Team"
                  value={porter}
                  onChange={(e) => setPorter(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Min Android
                </label>
                <input
                  type="text"
                  placeholder="Android 8.0+"
                  value={minAndroid}
                  onChange={(e) => setMinAndroid(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                placeholder="Metroidvania, 2D, Action, Port"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                Short Description
              </label>
              <input
                type="text"
                placeholder="Brief one-line summary for cards"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                Full Description
              </label>
              <textarea
                rows={3}
                placeholder="Detailed features, controls, and installation notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/80 text-sm text-[#0f2c38] placeholder-[#648896] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488] resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-4 items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#355968] font-medium">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0d9488]"
                />
                <span>Feature in Featured Section</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#355968] font-medium">
                <input
                  type="checkbox"
                  checked={obbRequired}
                  onChange={(e) => setObbRequired(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0d9488]"
                />
                <span>Requires OBB / Data Assets</span>
              </label>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-[#4a6f7d] font-medium">Visibility:</span>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="min-h-[38px] bg-white/80 text-xs font-semibold text-[#0f2c38] rounded-xl px-2.5 py-1 border border-white/90 focus:outline-none"
                >
                  <option value="published" className="bg-[#f2faf7] text-[#0f2c38]">
                    Published
                  </option>
                  <option value="draft" className="bg-[#f2faf7] text-[#0f2c38]">
                    Draft (Hidden)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Package File Upload & Cloud Storage */}
          <div className="space-y-4 pt-4 border-t border-[#0f2c38]/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#0284c7] uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span>2. Package Upload (Supabase Storage)</span>
              </h3>
              <span className="text-[11px] text-[#0d9488] font-semibold">
                Storage Bucket: apps
              </span>
            </div>

            {/* Direct Package Upload Box */}
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#0f2c38] block">
                    Upload Package File (.APK, .ZIP, .JAR, .OBB)
                  </span>
                  <span className="text-[11px] text-[#355968]">
                    Directly uploads to Supabase Storage with percentage progress and permanent cloud delivery.
                  </span>
                </div>
                <label className="min-h-[42px] px-4 py-2 rounded-2xl liquid-glass-button text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Package</span>
                  <input
                    type="file"
                    accept=".apk,.zip,.jar,.mcaddon,.mcpack,.xapk,.obb"
                    className="hidden"
                    onChange={handlePackageUpload}
                  />
                </label>
              </div>
            </div>

            {/* File size value + Unit Selector (MB / GB) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl liquid-glass-subtle">
              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  File Size (Number) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={fileSizeValue}
                  onChange={(e) => setFileSizeValue(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                  placeholder="e.g. 850 or 2.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                  Unit Selector (MB / GB) *
                </label>
                <select
                  value={fileSizeUnit}
                  onChange={(e) => setFileSizeUnit(e.target.value as 'MB' | 'GB')}
                  className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488] font-bold"
                >
                  <option value="MB" className="bg-[#f2faf7] text-[#0f2c38]">
                    MB (Megabytes)
                  </option>
                  <option value="GB" className="bg-[#f2faf7] text-[#0f2c38]">
                    GB (Gigabytes)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#4a6f7d] uppercase block mb-1">
                  Formatted Public Display
                </label>
                <div className="h-[44px] rounded-2xl bg-white/90 border border-white flex items-center px-4 font-mono font-bold text-[#0d9488]">
                  {formattedSize}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#0f2c38] uppercase block mb-1">
                Architecture
              </label>
              <select
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                className="w-full min-h-[44px] bg-white/80 text-sm text-[#0f2c38] rounded-2xl px-3.5 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
              >
                <option value="ARM64" className="bg-[#f2faf7] text-[#0f2c38]">
                  ARM64 (64-bit)
                </option>
                <option value="ARM32" className="bg-[#f2faf7] text-[#0f2c38]">
                  ARM32 (32-bit)
                </option>
                <option value="Universal" className="bg-[#f2faf7] text-[#0f2c38]">
                  Universal (ARM64 / ARM32)
                </option>
              </select>
            </div>

            {/* Primary Download Destination */}
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0d9488] uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0d9488]" />
                  Primary Download Destination (Active)
                </span>
                <span className="text-[10px] text-[#4a6f7d] font-mono">Default Target</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-bold text-[#0f2c38] uppercase block mb-1">
                    Label / Provider *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Supabase Storage"
                    value={primaryName}
                    onChange={(e) => setPrimaryName(e.target.value)}
                    className="w-full min-h-[42px] bg-white/80 text-xs text-[#0f2c38] rounded-xl px-3 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-[#0f2c38] uppercase block mb-1">
                    Destination URL (HTTP / HTTPS / Storage URL) *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://... or Supabase storage URL"
                    value={primaryUrl}
                    onChange={(e) => setPrimaryUrl(e.target.value)}
                    className="w-full min-h-[42px] bg-white/80 text-xs text-[#0f2c38] rounded-xl px-3 py-2.5 border border-white/90 focus:outline-none focus:border-[#0d9488] font-mono"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Optional notes: e.g. Direct Supabase Storage CDN • Zero Queue"
                  value={downloadNotes}
                  onChange={(e) => setDownloadNotes(e.target.value)}
                  className="w-full bg-white/70 text-[11px] text-[#355968] rounded-xl px-3 py-2 border border-white/85 placeholder-[#648896]"
                />
              </div>
            </div>

            {/* Multiple Download Mirrors & Presets */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#0f2c38] uppercase">
                  Alternative Download Mirrors ({altLinks.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddAltLink('Google Drive')}
                    className="px-3 py-1.5 rounded-xl liquid-glass-button-secondary text-[11px] font-semibold text-[#0f2c38] cursor-pointer"
                  >
                    + Google Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAltLink('MediaFire')}
                    className="px-3 py-1.5 rounded-xl liquid-glass-button-secondary text-[11px] font-semibold text-[#0f2c38] cursor-pointer"
                  >
                    + MediaFire
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAltLink('Custom Mirror')}
                    className="px-3 py-1.5 rounded-xl bg-[#dff1ff] text-[11px] font-bold text-[#0284c7] border border-[#a2ddfc] hover:bg-[#cde8fc] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Mirror</span>
                  </button>
                </div>
              </div>

              {altLinks.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-white/55 border border-dashed border-[#0f2c38]/20 text-xs text-[#4a6f7d]">
                  No alternative mirrors added yet. Click above to add Google Drive, MediaFire, or custom mirrors.
                </div>
              ) : (
                <div className="space-y-2">
                  {altLinks.map((link, idx) => (
                    <div
                      key={link.id || idx}
                      className="p-3 rounded-xl liquid-glass-subtle flex flex-col sm:flex-row gap-2.5 items-start sm:items-center"
                    >
                      <div className="w-full sm:w-1/3">
                        <input
                          type="text"
                          placeholder="Mirror Label (e.g. MediaFire)"
                          value={link.name}
                          onChange={(e) => {
                            const updated = [...altLinks];
                            updated[idx].name = e.target.value;
                            setAltLinks(updated);
                          }}
                          className="w-full min-h-[40px] bg-white/80 text-xs text-[#0f2c38] rounded-xl px-2.5 py-2 border border-white/90 focus:outline-none"
                        />
                      </div>
                      <div className="w-full sm:flex-grow">
                        <input
                          type="url"
                          placeholder="https://example.com/mirror-url"
                          value={link.url}
                          onChange={(e) => {
                            const updated = [...altLinks];
                            updated[idx].url = e.target.value;
                            setAltLinks(updated);
                          }}
                          className="w-full min-h-[40px] bg-white/80 text-xs text-[#0f2c38] rounded-xl px-2.5 py-2 border border-white/90 font-mono focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(idx)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-[#0d9488] text-[10px] text-[#0f2c38] hover:text-white font-bold border border-white transition-colors cursor-pointer"
                          title="Set this mirror as the primary destination"
                        >
                          Set Primary
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAltLink(idx)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete mirror"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preserved Versions Notice */}
            {initialItem?.versions && initialItem.versions.length > 0 && (
              <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0f2c38]">
                  <History className="w-4 h-4 text-[#0284c7]" />
                  <span>Version History ({initialItem.versions.length} archived releases)</span>
                </div>
                <div className="space-y-1">
                  {initialItem.versions.map((v, i) => (
                    <div
                      key={v.id || i}
                      className="text-[11px] text-[#355968] flex items-center justify-between py-1 border-b border-[#0f2c38]/10"
                    >
                      <span className="font-mono text-[#0284c7] font-bold">{v.version}</span>
                      <span className="text-[#4a6f7d]">{v.releaseDate}</span>
                      <span className="text-[#4a6f7d]">{v.formattedFileSize || 'Unknown size'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Image Management & Live Previews */}
          <div className="space-y-4 pt-4 border-t border-[#0f2c38]/10">
            <h3 className="text-xs font-extrabold text-[#0284c7] uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>3. Image Management (Cloud Storage)</span>
            </h3>

            {/* Cover Image */}
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase">
                  Main Cover / Icon Image (1:1 aspect)
                </label>
                <label className="cursor-pointer text-xs font-semibold text-[#0284c7] hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Cover File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'cover')}
                  />
                </label>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 aspect-square rounded-xl overflow-hidden bg-white/80 border border-white flex-shrink-0">
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).classList.add('opacity-30');
                    }}
                  />
                </div>
                <input
                  type="url"
                  placeholder="https://... cover image URL"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-xs text-[#0f2c38] rounded-xl px-3 py-2 border border-white/90"
                />
              </div>
            </div>

            {/* Banner Image */}
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase">
                  Banner / Hero Image
                </label>
                <label className="cursor-pointer text-xs font-semibold text-[#0284c7] hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Banner File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'banner')}
                  />
                </label>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-28 h-16 rounded-xl overflow-hidden bg-white/80 border border-white flex-shrink-0">
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).classList.add('opacity-30');
                    }}
                  />
                </div>
                <input
                  type="url"
                  placeholder="https://... banner image URL"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-xs text-[#0f2c38] rounded-xl px-3 py-2 border border-white/90"
                />
              </div>
            </div>

            {/* Screenshots Gallery */}
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#0f2c38] uppercase">
                  Screenshots Gallery ({screenshots.length})
                </label>
                <label className="cursor-pointer text-xs font-semibold text-[#0284c7] hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Screenshot File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'screenshot')}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Add screenshot URL"
                  value={newScreenshotUrl}
                  onChange={(e) => setNewScreenshotUrl(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 text-xs text-[#0f2c38] rounded-xl px-3 py-2 border border-white/90"
                />
                <button
                  type="button"
                  onClick={handleAddScreenshot}
                  className="min-h-[44px] px-4 py-2 rounded-xl liquid-glass-button text-xs font-bold text-white flex-shrink-0 cursor-pointer"
                >
                  Add URL
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                {screenshots.map((shot, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-xl overflow-hidden bg-white/80 border border-white group"
                  >
                    <img src={shot} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveScreenshot(idx)}
                      className="absolute top-1 right-1 p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-rose-50 cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-4 border-t border-[#0f2c38]/10 flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl liquid-glass-button-secondary text-xs font-semibold text-[#355968] hover:text-[#0f2c38] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(activeUpload)}
              className="min-h-[44px] px-7 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving to Supabase...</span>
                </>
              ) : isEditing ? (
                'Update in Supabase'
              ) : (
                'Publish to Repository'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

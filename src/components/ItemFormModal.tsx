import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Item, ItemType, Category, DownloadLink } from '../types/admin';
import { formatFileSize, slugify, validateSlug } from '../utils/adminValidation';
import { isValidHttpUrl } from '../utils/urlValidation';

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
    initialItem?.coverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'
  );
  const [bannerUrl, setBannerUrl] = useState(
    initialItem?.bannerUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80'
  );
  const [screenshots, setScreenshots] = useState<string[]>(
    initialItem?.screenshots || [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    ]
  );
  const [newScreenshotUrl, setNewScreenshotUrl] = useState('');

  // Upload feedback state
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (newScreenshotUrl.trim()) {
      setScreenshots([...screenshots, newScreenshotUrl.trim()]);
      setNewScreenshotUrl('');
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  // Image file upload handler
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'icon' | 'cover' | 'banner' | 'screenshot'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTarget(target);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/admin/upload-image', {
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

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to upload image.');
          return;
        }

        // Apply uploaded URL
        if (target === 'icon') setIconUrl(data.url);
        else if (target === 'cover') setCoverUrl(data.url);
        else if (target === 'banner') setBannerUrl(data.url);
        else if (target === 'screenshot') setScreenshots((prev) => [...prev, data.url]);
      } catch (err) {
        console.error('Upload failed', err);
        setError('Network error during file upload.');
      } finally {
        setUploadingTarget(null);
      }
    };
    reader.readAsDataURL(file);
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
        setError(`Mirror "${link.name || `#${i + 1}`}" has an invalid URL. Only HTTP and HTTPS destinations are permitted.`);
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

    const payload = {
      type,
      title: title.trim(),
      slug: cleanSlug,
      version: version.trim(),
      status,
      category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
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
      downloadUrl: primaryUrl,
      downloadNotes,
      visibility,
      isFeatured,
    };

    try {
      const url = isEditing && initialItem ? `/api/admin/items/${initialItem.id}` : '/api/admin/items';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save item.');
        setLoading(false);
        return;
      }

      onSaved(data);
      onClose();
    } catch (err) {
      console.error('Save item error', err);
      setError('Network error saving item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#040714]/85 backdrop-blur-[24px] saturate-[180%] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl liquid-glass rounded-3xl border border-white/20 shadow-2xl p-6 sm:p-8 overflow-hidden text-left my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0A84FF]/25 to-[#BF5AF2]/25 border border-white/20 flex items-center justify-center text-[#0A84FF]">
              <Layers className="w-5 h-5 text-[#0A84FF]" />
            </div>
            <div>
              <h2 className="heading-font text-lg sm:text-xl font-bold text-white">
                {isEditing && initialItem ? `Edit ${initialItem.title}` : `Add New Content`}
              </h2>
              <p className="text-xs text-slate-400">
                Manage basic attributes, multiple mirrors, formatted file sizes, and image assets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl liquid-glass-subtle hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar flex-grow py-5 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#0A84FF] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>1. Basic Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Content Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ItemType)}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
                >
                  <option value="game" className="bg-[#0f172a]">Game</option>
                  <option value="mod" className="bg-[#0f172a]">Mod</option>
                  <option value="app" className="bg-[#0f172a]">App</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hollow Knight, Stardew Valley Expanded"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Custom URL Slug *
                </label>
                <div className="flex items-center bg-white/[0.08] rounded-2xl border border-white/15 px-3.5 py-2.5">
                  <span className="text-xs text-slate-400 font-mono">/{type}/</span>
                  <input
                    type="text"
                    required
                    placeholder="custom-slug"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="w-full bg-transparent text-sm text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Action, Simulation, Adventure"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
                >
                  <option value="Unofficial" className="bg-[#0f172a]">Unofficial / Mod</option>
                  <option value="Official" className="bg-[#0f172a]">Official</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Developer
                </label>
                <input
                  type="text"
                  value={developer}
                  placeholder="Original Studio"
                  onChange={(e) => setDeveloper(e.target.value)}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Porter / Maintainer
                </label>
                <input
                  type="text"
                  value={porter}
                  placeholder="e.g. Danil_05"
                  onChange={(e) => setPorter(e.target.value)}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Short Description
              </label>
              <input
                type="text"
                value={shortDescription}
                placeholder="One sentence summary for search and previews..."
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Full Description & Features
              </label>
              <textarea
                rows={3}
                value={description}
                placeholder="Comprehensive game description, mod features, gameplay instructions..."
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 resize-none"
              />
            </div>

            <div className="flex gap-4 items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-[#0A84FF]"
                />
                <span>Feature in Featured Section</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={obbRequired}
                  onChange={(e) => setObbRequired(e.target.checked)}
                  className="rounded text-[#0A84FF]"
                />
                <span>Requires OBB / Data Assets</span>
              </label>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-400">Visibility:</span>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="bg-white/[0.08] text-xs text-white rounded-xl px-2.5 py-1 border border-white/15 focus:outline-none"
                >
                  <option value="published" className="bg-[#0f172a]">Published</option>
                  <option value="draft" className="bg-[#0f172a]">Draft (Hidden)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Download Information */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold text-[#0A84FF] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>2. Download Information & File Size</span>
            </h3>

            {/* File size value + Unit Selector (MB / GB) per requirement 6 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl liquid-glass-subtle">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  File Size (Number) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={fileSizeValue}
                  onChange={(e) => setFileSizeValue(e.target.value)}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
                  placeholder="e.g. 850 or 2.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Unit Selector (MB / GB) *
                </label>
                <select
                  value={fileSizeUnit}
                  onChange={(e) => setFileSizeUnit(e.target.value as 'MB' | 'GB')}
                  className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 font-bold"
                >
                  <option value="MB" className="bg-[#0f172a]">MB (Megabytes)</option>
                  <option value="GB" className="bg-[#0f172a]">GB (Gigabytes)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                  Formatted Public Display
                </label>
                <div className="h-[42px] rounded-2xl bg-white/10 border border-white/15 flex items-center px-4 font-mono font-bold text-[#0A84FF]">
                  {formattedSize}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Architecture
              </label>
              <select
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
              >
                <option value="ARM64" className="bg-[#0f172a]">ARM64 (64-bit)</option>
                <option value="ARM32" className="bg-[#0f172a]">ARM32 (32-bit)</option>
                <option value="Universal" className="bg-[#0f172a]">Universal (ARM64 / ARM32)</option>
              </select>
            </div>

            {/* Primary Download Destination */}
            <div className="p-4 rounded-2xl liquid-glass-subtle border border-[#0A84FF]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0A84FF] uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0A84FF] animate-pulse" />
                  Primary Download Destination (Active)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Default Target
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-300 uppercase block mb-1">
                    Label / Provider *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Primary Download, Google Drive"
                    value={primaryName}
                    onChange={(e) => setPrimaryName(e.target.value)}
                    className="w-full bg-white/[0.08] text-xs text-white rounded-xl px-3 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-300 uppercase block mb-1">
                    Destination URL (HTTP / HTTPS) *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/download/game-package"
                    value={primaryUrl}
                    onChange={(e) => setPrimaryUrl(e.target.value)}
                    className="w-full bg-white/[0.08] text-xs text-white rounded-xl px-3 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 font-mono"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Optional notes: e.g. Direct HTTP/3 • Zero Queue"
                  value={downloadNotes}
                  onChange={(e) => setDownloadNotes(e.target.value)}
                  className="w-full bg-white/[0.05] text-[11px] text-slate-300 rounded-xl px-3 py-1.5 border border-white/10 placeholder-slate-500"
                />
              </div>
            </div>

            {/* Multiple Download Mirrors & Presets */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-300 uppercase">
                  Alternative Download Mirrors ({altLinks.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddAltLink('Google Drive')}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[#0A84FF]/20 text-[11px] text-slate-200 hover:text-white border border-white/15 transition-colors"
                  >
                    + Google Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAltLink('MediaFire')}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[#0A84FF]/20 text-[11px] text-slate-200 hover:text-white border border-white/15 transition-colors"
                  >
                    + MediaFire
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAltLink(`Alternative Download ${altLinks.length + 1}`)}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[#0A84FF]/20 text-[11px] text-slate-200 hover:text-white border border-white/15 transition-colors"
                  >
                    + Alternative Download
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAltLink('Custom Mirror')}
                    className="px-2.5 py-1 rounded-xl bg-[#0A84FF]/20 text-[11px] text-[#0A84FF] border border-[#0A84FF]/40 hover:bg-[#0A84FF]/30 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Mirror</span>
                  </button>
                </div>
              </div>

              {altLinks.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-white/[0.03] border border-dashed border-white/10 text-xs text-slate-400">
                  No alternative mirrors added yet. Click above to add Google Drive, MediaFire, or custom mirrors.
                </div>
              ) : (
                <div className="space-y-2">
                  {altLinks.map((link, idx) => (
                    <div
                      key={link.id || idx}
                      className="p-3 rounded-xl liquid-glass-subtle border border-white/10 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center"
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
                          className="w-full bg-white/[0.08] text-xs text-white rounded-lg px-2.5 py-2 border border-white/15 focus:outline-none"
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
                          className="w-full bg-white/[0.08] text-xs text-white rounded-lg px-2.5 py-2 border border-white/15 font-mono focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(idx)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-[#0A84FF] text-[10px] text-slate-300 hover:text-white font-semibold transition-colors"
                          title="Set this mirror as the primary destination"
                        >
                          Set Primary
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAltLink(idx)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors"
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
          </div>

          {/* Section 3: Image Management & Live Previews */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold text-[#0A84FF] uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>3. Image Management & Uploads</span>
            </h3>

            {/* Cover Image */}
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 uppercase">
                  Main Cover Image (3:4 aspect)
                </label>
                <label className="cursor-pointer text-xs text-[#0A84FF] hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'cover')}
                  />
                </label>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-16 h-22 rounded-xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = '0.3';
                    }}
                  />
                </div>
                <input
                  type="url"
                  placeholder="https://... cover image URL"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full bg-white/[0.08] text-xs text-white rounded-xl px-3 py-2 border border-white/15"
                />
              </div>
            </div>

            {/* Banner Image */}
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 uppercase">
                  Banner / Hero Image
                </label>
                <label className="cursor-pointer text-xs text-[#0A84FF] hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'banner')}
                  />
                </label>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-28 h-16 rounded-xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = '0.3';
                    }}
                  />
                </div>
                <input
                  type="url"
                  placeholder="https://... banner image URL"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full bg-white/[0.08] text-xs text-white rounded-xl px-3 py-2 border border-white/15"
                />
              </div>
            </div>

            {/* Screenshots Gallery */}
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 uppercase">
                  Screenshots Gallery ({screenshots.length})
                </label>
                <label className="cursor-pointer text-xs text-[#0A84FF] hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Screenshot</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'screenshot')}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Add screenshot URL"
                  value={newScreenshotUrl}
                  onChange={(e) => setNewScreenshotUrl(e.target.value)}
                  className="w-full bg-white/[0.08] text-xs text-white rounded-xl px-3 py-2 border border-white/15"
                />
                <button
                  type="button"
                  onClick={handleAddScreenshot}
                  className="px-4 py-2 rounded-xl liquid-glass-button text-xs font-bold text-white flex-shrink-0"
                >
                  Add URL
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                {screenshots.map((shot, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-white/10 border border-white/20 group">
                    <img src={shot} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveScreenshot(idx)}
                      className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-4 border-t border-white/10 flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl liquid-glass-subtle text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Content' : 'Publish Content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

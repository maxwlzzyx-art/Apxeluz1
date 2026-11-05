import React, { useState, useEffect } from 'react';
import { X, Crown, Save, Loader2, AlertCircle } from 'lucide-react';
import { PremiumGame } from '../types/premium';
import { slugify } from '../utils/adminValidation';

interface AdminPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (game: Partial<PremiumGame>) => Promise<void>;
  initialGame?: PremiumGame | null;
}

export const AdminPremiumModal: React.FC<AdminPremiumModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialGame,
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('35000');
  const [originalPrice, setOriginalPrice] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [screenshotsText, setScreenshotsText] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [version, setVersion] = useState('v1.0.0');
  const [fileSize, setFileSize] = useState('1.5 GB');
  const [featuresText, setFeaturesText] = useState('');
  const [category, setCategory] = useState('Games');
  const [developer, setDeveloper] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [visibility, setVisibility] = useState<'published' | 'draft'>('published');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialGame) {
      setTitle(initialGame.title || '');
      setSlug(initialGame.slug || '');
      setPrice(String(initialGame.price || 0));
      setOriginalPrice(initialGame.originalPrice ? String(initialGame.originalPrice) : '');
      setShortDescription(initialGame.shortDescription || '');
      setDescription(initialGame.description || '');
      setIconUrl(initialGame.iconUrl || '');
      setCoverUrl(initialGame.coverUrl || '');
      setBannerUrl(initialGame.bannerUrl || '');
      setScreenshotsText((initialGame.screenshots || []).join('\n'));
      setDownloadUrl(initialGame.downloadUrl || '');
      setVersion(initialGame.version || 'v1.0.0');
      setFileSize(initialGame.fileSize || '500 MB');
      setFeaturesText((initialGame.features || []).join('\n'));
      setCategory(initialGame.category || 'Games');
      setDeveloper(initialGame.developer || 'Independent Developer');
      setIsActive(initialGame.isActive !== false);
      setVisibility(initialGame.visibility || 'published');
    } else {
      setTitle('');
      setSlug('');
      setPrice('35000');
      setOriginalPrice('50000');
      setShortDescription('');
      setDescription('');
      setIconUrl('');
      setCoverUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80');
      setBannerUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80');
      setScreenshotsText('');
      setDownloadUrl('https://apxeluz.my.id/downloads/premium/game.apk');
      setVersion('v1.0.0');
      setFileSize('1.2 GB');
      setFeaturesText('60FPS Graphics\nFull Gamepad Support');
      setCategory('Games');
      setDeveloper('Independent Developer');
      setIsActive(true);
      setVisibility('published');
    }
    setError(null);
  }, [initialGame, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialGame) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !downloadUrl.trim()) {
      setError('Judul dan URL Download wajib diisi.');
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Harga harus berupa angka valid (>= 0).');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const screenshots = screenshotsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const features = featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      await onSave({
        id: initialGame?.id,
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        price: numPrice,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        iconUrl: iconUrl.trim(),
        coverUrl: coverUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        screenshots,
        downloadUrl: downloadUrl.trim(),
        version: version.trim() || 'v1.0.0',
        fileSize: fileSize.trim() || '500 MB',
        features,
        category: category.trim() || 'Games',
        developer: developer.trim() || 'Independent Developer',
        isActive,
        visibility,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan game premium.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl liquid-glass border border-white/20 p-6 sm:p-8 space-y-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="heading-font text-xl font-bold text-white">
              {initialGame ? 'Edit Game Premium' : 'Tambah Game Premium Baru'}
            </h2>
            <p className="text-xs text-slate-400">
              Kelola metadata produk, harga Rupiah, status publikasi, dan file unduhan.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Judul Game *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Grand Theft Auto: San Andreas HD"
                required
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="gta-san-andreas-hd"
                required
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Harga Jual (IDR / Rupiah) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="35000"
                min="0"
                required
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none font-mono text-amber-300 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Harga Asli / Coret (Opsional)</label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="60000"
                min="0"
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none font-mono text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Kategori</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Games"
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 text-white text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Versi</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 text-white text-xs outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Ukuran File</label>
              <input
                type="text"
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
                placeholder="1.5 GB"
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 text-white text-xs outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">URL File Unduhan Rahasia *</label>
            <input
              type="url"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://storage.supabase.co/apks/game.apk"
              required
              className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none font-mono"
            />
            <span className="text-[10px] text-slate-400 block">
              Tautan ini hanya diberikan kepada pembeli setelah pembayaran terverifikasi oleh webhook QiosPay.
            </span>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">Deskripsi Singkat</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Remaster grafis 60FPS dengan controller support..."
              className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 text-white text-xs outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">Deskripsi Lengkap</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Jelaskan fitur-fitur eksklusif dari game premium ini..."
              className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 text-white text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">URL Cover / Thumbnail</label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 text-white text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">URL Icon</label>
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 text-white text-xs outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Tangkapan Layar / Screenshots (Satu URL per baris)
            </label>
            <textarea
              value={screenshotsText}
              onChange={(e) => setScreenshotsText(e.target.value)}
              rows={2}
              placeholder="https://...&#10;https://..."
              className="w-full px-3.5 py-2 rounded-xl liquid-glass border border-white/15 text-white text-xs outline-none font-mono"
            />
          </div>

          {/* Status & Publication Toggles */}
          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Status Produk Aktif</span>
                <span className="text-[10px] text-slate-400">Bisa dibeli oleh publik</span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Status Publikasi</span>
                <span className="text-[10px] text-slate-400">Tampilkan di katalog</span>
              </div>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs outline-none"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs text-slate-300 hover:text-white transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-black font-extrabold text-xs shadow-lg active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Game Premium</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

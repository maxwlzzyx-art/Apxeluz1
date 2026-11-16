import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  Link2,
} from 'lucide-react';
import { PremiumGame, PremiumPaymentPlan } from '../types/premium';
import { slugify } from '../utils/adminValidation';
import {
  buildDefaultPlansForGame,
  normalizePaymentPlans,
  validatePaymentPlans,
  getStartingPrice,
  formatRupiah,
} from '../utils/premiumPlans';
import { useScrollLock } from '../utils/useScrollLock';
import { useSwipeToClose } from '../utils/useSwipeToClose';

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
  useScrollLock(isOpen);
  const { sheetMotionClass, handleBarClass, dragHandlers } = useSwipeToClose(onClose, isOpen);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [screenshotsText, setScreenshotsText] = useState('');
  const [version, setVersion] = useState('v1.0.0');
  const [fileSize, setFileSize] = useState('1.5 GB');
  const [featuresText, setFeaturesText] = useState('');
  const [category, setCategory] = useState('Games');
  const [developer, setDeveloper] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [visibility, setVisibility] = useState<'published' | 'draft'>('published');
  const [paymentPlans, setPaymentPlans] = useState<PremiumPaymentPlan[]>(() =>
    buildDefaultPlansForGame(20000, 'https://apxeluz.my.id/premium-checkout')
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialGame) {
      setTitle(initialGame.title || '');
      setSlug(initialGame.slug || '');
      setOriginalPrice(initialGame.originalPrice ? String(initialGame.originalPrice) : '');
      setShortDescription(initialGame.shortDescription || '');
      setDescription(initialGame.description || '');
      setIconUrl(initialGame.iconUrl || '');
      setCoverUrl(initialGame.coverUrl || '');
      setBannerUrl(initialGame.bannerUrl || '');
      setScreenshotsText((initialGame.screenshots || []).join('\n'));
      setVersion(initialGame.version || 'v1.0.0');
      setFileSize(initialGame.fileSize || '500 MB');
      setFeaturesText((initialGame.features || []).join('\n'));
      setCategory(initialGame.category || 'Games');
      setDeveloper(initialGame.developer || 'Independent Developer');
      setIsActive(initialGame.isActive !== false);
      setVisibility(initialGame.visibility || 'published');
      setPaymentPlans(
        normalizePaymentPlans(initialGame.paymentPlans, initialGame.price, initialGame.downloadUrl)
      );
    } else {
      setTitle('');
      setSlug('');
      setOriginalPrice('35000');
      setShortDescription('');
      setDescription('');
      setIconUrl('');
      setCoverUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80');
      setBannerUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80');
      setScreenshotsText('');
      setVersion('v1.0.0');
      setFileSize('1.2 GB');
      setFeaturesText('60FPS Graphics\nFull Gamepad Support');
      setCategory('Games');
      setDeveloper('Independent Developer');
      setIsActive(true);
      setVisibility('published');
      setPaymentPlans(buildDefaultPlansForGame(20000, 'https://apxeluz.my.id/premium-checkout'));
    }
    setError(null);
  }, [initialGame, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialGame) {
      setSlug(slugify(val));
    }
  };

  const handlePlanChange = (
    index: number,
    patch: Partial<PremiumPaymentPlan>
  ) => {
    setPaymentPlans((prev) =>
      prev.map((plan, idx) => (idx === index ? { ...plan, ...patch } : plan))
    );
  };

  const handleToggleLifetime = (index: number, isLifetime: boolean) => {
    setPaymentPlans((prev) =>
      prev.map((plan, idx) => {
        if (idx !== index) return plan;
        if (isLifetime) {
          return {
            ...plan,
            durationDays: null,
            label:
              !plan.label || /^\d+\s*Hari$/i.test(plan.label.trim())
                ? 'Lifetime'
                : plan.label,
          };
        }
        const fallbackDays = plan.durationDays && plan.durationDays > 0 ? plan.durationDays : 30;
        return {
          ...plan,
          durationDays: fallbackDays,
          label:
            plan.label.trim().toLowerCase() === 'lifetime'
              ? `${fallbackDays} Hari`
              : plan.label,
        };
      })
    );
  };

  const handleAddPlan = () => {
    setPaymentPlans((prev) => [
      ...prev,
      {
        id: `plan-${Date.now()}`,
        label: '7 Hari',
        durationDays: 7,
        price: 10000,
        paymentUrl: prev[0]?.paymentUrl || 'https://apxeluz.my.id/premium-checkout',
      },
    ]);
  };

  const handleRemovePlan = (index: number) => {
    setPaymentPlans((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Judul Game Premium wajib diisi.');
      return;
    }

    const planCheck = validatePaymentPlans(paymentPlans);
    if (!planCheck.valid) {
      setError(planCheck.error || 'Periksa kembali daftar paket durasi & link pembayaran.');
      return;
    }

    const sanitizedPlans: PremiumPaymentPlan[] = paymentPlans.map((p, idx) => ({
      id: p.id?.trim() || `plan-${idx + 1}`,
      label: p.label.trim(),
      durationDays:
        p.durationDays === null || p.durationDays === undefined
          ? null
          : Math.max(1, Math.round(Number(p.durationDays))),
      price: Math.max(0, Number(p.price)),
      paymentUrl: p.paymentUrl.trim(),
    }));

    const startingPrice = getStartingPrice({ price: 0, paymentPlans: sanitizedPlans });

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
        price: startingPrice,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        iconUrl: iconUrl.trim(),
        coverUrl: coverUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        screenshots,
        downloadUrl: sanitizedPlans[0]?.paymentUrl || '',
        paymentPlans: sanitizedPlans,
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

  const startingPricePreview = getStartingPrice({ price: 0, paymentPlans });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={initialGame ? 'Edit Game Premium' : 'Tambah Game Premium Baru'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-[28px] sm:rounded-3xl liquid-glass shadow-2xl overflow-hidden ${sheetMotionClass}`}
      >
        <div
          {...dragHandlers}
          className="px-5 pt-2 pb-4 sm:px-8 sm:pt-3 sm:pb-4 border-b border-[#10242E]/10 flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
          title="Geser ke bawah untuk menutup"
        >
          <div className="flex justify-center pt-1 pb-3">
            <div className={handleBarClass} />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal game premium"
            className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#4A6270] hover:text-[#10242E] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-300/70 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="heading-font text-lg sm:text-xl font-extrabold text-[#0f2c38] text-3d-subtle">
                {initialGame ? 'Edit Game Premium' : 'Tambah Game Premium Baru'}
              </h2>
              <p className="text-xs text-[#355968]">
                Atur paket durasi (30 Hari / Lifetime), harga Rupiah, serta link pembayaran yang sudah mencakup akses download.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-5 sm:p-8 pt-4 space-y-5 custom-scrollbar"
        >
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0f2c38]">Judul Game *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Grand Theft Auto: San Andreas HD"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] placeholder-[#648896] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0f2c38]">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="gta-san-andreas-hd"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] placeholder-[#648896] text-xs outline-none font-mono shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>
          </div>

          {/* Paket Durasi & Link Pembayaran Builder */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/75 border border-white/90 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#0f2c38] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0d9488]" />
                  <span>Paket Durasi &amp; Link Pembayaran *</span>
                </h3>
                <p className="text-[11px] text-[#4a6f7d] mt-0.5">
                  Link bayar yang dimasukkan sudah mencakup link download otomatis setelah pembeli menekan Konfirmasi.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPlan}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl liquid-glass-button text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Paket</span>
              </button>
            </div>

            <div className="space-y-3">
              {paymentPlans.map((plan, idx) => {
                const isLifetime = plan.durationDays === null || plan.durationDays === undefined;
                return (
                  <div
                    key={plan.id || idx}
                    className="p-3.5 rounded-2xl bg-[#f4fbf8] border border-[#0d9488]/20 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-[#0f766e] uppercase tracking-wider">
                        Paket #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0f2c38] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isLifetime}
                            onChange={(e) => handleToggleLifetime(idx, e.target.checked)}
                            className="w-4 h-4 accent-[#0d9488] rounded cursor-pointer"
                          />
                          <span>Lifetime (Permanen)</span>
                        </label>
                        {paymentPlans.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePlan(idx)}
                            aria-label={`Hapus paket ${plan.label}`}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-[#355968]">
                          Label Tombol *
                        </label>
                        <input
                          type="text"
                          value={plan.label}
                          onChange={(e) => handlePlanChange(idx, { label: e.target.value })}
                          placeholder="30 Hari / Lifetime"
                          required
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-white border border-white text-[#0f2c38] text-xs outline-none focus:border-[#0d9488]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-[#355968]">
                          {isLifetime ? 'Durasi' : 'Jumlah Hari *'}
                        </label>
                        {isLifetime ? (
                          <div className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center">
                            Selamanya (Lifetime)
                          </div>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            value={plan.durationDays ?? 30}
                            onChange={(e) => {
                              const days = Math.max(1, Number(e.target.value) || 1);
                              handlePlanChange(idx, {
                                durationDays: days,
                                label:
                                  /^\d+\s*Hari$/i.test(plan.label.trim()) || !plan.label.trim()
                                    ? `${days} Hari`
                                    : plan.label,
                              });
                            }}
                            required
                            className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-white border border-white text-[#0f2c38] text-xs font-mono outline-none focus:border-[#0d9488]"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-[#355968]">
                          Harga (IDR) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={plan.price}
                          onChange={(e) =>
                            handlePlanChange(idx, { price: Math.max(0, Number(e.target.value) || 0) })
                          }
                          placeholder="20000"
                          required
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-white border border-white text-[#0f766e] font-bold font-mono text-xs outline-none focus:border-[#0d9488]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-[#355968] flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5 text-[#0284c7]" />
                        <span>Link Pembayaran Admin (Sudah Include Download) *</span>
                      </label>
                      <input
                        type="url"
                        value={plan.paymentUrl}
                        onChange={(e) => handlePlanChange(idx, { paymentUrl: e.target.value })}
                        placeholder="https://saweria.co/... atau https://trakteer.id/... atau link checkout Anda"
                        required
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-white border border-white text-[#0f2c38] font-mono text-xs outline-none focus:border-[#0d9488]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#0f2c38]/10 text-[11px] text-[#355968]">
              <span>
                Harga Mulai di Katalog:{' '}
                <strong className="font-mono text-[#0f766e]">{formatRupiah(startingPricePreview)}</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#4a6f7d]">Harga Coret (Opsional):</span>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="35000"
                  min={0}
                  className="w-28 min-h-[34px] px-2.5 py-1 rounded-xl bg-white border border-[#0f2c38]/10 text-[#4a6f7d] text-xs font-mono outline-none focus:border-[#0d9488]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0f2c38]">Kategori</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Games"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0f2c38]">Versi</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] text-xs outline-none font-mono shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0f2c38]">Ukuran File</label>
              <input
                type="text"
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
                placeholder="1.5 GB"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0f2c38]">Developer / Modder</label>
              <input
                type="text"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="Independent Developer"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#10242E]">
                Deskripsi Singkat (Bisa Enter untuk baris baru)
              </label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                rows={2}
                placeholder="Remaster grafis 60FPS&#10;Support full controller"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/85 border border-[#D3DDE3] focus:border-[#0D9488] text-[#10242E] text-xs outline-none shadow-[inset_0_2px_4px_rgba(16,36,46,0.05)]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#10242E]">
              Deskripsi Lengkap (Tekan Enter untuk spasi ke bawah / paragraf baru)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Baris 1: Fitur utama game&#10;&#10;Baris 2: Detail tambahan & cara pasang"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/85 border border-[#D3DDE3] focus:border-[#0D9488] text-[#10242E] text-xs leading-relaxed outline-none shadow-[inset_0_2px_4px_rgba(16,36,46,0.05)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0f2c38]">
                URL Icon / Cover (Rasio 1:1)
              </label>
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0f2c38]">
                URL Cover / Thumbnail (1:1)
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>
          </div>

          {(iconUrl || coverUrl) && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-white">
              <div className="w-14 h-14 aspect-square rounded-2xl overflow-hidden bg-white border border-white shadow-sm flex-shrink-0">
                <img
                  src={iconUrl || coverUrl}
                  alt="Preview icon 1:1"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-[11px] text-[#355968]">
                <strong className="text-[#0f2c38] block">Pratinjau Icon (1:1)</strong>
                <span>Semua kartu game ditampilkan dalam format kotak 1:1 agar konsisten di mobile dan desktop.</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#0f2c38]">
              Fitur Unggulan (Satu baris per fitur)
            </label>
            <textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={2}
              placeholder="60FPS Graphics&#10;Full Gamepad Support"
              className="w-full px-3.5 py-2 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#0f2c38]">
              Tangkapan Layar / Screenshots (Satu URL per baris)
            </label>
            <textarea
              value={screenshotsText}
              onChange={(e) => setScreenshotsText(e.target.value)}
              rows={2}
              placeholder="https://...&#10;https://..."
              className="w-full px-3.5 py-2 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] text-xs outline-none font-mono shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
            />
          </div>

          {/* Status & Publication Toggles */}
          <div className="p-4 rounded-2xl bg-white/75 border border-white/90 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#0f2c38] block">Status Produk Aktif</span>
                <span className="text-[11px] text-[#4a6f7d]">Bisa dipilih oleh publik</span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 accent-[#0d9488] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#0f2c38] block">Status Publikasi</span>
                <span className="text-[11px] text-[#4a6f7d]">Tampilkan di katalog</span>
              </div>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'published' | 'draft')}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/90 border border-white text-[#0f2c38] text-xs font-semibold outline-none"
              >
                <option value="published" className="bg-[#f2faf7] text-[#0f2c38]">
                  Published
                </option>
                <option value="draft" className="bg-[#f2faf7] text-[#0f2c38]">
                  Draft
                </option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#0f2c38]/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl liquid-glass-button-secondary text-xs font-semibold text-[#355968] hover:text-[#0f2c38] cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] flex items-center gap-2 px-6 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
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

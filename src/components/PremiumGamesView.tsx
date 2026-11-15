import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Search,
  X,
  Eye,
  Link2,
} from 'lucide-react';
import { PremiumGame, PremiumPaymentPlan } from '../types/premium';
import { safeFetchJson } from '../utils/apiClient';
import {
  formatRupiah,
  getStartingPrice,
  normalizePaymentPlans,
} from '../utils/premiumPlans';
import { safeOpenExternalUrl } from '../utils/urlValidation';
import { useScrollLock } from '../utils/useScrollLock';

interface PremiumGamesViewProps {
  onNavigateHome: () => void;
}

export const PremiumGamesView: React.FC<PremiumGamesViewProps> = ({ onNavigateHome }) => {
  const [games, setGames] = useState<PremiumGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected game for detail modal
  const [selectedGame, setSelectedGame] = useState<PremiumGame | null>(null);

  // Selected plan pending user confirmation
  const [confirmingPurchase, setConfirmingPurchase] = useState<{
    game: PremiumGame;
    plan: PremiumPaymentPlan;
  } | null>(null);
  const [redirectTriggered, setRedirectTriggered] = useState(false);

  // Prevent background page scroll bleed while any modal is open
  useScrollLock(Boolean(selectedGame || confirmingPurchase));

  const fetchGames = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson<PremiumGame[]>('/api/v1/premium-games');
      if (res.ok && Array.isArray(res.data)) {
        setGames(res.data);
      }
    } catch (err) {
      console.warn('Failed loading premium games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const getPlansForGame = (game: PremiumGame): PremiumPaymentPlan[] => {
    return normalizePaymentPlans(game.paymentPlans, game.price, game.downloadUrl);
  };

  const handleChoosePlan = (game: PremiumGame, plan: PremiumPaymentPlan) => {
    setSelectedGame(null);
    setRedirectTriggered(false);
    setConfirmingPurchase({ game, plan });
  };

  const handleConfirmRedirect = () => {
    if (!confirmingPurchase) return;
    const opened = safeOpenExternalUrl(confirmingPurchase.plan.paymentUrl, '_blank');
    if (opened) {
      setRedirectTriggered(true);
    }
  };

  const filteredGames = games.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      g.title.toLowerCase().includes(q) ||
      g.shortDescription.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Hero Banner with 3D Frosted Liquid Glass */}
      <section className="relative overflow-hidden rounded-[28px] sm:rounded-3xl p-5 sm:p-10 liquid-glass">
        <div className="liquid-orb absolute -right-14 -top-14 w-56 h-56 bg-gradient-to-br from-[#a7f3d0]/60 via-[#bae6fd]/50 to-transparent blur-2xl pointer-events-none" />
        <div className="liquid-orb absolute -left-14 -bottom-14 w-56 h-56 bg-gradient-to-tr from-[#bae6fd]/55 to-transparent blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/70 text-amber-900 text-[11px] font-bold uppercase tracking-wider shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>APXELUZ PREMIUM REPOSITORY</span>
            </div>
            <h1 className="heading-font text-2xl sm:text-4xl font-extrabold text-[#0f2c38] text-3d tracking-tight leading-tight">
              Eksklusif Game &amp; Mod{' '}
              <span className="text-[#0f766e]">Koleksi Premium</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#355968] leading-relaxed">
              Pilih durasi akses fleksibel (<strong className="text-[#0f2c38]">30 Hari</strong> atau{' '}
              <strong className="text-[#0f2c38]">Lifetime</strong>). Link pembayaran resmi dari admin sudah mencakup tautan unduhan file lengkap secara langsung.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-2xl liquid-glass-button-secondary text-[#0f2c38] font-bold text-xs cursor-pointer"
            >
              <span>Jelajahi Game Gratis</span>
              <ChevronRight className="w-4 h-4 text-[#0284c7]" />
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-[#0f2c38]/10 text-xs text-[#355968] font-medium">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0d9488] flex-shrink-0" />
            <span>Garansi 100% Bersih &amp; Terkurasi</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#0284c7] flex-shrink-0" />
            <span>Pilihan Durasi 30 Hari &amp; Lifetime</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Link Bayar Sudah Include Download</span>
          </div>
        </div>
      </section>

      {/* Search and Count Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl liquid-glass-subtle flex items-center justify-center text-[#0d9488]">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <h2 className="heading-font text-base sm:text-lg font-extrabold text-[#0f2c38] text-3d-subtle uppercase tracking-tight flex items-center gap-2">
            <span>DAFTAR GAME PREMIUM</span>
            <span className="text-xs font-mono text-[#0284c7]">({filteredGames.length})</span>
          </h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[#4a6f7d] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari game premium..."
            className="w-full min-h-[44px] bg-white/75 text-[#0f2c38] placeholder-[#5a7d8a] text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-white/90 shadow-[inset_0_2px_4px_rgba(15,44,56,0.06)] focus:outline-none focus:border-[#0d9488] backdrop-blur-md"
          />
        </div>
      </div>

      {/* Grid of Premium Games */}
      {loading ? (
        <div className="py-16 text-center space-y-3 liquid-glass rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0d9488]" />
          <p className="text-xs font-semibold text-[#355968]">Memuat katalog game premium...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-14 liquid-glass rounded-3xl space-y-3 px-4">
          <ShoppingBag className="w-10 h-10 mx-auto text-[#4a6f7d]" />
          <h3 className="heading-font text-base font-bold text-[#0f2c38]">
            Tidak ada game premium yang sesuai
          </h3>
          <p className="text-xs text-[#4a6f7d] max-w-sm mx-auto">
            Coba ubah kata kunci pencarian Anda atau periksa kembali nanti.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredGames.map((game) => {
            const plans = getPlansForGame(game);
            const startingPrice = getStartingPrice(game);

            return (
              <div
                key={game.id}
                className="group rounded-[26px] liquid-glass-card overflow-hidden flex flex-col"
              >
                {/* 1:1 Square Cover / Icon Art */}
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff]">
                  <img
                    src={game.iconUrl || game.coverUrl || game.bannerUrl}
                    alt={game.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f2c38]/45 via-transparent to-[#0f2c38]/10 pointer-events-none" />

                  {/* Badge Top Left */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100/95 border border-amber-300/80 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>PREMIUM</span>
                  </div>

                  {/* Version Badge Top Right */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-white/85 border border-white text-[#0f2c38] font-mono font-bold text-[10px] backdrop-blur-md shadow-sm">
                    {game.version}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#0d9488] uppercase tracking-wider truncate">
                        {game.developer}
                      </span>
                      <span className="text-[10px] text-[#4a6f7d] font-mono flex-shrink-0">
                        {game.fileSize}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <h3 className="heading-font text-base sm:text-lg font-extrabold text-[#0f2c38] text-3d-subtle line-clamp-1 group-hover:text-[#0d9488] transition-colors">
                        {game.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSelectedGame(game)}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl liquid-glass-button-secondary text-[#355968] hover:text-[#0f2c38] cursor-pointer flex-shrink-0"
                        title="Lihat Detail Produk"
                        aria-label={`Lihat detail ${game.title}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-[#355968] line-clamp-2 leading-relaxed">
                      {game.shortDescription || game.description}
                    </p>

                    {/* Feature Tags */}
                    {game.features && game.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {game.features.slice(0, 3).map((feat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-white/75 text-[10px] font-medium text-[#355968] border border-white/90 shadow-xs"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Duration Plans & Direct Selection */}
                  <div className="pt-3 border-t border-[#0f2c38]/10 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#4a6f7d]">Pilih Paket Durasi:</span>
                      <span className="font-mono font-bold text-[#0f766e]">
                        Mulai {formatRupiah(startingPrice)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => handleChoosePlan(game, plan)}
                          className="min-h-[50px] px-3 py-2 rounded-2xl liquid-glass-button text-white text-left flex flex-col justify-center cursor-pointer"
                        >
                          <span className="text-[11px] font-extrabold leading-tight flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-90 flex-shrink-0" />
                            <span className="truncate">{plan.label}</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-100 mt-0.5">
                            {formatRupiah(plan.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL (Scroll-Locked Sheet) */}
      {selectedGame && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setSelectedGame(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Detail ${selectedGame.title}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-[28px] sm:rounded-3xl liquid-glass shadow-2xl overflow-hidden"
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#0f2c38]/20" />
            </div>

            <button
              type="button"
              onClick={() => setSelectedGame(null)}
              aria-label="Tutup detail game premium"
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] cursor-pointer z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-5 sm:p-8 space-y-5 custom-scrollbar">
              {/* Top 1:1 Icon + Title */}
              <div className="flex items-center gap-4 pr-10">
                <div className="w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff] border border-white shadow-md flex-shrink-0">
                  <img
                    src={selectedGame.iconUrl || selectedGame.coverUrl || selectedGame.bannerUrl}
                    alt={selectedGame.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/90 text-amber-900 border border-amber-300/70 text-[10px] font-extrabold uppercase">
                    <Crown className="w-3 h-3 text-amber-600" />
                    <span>{selectedGame.category || 'Games'}</span>
                  </span>
                  <h2 className="heading-font text-xl sm:text-2xl font-extrabold text-[#0f2c38] text-3d-subtle leading-tight">
                    {selectedGame.title}
                  </h2>
                  <p className="text-xs text-[#4a6f7d] font-medium">
                    {selectedGame.developer} • {selectedGame.version} • {selectedGame.fileSize}
                  </p>
                </div>
              </div>

              {/* Screenshots */}
              {selectedGame.screenshots && selectedGame.screenshots.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#0f2c38] uppercase tracking-wider">
                    Tangkapan Layar
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {selectedGame.screenshots.map((s, idx) => (
                      <img
                        key={idx}
                        src={s}
                        alt={`Screenshot ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="rounded-xl border border-white/80 h-28 w-full object-cover shadow-sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5 text-xs text-[#355968] leading-relaxed">
                <h3 className="text-xs font-bold text-[#0f2c38] uppercase tracking-wider">Deskripsi</h3>
                <p>{selectedGame.description || selectedGame.shortDescription}</p>
              </div>

              {/* Plans Selector inside Detail Modal */}
              <div className="pt-4 border-t border-[#0f2c38]/10 space-y-3">
                <h3 className="text-xs font-bold text-[#0f2c38] uppercase tracking-wider">
                  Pilih Paket Durasi &amp; Lanjut Pembayaran
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {getPlansForGame(selectedGame).map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => handleChoosePlan(selectedGame, plan)}
                      className="min-h-[52px] px-4 py-3 rounded-2xl liquid-glass-button text-white flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="text-xs font-extrabold flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{plan.label}</span>
                      </span>
                      <span className="font-mono text-sm font-extrabold text-emerald-100">
                        {formatRupiah(plan.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL (Duration + Price + Confirm Redirect to Admin Link) */}
      {confirmingPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setConfirmingPurchase(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi Paket Game Premium"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-t-[28px] sm:rounded-3xl liquid-glass shadow-2xl overflow-hidden"
          >
            <div className="sm:hidden flex justify-center pt-3 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#0f2c38]/20" />
            </div>

            <button
              type="button"
              onClick={() => setConfirmingPurchase(null)}
              aria-label="Tutup konfirmasi pembelian"
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-5 sm:p-7 space-y-5">
              <div className="flex items-center gap-3.5 pr-8">
                <div className="w-14 h-14 aspect-square rounded-2xl overflow-hidden bg-white/90 border border-white shadow-md flex-shrink-0">
                  <img
                    src={
                      confirmingPurchase.game.iconUrl ||
                      confirmingPurchase.game.coverUrl ||
                      confirmingPurchase.game.bannerUrl
                    }
                    alt={confirmingPurchase.game.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0d9488] block">
                    Konfirmasi Pembelian
                  </span>
                  <h3 className="heading-font text-base sm:text-lg font-extrabold text-[#0f2c38] text-3d-subtle line-clamp-1">
                    {confirmingPurchase.game.title}
                  </h3>
                  <p className="text-[11px] text-[#4a6f7d] font-mono">
                    {confirmingPurchase.game.version} • {confirmingPurchase.game.fileSize}
                  </p>
                </div>
              </div>

              {/* Duration & Price Summary Box */}
              <div className="p-4 rounded-2xl bg-white/80 border border-white/90 space-y-2.5 text-xs shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#4a6f7d] font-medium">Paket Durasi:</span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#d7f5eb] text-[#0f766e] border border-[#99e8cc] font-extrabold">
                    {confirmingPurchase.plan.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#0f2c38]/10">
                  <span className="text-[#4a6f7d] font-medium">Total Harga:</span>
                  <span className="text-lg font-extrabold font-mono text-[#0f766e]">
                    {formatRupiah(confirmingPurchase.plan.price)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#dff1ff]/80 border border-[#bae6fd] text-[#0369a1] text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#0284c7]" />
                <span>
                  Setelah Anda menekan tombol <strong className="text-[#0f2c38]">Konfirmasi</strong>, halaman akan otomatis menuju link pembayaran yang sudah mencakup link download game.
                </span>
              </div>

              {redirectTriggered && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>Tautan pembayaran telah dibuka. Jika tab baru tidak terbuka otomatis, klik tombol buka langsung di bawah.</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingPurchase(null)}
                  className="min-h-[46px] px-5 py-3 rounded-2xl liquid-glass-button-secondary text-xs font-bold text-[#355968] hover:text-[#0f2c38] cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRedirect}
                  className="flex-1 min-h-[46px] px-5 py-3 rounded-2xl liquid-glass-button text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Konfirmasi &amp; Bayar Sekarang</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {redirectTriggered && (
                <a
                  href={confirmingPurchase.plan.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[42px] px-4 py-2.5 rounded-2xl bg-white/85 border border-white text-[#0284c7] font-bold text-xs flex items-center justify-center gap-2 hover:bg-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Link Pembayaran Secara Langsung</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

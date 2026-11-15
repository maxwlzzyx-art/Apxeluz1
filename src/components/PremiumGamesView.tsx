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
import { subscribeToPremiumGames } from '../lib/supabaseService';
import {
  PREMIUM_CACHE_KEY,
  filterPublicPremiumGames,
  mergePremiumGameLists,
} from '../utils/premiumPersistence';

interface PremiumGamesViewProps {
  onNavigateHome: () => void;
}

export const PremiumGamesView: React.FC<PremiumGamesViewProps> = ({ onNavigateHome }) => {
  const [games, setGames] = useState<PremiumGame[]>(() => {
    try {
      const raw = localStorage.getItem(PREMIUM_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return filterPublicPremiumGames(parsed);
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
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

  const readCachedGames = (): PremiumGame[] => {
    try {
      const raw = localStorage.getItem(PREMIUM_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const fetchGames = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson<PremiumGame[]>('/api/v1/premium-games');
      const apiGames = res.ok && Array.isArray(res.data) ? res.data : [];
      const cached = readCachedGames();
      const merged = filterPublicPremiumGames(mergePremiumGameLists(apiGames, cached));
      setGames(merged);
    } catch (err) {
      console.warn('Failed loading premium games:', err);
      const cached = readCachedGames();
      if (cached.length > 0) {
        setGames(filterPublicPremiumGames(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();

    const unsubscribe = subscribeToPremiumGames((supaGames) => {
      const cached = readCachedGames();
      setGames((prev) =>
        filterPublicPremiumGames(
          mergePremiumGameLists(supaGames, mergePremiumGameLists(prev, cached))
        )
      );
      setLoading(false);
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === PREMIUM_CACHE_KEY) {
        fetchGames();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
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
      {/* Hero Banner with Solid 3D Frosted Glass */}
      <section className="relative overflow-hidden rounded-[28px] sm:rounded-3xl p-5 sm:p-10 liquid-glass border-t-4 border-t-[#0D9488]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF3C7] border border-[#D97706]/35 text-[#7C4A03] text-[11px] font-bold uppercase tracking-wider shadow-sm">
              <Crown className="w-3.5 h-3.5 text-[#D97706]" />
              <span>APXELUZ PREMIUM REPOSITORY</span>
            </div>
            <h1 className="heading-font text-2xl sm:text-4xl font-extrabold text-[#10242E] text-3d tracking-tight leading-tight">
              Eksklusif Game &amp; Mod{' '}
              <span className="text-[#0D9488]">Koleksi Premium</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#4A6270] leading-relaxed">
              Pilih durasi akses fleksibel (<strong className="text-[#10242E]">30 Hari</strong> atau{' '}
              <strong className="text-[#10242E]">Lifetime</strong>). Link pembayaran resmi dari admin sudah mencakup tautan unduhan file lengkap secara langsung.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-2xl liquid-glass-button-secondary text-[#10242E] font-bold text-xs cursor-pointer"
            >
              <span>Jelajahi Game Gratis</span>
              <ChevronRight className="w-4 h-4 text-[#1D6FA5]" />
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-[#D3DDE3] text-xs text-[#4A6270] font-medium">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0D9488] flex-shrink-0" />
            <span>Garansi 100% Bersih &amp; Terkurasi</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#1D6FA5] flex-shrink-0" />
            <span>Pilihan Durasi 30 Hari &amp; Lifetime</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link2 className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <span>Link Bayar Sudah Include Download</span>
          </div>
        </div>
      </section>

      {/* Search and Count Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#D6F2EE] border border-[#D3DDE3] flex items-center justify-center text-[#0D9488]">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <h2 className="heading-font text-base sm:text-lg font-extrabold text-[#10242E] text-3d-subtle uppercase tracking-tight flex items-center gap-2">
            <span>DAFTAR GAME PREMIUM</span>
            <span className="text-xs font-mono text-[#1D6FA5]">({filteredGames.length})</span>
          </h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[#4A6270] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari game premium..."
            className="w-full min-h-[44px] bg-white/90 text-[#10242E] placeholder-[#4A6270] text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-[#D3DDE3] shadow-[inset_0_2px_4px_rgba(16,36,46,0.05)] focus:outline-none focus:border-[#0D9488]"
          />
        </div>
      </div>

      {/* Grid of Premium Games */}
      {loading ? (
        <div className="py-16 text-center space-y-3 liquid-glass rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0D9488]" />
          <p className="text-xs font-semibold text-[#4A6270]">Memuat katalog game premium...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-14 liquid-glass rounded-3xl space-y-3 px-4">
          <ShoppingBag className="w-10 h-10 mx-auto text-[#4A6270]" />
          <h3 className="heading-font text-base font-bold text-[#10242E]">
            Tidak ada game premium yang sesuai
          </h3>
          <p className="text-xs text-[#4A6270] max-w-sm mx-auto">
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
                <div className="relative aspect-square w-full overflow-hidden bg-[#E3F2F0] border-b border-[#D3DDE3]">
                  {(game.iconUrl || game.coverUrl || game.bannerUrl) ? (
                    <img
                      src={game.iconUrl || game.coverUrl || game.bannerUrl}
                      alt={game.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#0D9488]">
                      <Crown className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-[#0D9488]/25 pointer-events-none" />

                  {/* Badge Top Left */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FEF3C7] border border-[#D97706]/35 text-[#7C4A03] text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                    <Crown className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>PREMIUM</span>
                  </div>

                  {/* Version Badge Top Right */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-white/95 border border-[#D3DDE3] text-[#10242E] font-mono font-bold text-[10px] shadow-sm">
                    {game.version}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#0D9488] uppercase tracking-wider truncate">
                        {game.developer}
                      </span>
                      <span className="text-[10px] text-[#4A6270] font-mono flex-shrink-0">
                        {game.fileSize}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <h3 className="heading-font text-base sm:text-lg font-extrabold text-[#10242E] text-3d-subtle line-clamp-1 group-hover:text-[#0D9488] transition-colors">
                        {game.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSelectedGame(game)}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl liquid-glass-button-secondary text-[#4A6270] hover:text-[#10242E] cursor-pointer flex-shrink-0"
                        title="Lihat Detail Produk"
                        aria-label={`Lihat detail ${game.title}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-[#4A6270] line-clamp-2 leading-relaxed">
                      {game.shortDescription || game.description}
                    </p>

                    {/* Feature Tags */}
                    {game.features && game.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {game.features.slice(0, 3).map((feat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-[#E6ECEF] text-[10px] font-medium text-[#10242E] border border-[#D3DDE3]"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Duration Plans & Direct Selection */}
                  <div className="pt-3 border-t border-[#D3DDE3] space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#4A6270]">Pilih Paket Durasi:</span>
                      <span className="font-mono font-bold text-[#0F766E]">
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
                          <span className="text-xs font-mono font-bold text-[#D6F2EE] mt-0.5">
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#10242E]/30 backdrop-blur-md"
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
              <div className="w-10 h-1 rounded-full bg-[#10242E]/20" />
            </div>

            <button
              type="button"
              onClick={() => setSelectedGame(null)}
              aria-label="Tutup detail game premium"
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#4A6270] hover:text-[#10242E] cursor-pointer z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-5 sm:p-8 space-y-5 custom-scrollbar">
              {/* Top 1:1 Icon + Title */}
              <div className="flex items-center gap-4 pr-10">
                <div className="w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-2xl overflow-hidden bg-[#E3F2F0] border border-[#D3DDE3] shadow-md flex-shrink-0">
                  {(selectedGame.iconUrl || selectedGame.coverUrl || selectedGame.bannerUrl) ? (
                    <img
                      src={selectedGame.iconUrl || selectedGame.coverUrl || selectedGame.bannerUrl}
                      alt={selectedGame.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#0D9488]">
                      <Crown className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#7C4A03] border border-[#D97706]/35 text-[10px] font-extrabold uppercase">
                    <Crown className="w-3 h-3 text-[#D97706]" />
                    <span>{selectedGame.category || 'Games'}</span>
                  </span>
                  <h2 className="heading-font text-xl sm:text-2xl font-extrabold text-[#10242E] text-3d-subtle leading-tight">
                    {selectedGame.title}
                  </h2>
                  <p className="text-xs text-[#4A6270] font-medium">
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
              <div className="space-y-1.5 text-xs text-[#4A6270] leading-relaxed">
                <h3 className="text-xs font-bold text-[#10242E] uppercase tracking-wider">Deskripsi</h3>
                <p>{selectedGame.description || selectedGame.shortDescription}</p>
              </div>

              {/* Plans Selector inside Detail Modal */}
              <div className="pt-4 border-t border-[#D3DDE3] space-y-3">
                <h3 className="text-xs font-bold text-[#10242E] uppercase tracking-wider">
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
                      <span className="font-mono text-sm font-extrabold text-[#D6F2EE]">
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#10242E]/30 backdrop-blur-md"
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
              <div className="w-10 h-1 rounded-full bg-[#10242E]/20" />
            </div>

            <button
              type="button"
              onClick={() => setConfirmingPurchase(null)}
              aria-label="Tutup konfirmasi pembelian"
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#4A6270] hover:text-[#10242E] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-5 sm:p-7 space-y-5">
              <div className="flex items-center gap-3.5 pr-8">
                <div className="w-14 h-14 aspect-square rounded-2xl overflow-hidden bg-white border border-[#D3DDE3] shadow-md flex-shrink-0">
                  {(confirmingPurchase.game.iconUrl ||
                    confirmingPurchase.game.coverUrl ||
                    confirmingPurchase.game.bannerUrl) ? (
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
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#0D9488] bg-[#E3F2F0]">
                      <Crown className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0D9488] block">
                    Konfirmasi Pembelian
                  </span>
                  <h3 className="heading-font text-base sm:text-lg font-extrabold text-[#10242E] text-3d-subtle line-clamp-1">
                    {confirmingPurchase.game.title}
                  </h3>
                  <p className="text-[11px] text-[#4A6270] font-mono">
                    {confirmingPurchase.game.version} • {confirmingPurchase.game.fileSize}
                  </p>
                </div>
              </div>

              {/* Duration & Price Summary Box */}
              <div className="p-4 rounded-2xl bg-white border border-[#D3DDE3] space-y-2.5 text-xs shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#4A6270] font-medium">Paket Durasi:</span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#D6F2EE] text-[#0F766E] border border-[#0D9488]/30 font-extrabold">
                    {confirmingPurchase.plan.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#D3DDE3]">
                  <span className="text-[#4A6270] font-medium">Total Harga:</span>
                  <span className="text-lg font-extrabold font-mono text-[#0F766E]">
                    {formatRupiah(confirmingPurchase.plan.price)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#E4EFF8] border border-[#1D6FA5]/25 text-[#165985] text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#1D6FA5]" />
                <span>
                  Setelah Anda menekan tombol <strong className="text-[#10242E]">Konfirmasi</strong>, halaman akan otomatis menuju link pembayaran yang sudah mencakup link download game.
                </span>
              </div>

              {redirectTriggered && (
                <div className="p-3 rounded-2xl bg-[#DCFCE7] border border-[#0D9488]/30 text-[#0F766E] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#0D9488]" />
                  <span>Tautan pembayaran telah dibuka. Jika tab baru tidak terbuka otomatis, klik tombol buka langsung di bawah.</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingPurchase(null)}
                  className="min-h-[46px] px-5 py-3 rounded-2xl liquid-glass-button-secondary text-xs font-bold text-[#4A6270] hover:text-[#10242E] cursor-pointer"
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
                  className="w-full min-h-[42px] px-4 py-2.5 rounded-2xl bg-white border border-[#D3DDE3] text-[#1D6FA5] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#DBEAF6] transition-colors"
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

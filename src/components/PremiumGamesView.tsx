import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  ExternalLink,
  Clock,
  ShieldCheck,
  ChevronRight,
  Search,
  X,
  Link2,
  Check,
  Copy,
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
import { useSwipeToClose } from '../utils/useSwipeToClose';
import { subscribeToPremiumGames } from '../lib/supabaseService';
import { GameSkeletonGrid } from './GameCardSkeleton';
import { getSkeletonCountForLayout } from '../utils/loadingState';
import {
  PREMIUM_CACHE_KEY,
  filterPublicPremiumGames,
  mergePremiumGameLists,
} from '../utils/premiumPersistence';

interface PremiumGamesViewProps {
  onNavigateHome: () => void;
  initialSlug?: string;
  onSyncSlug?: (slug?: string) => void;
}

export const PremiumGamesView: React.FC<PremiumGamesViewProps> = ({
  onNavigateHome,
  initialSlug,
  onSyncSlug,
}) => {
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
  const [copiedGameId, setCopiedGameId] = useState<string | null>(null);

  // Selected game for detail modal
  const [selectedGame, setSelectedGame] = useState<PremiumGame | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const handledInitialSlugRef = useRef<string | undefined>(undefined);

  // Selected plan pending user confirmation
  const [confirmingPurchase, setConfirmingPurchase] = useState<{
    game: PremiumGame;
    plan: PremiumPaymentPlan;
  } | null>(null);
  const [redirectTriggered, setRedirectTriggered] = useState(false);

  const openGameDetail = (game: PremiumGame) => {
    setSelectedGame(game);
    onSyncSlug?.(game.slug || game.id);
  };

  const closeGameDetail = () => {
    setSelectedGame(null);
    onSyncSlug?.(undefined);
  };

  const detailSwipe = useSwipeToClose(closeGameDetail, Boolean(selectedGame));
  const confirmSwipe = useSwipeToClose(() => setConfirmingPurchase(null), Boolean(confirmingPurchase));

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

  // Auto-open deep-linked premium game when visiting /premium/:slug
  useEffect(() => {
    if (!initialSlug) {
      handledInitialSlugRef.current = undefined;
      return;
    }
    if (handledInitialSlugRef.current === initialSlug || games.length === 0) return;

    const normalizedTarget = initialSlug.toLowerCase();
    const matched = games.find(
      (g) =>
        g.slug?.toLowerCase() === normalizedTarget ||
        g.id.toLowerCase() === normalizedTarget
    );
    if (matched) {
      handledInitialSlugRef.current = initialSlug;
      setSelectedGame(matched);
    }
  }, [initialSlug, games]);

  const copyPremiumLink = async (game: PremiumGame) => {
    const shareUrl = `${window.location.origin}/premium/${game.slug || game.id}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.setAttribute('readonly', '');
        textArea.className = 'fixed -left-[9999px] top-0 opacity-0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch {
      // Clipboard blocked in non-interactive iframe; still show feedback for visual state
    }
    setCopiedGameId(game.id);
    setTimeout(() => {
      setCopiedGameId((prev) => (prev === game.id ? null : prev));
    }, 2000);
  };

  const getPlansForGame = (game: PremiumGame): PremiumPaymentPlan[] => {
    return normalizePaymentPlans(game.paymentPlans, game.price, game.downloadUrl);
  };

  const handleChoosePlan = (game: PremiumGame, plan: PremiumPaymentPlan) => {
    closeGameDetail();
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
      {/* Hero Banner with Solid 3D Frosted Glass (Compact on Mobile so Catalog Cards Show Above Fold) */}
      <section className="relative overflow-hidden rounded-3xl p-4 sm:p-10 liquid-glass border-t-4 border-t-[#0D9488]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#D97706]/35 text-[#7C4A03] text-[10.5px] font-bold uppercase tracking-wider shadow-sm">
              <Crown className="w-3.5 h-3.5 text-[#D97706]" />
              <span>APXELUZ PREMIUM</span>
            </div>
            <h1 className="heading-font text-xl sm:text-4xl font-extrabold text-[#10242E] text-3d tracking-tight leading-tight text-balance">
              Eksklusif Game &amp; Mod{' '}
              <span className="text-[#0D9488]">Koleksi Premium</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#4A6270] leading-relaxed">
              Pilih durasi fleksibel (<strong className="text-[#10242E]">30 Hari</strong> atau{' '}
              <strong className="text-[#10242E]">Lifetime</strong>). Link pembayaran resmi sudah termasuk tautan download langsung.
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <button
              onClick={onNavigateHome}
              className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 min-h-[42px] sm:min-h-[46px] rounded-2xl liquid-glass-button-secondary text-[#10242E] font-bold text-xs cursor-pointer"
            >
              <span>Jelajahi Game Gratis</span>
              <ChevronRight className="w-4 h-4 text-[#1D6FA5]" />
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-4 mt-4 border-t border-[#D3DDE3] text-[11px] sm:text-xs text-[#4A6270] font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0D9488] flex-shrink-0" />
            <span>Garansi 100% Bersih &amp; Terkurasi</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1D6FA5] flex-shrink-0" />
            <span>Pilihan Durasi 30 Hari &amp; Lifetime</span>
          </div>
          <div className="flex items-center gap-2">
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
            className="w-full min-h-[44px] liquid-glass-input text-[#10242E] placeholder-[#4A6270] text-xs pl-10 pr-3.5 py-2.5 rounded-2xl focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Premium Games (Matched to Free GameCard Layout) */}
      {loading && games.length === 0 ? (
        <GameSkeletonGrid
          count={getSkeletonCountForLayout('premium')}
          variant="premium"
          label="Memuat katalog game premium"
        />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredGames.map((game) => {
            const plans = getPlansForGame(game);
            const startingPrice = getStartingPrice(game);
            const isCopied = copiedGameId === game.id;

            return (
              <div
                key={game.id}
                onClick={() => openGameDetail(game)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openGameDetail(game);
                  }
                }}
                aria-label={`Lihat detail ${game.title} versi ${game.version}`}
                className="group relative flex flex-col cursor-pointer rounded-3xl liquid-glass-card perf-card overflow-hidden text-left"
              >
                {/* Cover Image Container (1:1 Aspect with Realistic Inset Glass Bezel) */}
                <div className="relative aspect-square w-full overflow-hidden bg-[#E6ECEF] ring-1 ring-inset ring-black/5">
                  {(game.iconUrl || game.coverUrl || game.bannerUrl) ? (
                    <img
                      src={game.iconUrl || game.coverUrl || game.bannerUrl}
                      alt={game.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#E3F2F0]">
                      <Crown className="w-8 h-8 text-[#0D9488] mb-2" />
                      <span className="text-xs font-bold text-[#10242E] line-clamp-2">{game.title}</span>
                    </div>
                  )}

                  {/* Top Specular Edge Gleam + Bottom Shelf Rim */}
                  <div className="absolute inset-x-0 top-0 h-px bg-white/60 pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-[#10242E]/10 pointer-events-none" />

                  {/* Single Top Corner Badges matching GameCard */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[9.5px] sm:text-[10px] font-bold tracking-wide bg-[#FEF3C7]/90 backdrop-blur-md text-[#7C4A03] border border-white/90 shadow-sm">
                      <Crown className="w-3 h-3 text-[#D97706]" />
                      <span>PREMIUM</span>
                    </span>

                    <span className="px-2 py-0.5 rounded-xl text-[9.5px] sm:text-[10px] font-bold tabular-nums bg-white/78 backdrop-blur-md text-[#10242E] border border-white/95 shadow-sm truncate max-w-[82px]">
                      {game.version}
                    </span>
                  </div>

                  {/* Tactile Floating Copy-Link Keycap Button matching Bookmark position */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyPremiumLink(game);
                    }}
                    className={`absolute bottom-2.5 right-2.5 min-w-[40px] min-h-[40px] p-2 rounded-2xl flex items-center justify-center cursor-pointer tactile-press z-10 ${
                      isCopied
                        ? 'liquid-glass-button text-white'
                        : 'bg-white/78 backdrop-blur-md text-[#10242E] hover:text-[#0D9488] border border-white/95 shadow-[0_8px_16px_-4px_rgba(16,36,46,0.2),inset_0_1.5px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(211,221,227,0.7)]'
                    }`}
                    title={isCopied ? 'Link tersalin!' : 'Salin link game premium'}
                    aria-label={
                      isCopied
                        ? `Link ${game.title} tersalin`
                        : `Salin link ${game.title}`
                    }
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Clean Info Area matching GameCard */}
                <div className="p-3 sm:p-3.5 flex flex-col flex-grow justify-between gap-2">
                  <div>
                    <h3
                      className="text-[13px] sm:text-sm font-bold text-[#10242E] text-3d-subtle group-hover:text-[#0D9488] transition-colors truncate leading-snug"
                      title={game.title}
                    >
                      {game.title}
                    </h3>

                    <p className="text-[11px] text-[#4A6270] mt-0.5 sm:mt-1 truncate font-medium tabular-nums">
                      {game.version} · {game.category} · {game.fileSize}
                    </p>

                    {(game.shortDescription || game.description) && (
                      <p className="text-[11px] text-[#4A6270] mt-1.5 whitespace-pre-line line-clamp-2 leading-relaxed">
                        {game.shortDescription || game.description}
                      </p>
                    )}
                  </div>

                  {/* Compact Bottom Meta & Plans Row */}
                  <div className="pt-2 border-t border-[#10242E]/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] tabular-nums">
                      <span className="font-semibold text-[#4A6270]">Mulai</span>
                      <span className="font-mono font-extrabold text-[#0F766E]">
                        {formatRupiah(startingPrice)}
                      </span>
                    </div>

                    <div
                      className={`grid gap-1.5 ${
                        plans.some((p) => p.label.trim().length > 11)
                          ? 'grid-cols-1'
                          : 'grid-cols-1 sm:grid-cols-2'
                      }`}
                    >
                      {plans.map((plan) => {
                        const isWideRow = plans.some((p) => p.label.trim().length > 11);
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChoosePlan(game, plan);
                            }}
                            className={`min-h-[38px] px-2.5 py-1.5 rounded-xl liquid-glass-button text-white text-left flex cursor-pointer ${
                              isWideRow
                                ? 'items-center justify-between gap-2'
                                : 'items-center justify-between sm:flex-col sm:items-start sm:justify-center'
                            }`}
                          >
                            <span className="text-[10px] font-extrabold leading-tight truncate">
                              {plan.label}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-[#D6F2EE] tabular-nums flex-shrink-0">
                              {formatRupiah(plan.price)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL (Scroll-Locked & Swipe-Down-to-Close Sheet) */}
      {selectedGame && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-[#10242E]/30 backdrop-blur-md backdrop-entrance"
          onClick={closeGameDetail}
          role="dialog"
          aria-modal="true"
          aria-label={`Detail ${selectedGame.title}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-xl max-h-[72dvh] sm:max-h-[76dvh] flex flex-col rounded-3xl liquid-glass shadow-2xl overflow-hidden sheet-entrance ${detailSwipe.sheetMotionClass}`}
          >
            {/* Top Grab Strip (-) & Action Header */}
            <div
              {...detailSwipe.dragHandlers}
              className="flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing border-b liquid-glass-navbar"
              title="Geser ke bawah untuk menutup"
            >
              <div className="w-full pt-2.5 pb-1 flex justify-center">
                <div className={detailSwipe.handleBarClass} />
              </div>

              <div className="px-4 sm:px-6 pb-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A6270] truncate">
                  Detail Game Premium
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyPremiumLink(selectedGame)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer tactile-press ${
                      copiedGameId === selectedGame.id
                        ? 'liquid-glass-button text-white'
                        : 'liquid-glass-button-secondary text-[#10242E]'
                    }`}
                    aria-label={`Salin link ${selectedGame.title}`}
                  >
                    {copiedGameId === selectedGame.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={closeGameDetail}
                    aria-label="Tutup detail game premium"
                    className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#4A6270] hover:text-[#10242E] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y custom-scrollbar">
              {/* 16:9 Cover/Banner Image */}
              {(selectedGame.bannerUrl || selectedGame.coverUrl || selectedGame.iconUrl) && (
                <div className="relative aspect-video w-full bg-[#E3F2F0] border-b border-[#D3DDE3] overflow-hidden">
                  <img
                    src={selectedGame.bannerUrl || selectedGame.coverUrl || selectedGame.iconUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#10242E]/10 pointer-events-none" />
                </div>
              )}

              <div className="p-4 sm:p-6 space-y-4">
                {/* Top 1:1 Icon + Title */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-16 h-16 sm:w-20 aspect-square rounded-2xl overflow-hidden bg-[#E3F2F0] border-2 border-white shadow-[0_12px_26px_-8px_rgba(16,36,46,0.22)] ring-1 ring-black/5 flex-shrink-0 ${
                      selectedGame.bannerUrl || selectedGame.coverUrl || selectedGame.iconUrl
                        ? '-mt-11 sm:-mt-14 relative z-20'
                        : ''
                    }`}
                  >
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

                {/* Screenshots (16:9 Tap to Zoom) */}
                {selectedGame.screenshots && selectedGame.screenshots.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#10242E] uppercase tracking-wider">
                      Tangkapan Layar
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {selectedGame.screenshots.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedScreenshot(s)}
                          className="rounded-xl overflow-hidden border border-[#D3DDE3] aspect-video w-full shadow-sm cursor-pointer tactile-press"
                          aria-label={`Perbesar screenshot ${idx + 1}`}
                        >
                          <img
                            src={s}
                            alt={`Screenshot ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Multi-line Description */}
              <div className="space-y-2 text-xs text-[#4A6270] leading-relaxed">
                <h3 className="text-xs font-bold text-[#10242E] uppercase tracking-wider">Deskripsi</h3>
                {selectedGame.shortDescription &&
                  selectedGame.description &&
                  selectedGame.shortDescription.trim() !== selectedGame.description.trim() && (
                    <p className="font-semibold text-[#10242E] whitespace-pre-line">
                      {selectedGame.shortDescription}
                    </p>
                  )}
                <p className="whitespace-pre-line">
                  {selectedGame.description || selectedGame.shortDescription}
                </p>
              </div>

              {/* Features List */}
              {selectedGame.features && selectedGame.features.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#10242E] uppercase tracking-wider">
                    Fitur Unggulan
                  </h3>
                  <ul className="space-y-1.5 text-xs text-[#4A6270]">
                    {selectedGame.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
        </div>
      )}

      {/* CONFIRMATION MODAL (Duration + Price + Confirm Redirect to Admin Link) */}
      {confirmingPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-[#10242E]/30 backdrop-blur-md backdrop-entrance"
          onClick={() => setConfirmingPurchase(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi Paket Game Premium"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md max-h-[72dvh] sm:max-h-[76dvh] flex flex-col rounded-3xl liquid-glass shadow-2xl overflow-hidden sheet-entrance ${confirmSwipe.sheetMotionClass}`}
          >
            <div
              {...confirmSwipe.dragHandlers}
              className="flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing relative pt-2.5 pb-1 flex justify-center"
              title="Geser ke bawah untuk menutup"
            >
              <div className={confirmSwipe.handleBarClass} />
              <button
                type="button"
                onClick={() => setConfirmingPurchase(null)}
                aria-label="Tutup konfirmasi pembelian"
                className="absolute top-3 right-3 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#4A6270] hover:text-[#10242E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-5 sm:p-7 pt-2 space-y-5">
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

      {/* Lightbox Screenshot Zoom Overlay */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-[60] bg-[#10242E]/85 backdrop-blur-md flex items-center justify-center p-4 backdrop-entrance"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedScreenshot}
              alt="Pratinjau tangkapan layar"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain border-2 border-white/90 shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedScreenshot(null)}
              aria-label="Tutup pratinjau screenshot"
              className="absolute -top-12 right-0 min-w-[44px] min-h-[44px] rounded-full bg-white text-[#10242E] flex items-center justify-center shadow-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

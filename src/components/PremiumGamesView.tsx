import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Loader2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Search,
  X,
  CreditCard,
  QrCode,
  ArrowRight,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { PremiumGame, Order } from '../types/premium';
import { safeFetchJson } from '../utils/apiClient';

interface PremiumGamesViewProps {
  onNavigateHome: () => void;
}

export const PremiumGamesView: React.FC<PremiumGamesViewProps> = ({ onNavigateHome }) => {
  const [games, setGames] = useState<PremiumGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected game for detail modal
  const [selectedGame, setSelectedGame] = useState<PremiumGame | null>(null);

  // Checkout modal state
  const [checkoutGame, setCheckoutGame] = useState<PremiumGame | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Active transaction / Payment state
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isPollingStatus, setIsPollingStatus] = useState(false);

  // Download access state
  const [downloadInfo, setDownloadInfo] = useState<{
    downloadUrl: string;
    gameTitle: string;
    version: string;
    fileSize: string;
  } | null>(null);
  const [verifyingDownload, setVerifyingDownload] = useState(false);

  // Existing order lookup modal
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Fetch games from backend API
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

    // Check if URL has order_id query parameter from payment redirect
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdParam = urlParams.get('order_id');
    if (orderIdParam) {
      checkOrderStatus(orderIdParam);
    }
  }, []);

  // Poll order status
  const checkOrderStatus = async (orderId: string) => {
    try {
      setIsPollingStatus(true);
      const res = await safeFetchJson<Order>(`/api/v1/transactions/${orderId}`);
      if (res.ok && res.data) {
        setActiveOrder(res.data);

        // If PAID and has download token, verify download access right away
        if (res.data.status === 'PAID') {
          fetchDownloadAccess(res.data.downloadToken, res.data.id, res.data.customerEmail);
        }
      }
    } catch (err) {
      console.error('Failed checking order status:', err);
    } finally {
      setIsPollingStatus(false);
    }
  };

  // Fetch verified download URL
  const fetchDownloadAccess = async (token?: string, orderId?: string, email?: string) => {
    try {
      setVerifyingDownload(true);
      const res = await safeFetchJson<{
        downloadUrl: string;
        gameTitle: string;
        version: string;
        fileSize: string;
      }>('/api/v1/download/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, orderId, email }),
      });

      if (res.ok && res.data) {
        setDownloadInfo(res.data);
      }
    } catch (err) {
      console.error('Failed fetching download access:', err);
    } finally {
      setVerifyingDownload(false);
    }
  };

  // Create checkout
  const handleStartCheckout = (game: PremiumGame) => {
    setSelectedGame(null);
    setCheckoutGame(game);
    setCheckoutError(null);
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutGame || !customerName.trim() || !customerEmail.trim()) return;

    try {
      setIsSubmittingOrder(true);
      setCheckoutError(null);

      const res = await safeFetchJson<any>('/api/v1/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: checkoutGame.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
        }),
      });

      if (res.ok && res.data && res.data.success) {
        const orderData: Order = {
          id: res.data.orderId,
          gameId: checkoutGame.id,
          gameTitle: checkoutGame.title,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          amount: res.data.amount,
          status: 'PENDING',
          qiospayInvoiceId: res.data.invoiceId,
          qiospayPaymentUrl: res.data.paymentUrl,
          qiospayQrString: res.data.qrString,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setActiveOrder(orderData);
        setCheckoutGame(null);
      } else {
        setCheckoutError(res.error || res.data?.error || 'Gagal membuat tagihan pembayaran QiosPay.');
      }
    } catch (err: any) {
      setCheckoutError(err?.message || 'Terjadi kesalahan sistem saat menghubungi server pembayaran.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Lookup existing order
  const handleLookupOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupOrderId.trim() || !lookupEmail.trim()) return;

    try {
      setLookupLoading(true);
      setLookupError(null);

      const res = await safeFetchJson<any>('/api/v1/download/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: lookupOrderId.trim(),
          email: lookupEmail.trim().toLowerCase(),
        }),
      });

      if (res.ok && res.data && res.data.success) {
        setDownloadInfo(res.data);
        setIsLookupOpen(false);
      } else {
        setLookupError(res.error || res.data?.error || 'Pesanan tidak ditemukan atau belum lunas.');
      }
    } catch (err: any) {
      setLookupError(err?.message || 'Gagal mencari transaksi.');
    } finally {
      setLookupLoading(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
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
              Eksklusif Game & Mod{' '}
              <span className="text-[#0f766e]">
                Koleksi Premium
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#355968] leading-relaxed">
              Dapatkan game Android remaster, visual pack HD 60FPS+, dan port eksklusif berkualitas tinggi. Pembayaran otomatis & instan melalui{' '}
              <strong className="text-[#0f2c38]">QiosPay</strong> dengan QRIS, Virtual Account, dan E-Wallet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsLookupOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[46px] rounded-2xl liquid-glass-button-secondary text-[#0f2c38] font-bold text-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#0284c7]" />
              <span>Cek Status Pesanan Saya</span>
            </button>
            <button
              onClick={onNavigateHome}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[46px] rounded-2xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] font-semibold text-xs cursor-pointer"
            >
              <span>Jelajahi Game Gratis</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-[#0f2c38]/10 text-xs text-[#355968] font-medium">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0d9488] flex-shrink-0" />
            <span>Garansi 100% Bersih & Bebas Virus</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-[#0284c7] flex-shrink-0" />
            <span>Integrasi Pembayaran QiosPay Resmi</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Akses Unduhan Cepat Langsung Aktif</span>
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
          <h3 className="heading-font text-base font-bold text-[#0f2c38]">Tidak ada game premium yang sesuai</h3>
          <p className="text-xs text-[#4a6f7d] max-w-sm mx-auto">
            Coba ubah kata kunci pencarian Anda atau periksa kembali nanti.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="group rounded-[26px] liquid-glass-card overflow-hidden flex flex-col"
            >
              {/* Cover Banner */}
              <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff]">
                <img
                  src={game.coverUrl || game.bannerUrl}
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

                {/* Floating Icon */}
                <div className="absolute -bottom-4 left-5 w-14 h-14 rounded-2xl p-1 bg-white/85 border border-white shadow-lg overflow-hidden backdrop-blur-xl">
                  <img
                    src={game.iconUrl || game.coverUrl}
                    alt={game.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </div>

              {/* Card Body */}
              <div className="pt-6 px-5 pb-5 flex-grow flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#0d9488] uppercase tracking-wider truncate">
                      {game.developer}
                    </span>
                    <span className="text-[10px] text-[#4a6f7d] font-mono flex-shrink-0">
                      {game.fileSize}
                    </span>
                  </div>

                  <h3 className="heading-font text-base sm:text-lg font-extrabold text-[#0f2c38] text-3d-subtle line-clamp-1 group-hover:text-[#0d9488] transition-colors">
                    {game.title}
                  </h3>

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

                {/* Pricing & CTA */}
                <div className="pt-3 border-t border-[#0f2c38]/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    {game.originalPrice && game.originalPrice > game.price && (
                      <span className="text-[11px] line-through text-[#5a7d8a] font-mono block">
                        {formatRupiah(game.originalPrice)}
                      </span>
                    )}
                    <span className="text-base sm:text-lg font-extrabold font-mono text-[#0f766e]">
                      {formatRupiah(game.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedGame(game)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl liquid-glass-button-secondary text-[#355968] hover:text-[#0f2c38] cursor-pointer"
                      title="Lihat Detail Produk"
                      aria-label={`Lihat detail ${game.title}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartCheckout(game)}
                      className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-xs cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Beli</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL (Mobile Bottom Sheet) */}
      {selectedGame && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setSelectedGame(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-[28px] sm:rounded-3xl liquid-glass p-5 sm:p-8 space-y-5 shadow-2xl custom-scrollbar"
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden flex justify-center pb-1">
              <div className="w-10 h-1 rounded-full bg-[#0f2c38]/20" />
            </div>

            <button
              onClick={() => setSelectedGame(null)}
              aria-label="Tutup detail game premium"
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] cursor-pointer z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff] border border-white/80">
              <img
                src={selectedGame.bannerUrl || selectedGame.coverUrl}
                alt={selectedGame.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f2c38]/85 via-[#0f2c38]/25 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs text-emerald-200 font-semibold">{selectedGame.category}</span>
                  <h2 className="heading-font text-xl sm:text-2xl font-bold text-white line-clamp-2">
                    {selectedGame.title}
                  </h2>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-200 font-mono">
                    {formatRupiah(selectedGame.price)}
                  </span>
                </div>
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

            {/* CTA */}
            <div className="pt-4 border-t border-[#0f2c38]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#4a6f7d] font-medium">
                <span>Versi: {selectedGame.version}</span> • <span>Ukuran: {selectedGame.fileSize}</span>
              </div>
              <button
                onClick={() => handleStartCheckout(selectedGame)}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl liquid-glass-button text-white font-bold text-xs cursor-pointer"
              >
                Lanjutkan ke Pembayaran QiosPay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL (Buy Now Flow) */}
      {checkoutGame && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setCheckoutGame(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-[28px] sm:rounded-3xl liquid-glass p-5 sm:p-7 space-y-5 shadow-2xl"
          >
            <div className="sm:hidden flex justify-center">
              <div className="w-10 h-1 rounded-full bg-[#0f2c38]/20" />
            </div>

            <button
              onClick={() => setCheckoutGame(null)}
              aria-label="Tutup form pembelian"
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="w-12 h-12 rounded-2xl liquid-glass-subtle flex items-center justify-center text-[#0d9488] flex-shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="heading-font text-base sm:text-lg font-extrabold text-[#0f2c38] text-3d-subtle">
                  Pembelian Game Premium
                </h3>
                <p className="text-xs text-[#355968] truncate">{checkoutGame.title}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/75 border border-white/90 flex items-center justify-between shadow-sm">
              <span className="text-xs text-[#355968] font-medium">Total Tagihan (QiosPay):</span>
              <span className="text-base font-extrabold text-[#0f766e] font-mono">
                {formatRupiah(checkoutGame.price)}
              </span>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCheckout} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#0f2c38]">Nama Lengkap</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Pratama"
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] placeholder-[#648896] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#0f2c38]">
                  Alamat Email (Untuk Pengiriman Akses Download)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="budi@gmail.com"
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] placeholder-[#648896] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
                />
                <span className="text-[11px] text-[#4a6f7d] block">
                  Link dan token unduhan aman akan dikaitkan langsung ke email ini.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingOrder || !customerName.trim() || !customerEmail.trim()}
                  className="w-full min-h-[48px] py-3 rounded-2xl liquid-glass-button text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Menyiapkan Invoice QiosPay...</span>
                    </>
                  ) : (
                    <>
                      <span>Buat Tagihan Pembayaran</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE TRANSACTION & PAYMENT STATUS MODAL */}
      {activeOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setActiveOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-[28px] sm:rounded-3xl liquid-glass p-5 sm:p-7 space-y-5 shadow-2xl"
          >
            <div className="sm:hidden flex justify-center">
              <div className="w-10 h-1 rounded-full bg-[#0f2c38]/20" />
            </div>

            <button
              onClick={() => setActiveOrder(null)}
              aria-label="Tutup status transaksi"
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Status Header */}
            <div className="text-center space-y-2">
              <div
                className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border shadow-sm ${
                  activeOrder.status === 'PAID'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : activeOrder.status === 'EXPIRED' || activeOrder.status === 'CANCELLED'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                {activeOrder.status === 'PAID' ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : activeOrder.status === 'EXPIRED' || activeOrder.status === 'CANCELLED' ? (
                  <AlertCircle className="w-7 h-7" />
                ) : (
                  <Clock className="w-7 h-7" />
                )}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider inline-block border ${
                  activeOrder.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : activeOrder.status === 'EXPIRED' || activeOrder.status === 'CANCELLED'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                STATUS: {activeOrder.status}
              </span>

              <h3 className="heading-font text-lg font-extrabold text-[#0f2c38] text-3d-subtle">
                {activeOrder.status === 'PAID'
                  ? 'Pembayaran Berhasil Terverifikasi!'
                  : activeOrder.status === 'EXPIRED'
                  ? 'Tagihan Pembayaran Kedaluwarsa'
                  : 'Menunggu Pembayaran QiosPay'}
              </h3>
            </div>

            {/* Order Details */}
            <div className="p-4 rounded-2xl bg-white/75 border border-white/90 space-y-2 text-xs shadow-sm">
              <div className="flex justify-between gap-2 text-[#355968]">
                <span>ID Pesanan:</span>
                <span className="font-mono text-[#0f2c38] font-bold">{activeOrder.id}</span>
              </div>
              <div className="flex justify-between gap-2 text-[#355968]">
                <span>Produk:</span>
                <span className="text-[#0f2c38] font-semibold line-clamp-1">{activeOrder.gameTitle}</span>
              </div>
              <div className="flex justify-between gap-2 text-[#355968]">
                <span>Total:</span>
                <span className="font-mono text-[#0f766e] font-extrabold">{formatRupiah(activeOrder.amount)}</span>
              </div>
              {activeOrder.qiospayInvoiceId && (
                <div className="flex justify-between gap-2 text-[#355968]">
                  <span>QiosPay Invoice:</span>
                  <span className="font-mono text-[#4a6f7d]">{activeOrder.qiospayInvoiceId}</span>
                </div>
              )}
            </div>

            {/* Action based on status */}
            {activeOrder.status === 'PAID' ? (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                  <span>Akses unduhan aktif selama 48 jam ke depan.</span>
                </div>

                {downloadInfo ? (
                  <a
                    href={downloadInfo.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[48px] py-3 rounded-2xl liquid-glass-button text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Game Sekarang ({downloadInfo.fileSize})</span>
                  </a>
                ) : (
                  <button
                    onClick={() => fetchDownloadAccess(activeOrder.downloadToken, activeOrder.id, activeOrder.customerEmail)}
                    disabled={verifyingDownload}
                    className="w-full min-h-[48px] py-3 rounded-2xl liquid-glass-button text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {verifyingDownload ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Ambil Tautan Unduhan Aman</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {activeOrder.qiospayPaymentUrl && (
                  <a
                    href={activeOrder.qiospayPaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[48px] py-3 rounded-2xl liquid-glass-button text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Halaman Pembayaran QiosPay</span>
                  </a>
                )}

                <button
                  onClick={() => checkOrderStatus(activeOrder.id)}
                  disabled={isPollingStatus}
                  className="w-full min-h-[46px] py-3 rounded-2xl liquid-glass-button-secondary text-[#0f2c38] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#0284c7] ${isPollingStatus ? 'animate-spin' : ''}`} />
                  <span>Periksa Status Pembayaran</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOOKUP EXISTING ORDER MODAL */}
      {isLookupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/30 backdrop-blur-md"
          onClick={() => setIsLookupOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-[28px] sm:rounded-3xl liquid-glass p-5 sm:p-7 space-y-5 shadow-2xl"
          >
            <div className="sm:hidden flex justify-center">
              <div className="w-10 h-1 rounded-full bg-[#0f2c38]/20" />
            </div>

            <button
              onClick={() => setIsLookupOpen(false)}
              aria-label="Tutup pencarian pesanan"
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl liquid-glass-subtle text-[#355968] hover:text-[#0f2c38] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="w-12 h-12 rounded-2xl liquid-glass-subtle flex items-center justify-center text-[#0284c7] flex-shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="heading-font text-base sm:text-lg font-extrabold text-[#0f2c38] text-3d-subtle">
                  Cek Status Pesanan
                </h3>
                <p className="text-xs text-[#355968]">Masukkan Order ID dan email pembelian Anda</p>
              </div>
            </div>

            {lookupError && (
              <div className="p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{lookupError}</span>
              </div>
            )}

            <form onSubmit={handleLookupOrder} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#0f2c38]">Order ID</label>
                <input
                  type="text"
                  value={lookupOrderId}
                  onChange={(e) => setLookupOrderId(e.target.value)}
                  placeholder="ORD-1730000000-ABCD"
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] placeholder-[#648896] text-xs outline-none font-mono shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#0f2c38]">Alamat Email Pembelian</label>
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="budi@gmail.com"
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] placeholder-[#648896] text-xs outline-none shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={lookupLoading || !lookupOrderId.trim() || !lookupEmail.trim()}
                  className="w-full min-h-[48px] py-3 rounded-2xl liquid-glass-button text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {lookupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Mencari Transaksi...</span>
                    </>
                  ) : (
                    <span>Ambil Tautan Unduhan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

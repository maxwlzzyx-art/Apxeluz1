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
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner with Neo Brutalism & Apple Liquid Glass */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-10 border border-white/20 liquid-glass shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/20 via-[#BF5AF2]/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-gradient-to-tr from-[#0A84FF]/20 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>APXELUZ PREMIUM REPOSITORY</span>
            </div>
            <h1 className="heading-font text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Eksklusif Game & Mod <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-[#BF5AF2] bg-clip-text text-transparent">Koleksi Premium</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dapatkan game Android remaster, visual pack HD 60FPS+, dan port eksklusif berkualitas tinggi. Pembayaran otomatis & instan melalui <strong className="text-white">QiosPay</strong> dengan QRIS, Virtual Account, dan E-Wallet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setIsLookupOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl liquid-glass-subtle text-white font-semibold text-xs border border-white/20 hover:bg-white/15 transition-all cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4 text-[#0A84FF]" />
              <span>Cek Status Pesanan Saya</span>
            </button>
            <button
              onClick={onNavigateHome}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-slate-300 hover:text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer"
            >
              <span>Jelajahi Game Gratis</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/10 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Garansi 100% Bersih & Bebas Virus</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-[#0A84FF] flex-shrink-0" />
            <span>Integrasi Pembayaran QiosPay Resmi</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Akses Unduhan Cepat Langsung Aktif</span>
          </div>
        </div>
      </section>

      {/* Search and Count Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-white/20 flex items-center justify-center text-amber-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <h2 className="heading-font text-base sm:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <span>DAFTAR GAME PREMIUM</span>
            <span className="text-xs font-mono text-amber-400">({filteredGames.length})</span>
          </h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari game premium..."
            className="w-full bg-white/[0.08] text-white text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-white/15 focus:outline-none focus:border-[#0A84FF] backdrop-blur-md"
          />
        </div>
      </div>

      {/* Grid of Premium Games */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
          <p className="text-xs font-semibold text-slate-300">Memuat katalog game premium...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-16 liquid-glass rounded-3xl border border-white/15 space-y-3">
          <ShoppingBag className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="heading-font text-base font-bold text-white">Tidak ada game premium yang sesuai</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian Anda atau periksa kembali nanti.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="group rounded-3xl liquid-glass border border-white/15 hover:border-amber-400/50 transition-all duration-300 overflow-hidden flex flex-col shadow-xl hover:shadow-2xl hover:shadow-amber-500/10"
            >
              {/* Cover Banner */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                <img
                  src={game.coverUrl || game.bannerUrl}
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080c1f] via-transparent to-black/30" />

                {/* Badge Top Left */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/90 text-black text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md">
                  <Crown className="w-3.5 h-3.5 fill-black" />
                  <span>PREMIUM</span>
                </div>

                {/* Version Badge Top Right */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-black/60 border border-white/20 text-white font-mono text-[10px] backdrop-blur-md">
                  {game.version}
                </div>

                {/* Floating Icon */}
                <div className="absolute -bottom-4 left-5 w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-br from-white/30 to-white/10 border border-white/30 shadow-xl overflow-hidden backdrop-blur-xl">
                  <img
                    src={game.iconUrl || game.coverUrl}
                    alt={game.title}
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                </div>
              </div>

              {/* Card Body */}
              <div className="pt-6 px-5 pb-5 flex-grow flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                      {game.developer}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {game.fileSize}
                    </span>
                  </div>

                  <h3 className="heading-font text-base sm:text-lg font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {game.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {game.shortDescription || game.description}
                  </p>

                  {/* Feature Pills */}
                  {game.features && game.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {game.features.slice(0, 3).map((feat, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white/[0.08] text-[10px] text-slate-300 border border-white/10"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing & CTA */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <div>
                    {game.originalPrice && game.originalPrice > game.price && (
                      <span className="text-[11px] line-through text-slate-400 font-mono block">
                        {formatRupiah(game.originalPrice)}
                      </span>
                    )}
                    <span className="text-base sm:text-lg font-extrabold text-white font-mono text-amber-300">
                      {formatRupiah(game.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedGame(game)}
                      className="p-2.5 rounded-2xl liquid-glass-subtle text-slate-300 hover:text-white border border-white/20 transition-all cursor-pointer"
                      title="Lihat Detail Produk"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartCheckout(game)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 fill-black" />
                      <span>Beli Sekarang</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl liquid-glass border border-white/20 p-6 sm:p-8 space-y-6 shadow-2xl">
            <button
              onClick={() => setSelectedGame(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-56 rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
              <img
                src={selectedGame.bannerUrl || selectedGame.coverUrl}
                alt={selectedGame.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="text-xs text-amber-400 font-semibold">{selectedGame.category}</span>
                  <h2 className="heading-font text-xl sm:text-2xl font-bold text-white">
                    {selectedGame.title}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-amber-300 font-mono">
                    {formatRupiah(selectedGame.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Screenshots */}
            {selectedGame.screenshots && selectedGame.screenshots.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Tangkapan Layar
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedGame.screenshots.map((s, idx) => (
                    <img
                      key={idx}
                      src={s}
                      alt={`Screenshot ${idx + 1}`}
                      className="rounded-xl border border-white/10 h-28 w-full object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Deskripsi</h4>
              <p>{selectedGame.description || selectedGame.shortDescription}</p>
            </div>

            {/* CTA */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                <span>Versi: {selectedGame.version}</span> • <span>Ukuran: {selectedGame.fileSize}</span>
              </div>
              <button
                onClick={() => handleStartCheckout(selectedGame)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-black font-extrabold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Lanjutkan ke Pembayaran QiosPay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL (Buy Now Flow) */}
      {checkoutGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl liquid-glass border border-white/20 p-6 sm:p-7 space-y-5 shadow-2xl">
            <button
              onClick={() => setCheckoutGame(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-white/20 flex items-center justify-center text-amber-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="heading-font text-lg font-bold text-white">Pembelian Game Premium</h3>
                <p className="text-xs text-slate-300">{checkoutGame.title}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-300">Total Tagihan (QiosPay):</span>
              <span className="text-base font-extrabold text-amber-300 font-mono">
                {formatRupiah(checkoutGame.price)}
              </span>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCheckout} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Nama Lengkap</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Pratama"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  Alamat Email (Untuk Pengiriman Akses Download)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="budi@gmail.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  Link dan token unduhan aman akan dikaitkan langsung ke email ini.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingOrder || !customerName.trim() || !customerEmail.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-extrabold text-xs shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl liquid-glass border border-white/20 p-6 sm:p-7 space-y-5 shadow-2xl">
            <button
              onClick={() => setActiveOrder(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Status Header */}
            <div className="text-center space-y-2">
              <div
                className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border shadow-lg ${
                  activeOrder.status === 'PAID'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : activeOrder.status === 'EXPIRED' || activeOrder.status === 'CANCELLED'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                }`}
              >
                {activeOrder.status === 'PAID' ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : activeOrder.status === 'EXPIRED' || activeOrder.status === 'CANCELLED' ? (
                  <AlertCircle className="w-7 h-7" />
                ) : (
                  <Clock className="w-7 h-7 animate-pulse" />
                )}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider inline-block ${
                  activeOrder.status === 'PAID'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : activeOrder.status === 'EXPIRED' || activeOrder.status === 'CANCELLED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                STATUS: {activeOrder.status}
              </span>

              <h3 className="heading-font text-lg font-bold text-white">
                {activeOrder.status === 'PAID'
                  ? 'Pembayaran Berhasil Terverifikasi!'
                  : activeOrder.status === 'EXPIRED'
                  ? 'Tagihan Pembayaran Kedaluwarsa'
                  : 'Menunggu Pembayaran QiosPay'}
              </h3>
            </div>

            {/* Order Details */}
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>ID Pesanan:</span>
                <span className="font-mono text-white font-bold">{activeOrder.id}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Produk:</span>
                <span className="text-white font-medium line-clamp-1">{activeOrder.gameTitle}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total:</span>
                <span className="font-mono text-amber-300 font-extrabold">{formatRupiah(activeOrder.amount)}</span>
              </div>
              {activeOrder.qiospayInvoiceId && (
                <div className="flex justify-between text-slate-300">
                  <span>QiosPay Invoice:</span>
                  <span className="font-mono text-slate-400">{activeOrder.qiospayInvoiceId}</span>
                </div>
              )}
            </div>

            {/* Action based on status */}
            {activeOrder.status === 'PAID' ? (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Akses unduhan aktif selama 48 jam ke depan.</span>
                </div>

                {downloadInfo ? (
                  <a
                    href={downloadInfo.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 fill-black" />
                    <span>Unduh Game Sekarang ({downloadInfo.fileSize})</span>
                  </a>
                ) : (
                  <button
                    onClick={() => fetchDownloadAccess(activeOrder.downloadToken, activeOrder.id, activeOrder.customerEmail)}
                    disabled={verifyingDownload}
                    className="w-full py-3.5 rounded-2xl liquid-glass-button text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {verifyingDownload ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4 text-[#0A84FF]" />
                    )}
                    <span>Ambil Tautan Unduhan Aman</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {activeOrder.qiospayPaymentUrl && (
                  <a
                    href={activeOrder.qiospayPaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Halaman Pembayaran QiosPay</span>
                  </a>
                )}

                <button
                  onClick={() => checkOrderStatus(activeOrder.id)}
                  disabled={isPollingStatus}
                  className="w-full py-3 rounded-2xl liquid-glass text-white font-semibold text-xs border border-white/20 hover:bg-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPollingStatus ? 'animate-spin' : ''}`} />
                  <span>Periksa Status Pembayaran</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOOKUP EXISTING ORDER MODAL */}
      {isLookupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl liquid-glass border border-white/20 p-6 sm:p-7 space-y-5 shadow-2xl">
            <button
              onClick={() => setIsLookupOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#0A84FF]">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="heading-font text-lg font-bold text-white">Cek Status Pesanan</h3>
                <p className="text-xs text-slate-300">Masukkan Order ID dan email pembelian Anda</p>
              </div>
            </div>

            {lookupError && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{lookupError}</span>
              </div>
            )}

            <form onSubmit={handleLookupOrder} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Order ID</label>
                <input
                  type="text"
                  value={lookupOrderId}
                  onChange={(e) => setLookupOrderId(e.target.value)}
                  placeholder="ORD-1730000000-ABCD"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Alamat Email Pembelian</label>
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="budi@gmail.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white text-xs outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={lookupLoading || !lookupOrderId.trim() || !lookupEmail.trim()}
                  className="w-full py-3.5 rounded-2xl liquid-glass-button text-white font-bold text-xs shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
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

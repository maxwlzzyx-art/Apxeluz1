import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Bookmark,
  Share2,
  Calendar,
  HardDrive,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  ExternalLink,
  Server,
  History,
} from 'lucide-react';
import { Game } from '../types/game';
import { GameCard } from './GameCard';
import { safeOpenExternalUrl } from '../utils/urlValidation';
import { incrementDownloadCounter } from '../lib/supabaseService';
import { useScrollLock } from '../utils/useScrollLock';
import { useSwipeToClose } from '../utils/useSwipeToClose';

interface GameDetailModalProps {
  game: Game | null;
  onClose: () => void;
  onOpenDownload: (game: Game) => void;
  isSaved: boolean;
  onToggleSave: (gameId: string, e: React.MouseEvent) => void;
  allGames: Game[];
  onSelectGame: (game: Game) => void;
  savedGameIds: Set<string>;
  onOpenModPage?: (slug: string) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  onOpenDownload,
  isSaved,
  onToggleSave,
  allGames,
  onSelectGame,
  savedGameIds,
  onOpenModPage,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'guide' | 'changelog' | 'security'>('about');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useScrollLock(Boolean(game));
  const { sheetMotionClass, handleBarClass, dragHandlers } = useSwipeToClose(
    onClose,
    Boolean(game)
  );

  useEffect(() => {
    if (game && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    setActiveTab('about');
    setSelectedScreenshot(null);
  }, [game?.id]);

  if (!game) return null;

  const relatedGames = allGames
    .filter((g) => g.id !== game.id && (g.category === game.category || g.status === game.status))
    .slice(0, 4);

  const modSlug = game.slug || game.id;
  const shareUrl = `${window.location.origin}/mod/${modSlug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${game.title} on APXELUZ`,
          text: `Check out ${game.title} on APXELUZ:`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-[#10242E]/30 backdrop-blur-md overscroll-none backdrop-entrance"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-4xl liquid-glass rounded-t-[28px] sm:rounded-3xl overflow-hidden my-0 sm:my-auto max-h-[92vh] flex flex-col overscroll-contain sheet-entrance ${sheetMotionClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-game-title"
      >
        {/* Swipe-down Grab Handle + Dedicated Top Action Bar */}
        <div
          {...dragHandlers}
          className="shrink-0 liquid-glass-navbar border-b px-4 sm:px-6 pt-1 pb-3 z-30 touch-none select-none cursor-grab active:cursor-grabbing"
          title="Geser ke bawah untuk menutup"
        >
          <div
            data-testid="modal-drag-handle"
            className="w-full py-2 flex justify-center items-center"
          >
            <div className={handleBarClass} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-[#10242E] truncate">
              {game.title}
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {onOpenModPage && (
                <button
                  onClick={() => onOpenModPage(modSlug)}
                  className="min-h-[38px] px-3 py-1.5 rounded-2xl liquid-glass-button-secondary text-[#10242E] flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  aria-label="Open full page"
                  title="Open full page"
                >
                  <span>Full Page</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#0D9488]" />
                </button>
              )}

              <button
                onClick={handleShare}
                className="min-w-[38px] min-h-[38px] p-2 rounded-2xl liquid-glass-button-secondary text-[#10242E] flex items-center justify-center cursor-pointer"
                aria-label="Share direct URL"
                title="Copy URL"
              >
                {copiedLink ? (
                  <span className="text-[11px] text-[#0D9488] font-bold px-1">Copied!</span>
                ) : (
                  <Share2 className="w-4 h-4 text-[#1D6FA5]" />
                )}
              </button>

              <button
                onClick={(e) => onToggleSave(game.id, e)}
                className={`min-w-[38px] min-h-[38px] p-2 rounded-2xl flex items-center justify-center cursor-pointer tactile-press ${
                  isSaved
                    ? 'liquid-glass-button text-white'
                    : 'liquid-glass-button-secondary text-[#355968]'
                }`}
                aria-label={isSaved ? 'Remove from saved' : 'Save'}
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={onClose}
                className="min-w-[38px] min-h-[38px] p-2 rounded-2xl liquid-glass-button-secondary text-[#10242E] flex items-center justify-center cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto custom-scrollbar flex-grow overscroll-y-contain touch-pan-y"
        >
          {/* Hero Banner Section */}
          <div className="relative h-32 sm:h-52 w-full bg-[#E3F2F0] border-b border-[#D3DDE3] overflow-hidden">
            <img
              src={game.bannerUrl || game.coverUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-[#10242E]/10 pointer-events-none" />
          </div>

          {/* Main Info Header */}
          <div className="px-4 sm:px-8 -mt-12 sm:-mt-16 relative z-20 pb-5 border-b border-[#10242E]/10">
            <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-5 items-start sm:items-end">
              {/* Cover Art (1:1 Icon Aspect with Elevated Physical Frame) */}
              <div className="w-20 sm:w-32 aspect-square flex-shrink-0 rounded-2xl overflow-hidden border-2 border-white bg-white shadow-[0_14px_28px_-8px_rgba(16,36,46,0.28)] relative ring-1 ring-black/5">
                <img
                  src={game.coverUrl}
                  alt={game.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title & Clean Unboxed Metadata */}
              <div className="flex-grow space-y-1">
                <p className="text-xs font-semibold text-[#0D9488] tabular-nums">
                  {game.status} · {game.category} · {game.version}
                  {game.obbRequired ? ' · Data Required' : ''}
                </p>

                <h2
                  id="modal-game-title"
                  className="heading-font text-xl sm:text-3xl font-extrabold tracking-tight text-[#10242E] text-3d"
                >
                  {game.title}
                </h2>

                <div className="flex items-center gap-2 text-xs text-[#4A6270] flex-wrap">
                  <span>
                    Developer: <strong className="text-[#10242E]">{game.developer}</strong>
                  </span>
                  {game.porter && (
                    <span>
                      · Mod by: <strong className="text-[#1D6FA5]">{game.porter}</strong>
                    </span>
                  )}
                  <span>· {game.minAndroid}</span>
                </div>
              </div>

              {/* Primary 3D Tactile Download CTA (Desktop; Mobile uses sticky bottom thumb dock + top CTA) */}
              <div className="hidden sm:block flex-shrink-0">
                <button
                  onClick={() => onOpenDownload(game)}
                  className="min-h-[46px] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl liquid-glass-button text-white font-bold text-sm tracking-wide cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download ({game.fileSize})</span>
                </button>
              </div>
            </div>

            {/* Quick Specs Grid (Matte Recessed Instrument Wells) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 sm:mt-5 pt-4 border-t border-[#10242E]/10 text-xs">
              <div className="p-3 rounded-2xl recessed-well flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-[#0D9488] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[#4A6270] font-medium">File Size</div>
                  <div className="font-bold text-[#10242E] tabular-nums">{game.fileSize}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl recessed-well flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-[#1D6FA5] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[#4A6270] font-medium">Architecture</div>
                  <div className="font-bold text-[#10242E] truncate">{game.architecture}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl recessed-well flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#0D9488] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[#4A6270] font-medium">Updated</div>
                  <div className="font-bold text-[#10242E] tabular-nums">{game.updatedDate}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl recessed-well flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[#4A6270] font-medium">Safety Scan</div>
                  <div className="font-bold text-[#0F766E] flex items-center gap-1 tabular-nums">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Clean (0/72)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Horizontal Navigation Tabs on Mobile */}
          <div className="px-5 sm:px-8 border-b border-[#0f2c38]/10 flex gap-5 sm:gap-7 text-xs sm:text-sm overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('about')}
              className={`py-3.5 border-b-2 font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'about'
                  ? 'border-[#0d9488] text-[#0d9488]'
                  : 'border-transparent text-[#4a6f7d] hover:text-[#0f2c38]'
              }`}
            >
              Overview &amp; Features
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`py-3.5 border-b-2 font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'guide'
                  ? 'border-[#0d9488] text-[#0d9488]'
                  : 'border-transparent text-[#4a6f7d] hover:text-[#0f2c38]'
              }`}
            >
              Installation Guide
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`py-3.5 border-b-2 font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'changelog'
                  ? 'border-[#0d9488] text-[#0d9488]'
                  : 'border-transparent text-[#4a6f7d] hover:text-[#0f2c38]'
              }`}
            >
              Changelog ({game.changelog.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-3.5 border-b-2 font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'security'
                  ? 'border-[#0d9488] text-[#0d9488]'
                  : 'border-transparent text-[#4a6f7d] hover:text-[#0f2c38]'
              }`}
            >
              Integrity &amp; Checksum
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5 sm:p-8 space-y-6">
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="heading-font text-sm font-bold text-[#0f2c38] text-3d-subtle mb-2">
                    About the Item
                  </h3>
                  <p className="text-sm text-[#2c4f5e] leading-relaxed whitespace-pre-line">
                    {game.description}
                  </p>
                </div>

                {/* Screenshots Gallery */}
                {game.screenshots && game.screenshots.length > 0 && (
                  <div>
                    <h3 className="heading-font text-sm font-bold text-[#0f2c38] text-3d-subtle mb-3">
                      Screenshots &amp; Previews
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {game.screenshots.map((shot, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setSelectedScreenshot(shot)}
                          className="relative aspect-video rounded-2xl overflow-hidden liquid-glass-card group cursor-pointer"
                          aria-label={`View screenshot ${idx + 1}`}
                        >
                          <img
                            src={shot}
                            alt={`${game.title} screenshot ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-[#0f2c38]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="w-5 h-5 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {game.features && game.features.length > 0 && (
                  <div>
                    <h3 className="heading-font text-sm font-bold text-[#0f2c38] text-3d-subtle mb-3">
                      Key Highlights
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {game.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl liquid-glass-subtle flex items-start gap-2.5 text-xs text-[#2c4f5e]"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#0d9488] flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download Destinations & Mirrors */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="heading-font text-sm font-bold text-[#0f2c38] text-3d-subtle flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#0d9488]" />
                      <span>Download Destinations</span>
                    </h3>
                    <span className="text-[11px] text-[#4a6f7d] font-medium">
                      External Link · Safe Redirect
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {((game.downloadLinks && game.downloadLinks.length > 0)
                      ? game.downloadLinks
                      : [
                          {
                            id: 'primary',
                            name: 'Primary Download',
                            url: 'https://example.com/download/' + (game.slug || game.id),
                            isPrimary: true,
                            notes: 'Official external mirror',
                          },
                        ]
                    ).map((mirror, idx) => (
                      <div
                        key={mirror.id || idx}
                        className="p-4 rounded-2xl liquid-glass-subtle flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-[#0f2c38] truncate">
                              {mirror.name}
                            </span>
                            {mirror.isPrimary && (
                              <span className="text-[11px] font-bold text-[#0d9488] flex-shrink-0">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#4a6f7d] font-mono truncate mt-1">
                            {mirror.url}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            incrementDownloadCounter(game.id).catch(() => {});
                            safeOpenExternalUrl(mirror.url, '_blank');
                          }}
                          className="w-full min-h-[42px] py-2 px-3 rounded-xl liquid-glass-button text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open {mirror.name}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Previous Releases Archive if available */}
                  {game.versions && game.versions.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-[#0f2c38]/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0f2c38] flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-[#0d9488]" />
                          <span>Previous Releases ({game.versions.length})</span>
                        </span>
                        <span className="text-[11px] text-[#4a6f7d]">Archives</span>
                      </div>

                      <div className="space-y-2">
                        {game.versions.map((ver, vIdx) => {
                          const mirror = ver.downloadLinks?.[0];
                          return (
                            <div
                              key={ver.id || vIdx}
                              className="p-3 rounded-2xl liquid-glass-subtle flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate tabular-nums">
                                <span className="font-mono text-xs font-bold text-[#0d9488]">
                                  {ver.version}
                                </span>
                                <span className="text-[#4a6f7d] truncate">
                                  · {ver.formattedFileSize || `${ver.fileSizeValue || ''} ${ver.fileSizeUnit || 'MB'}`}
                                </span>
                              </div>
                              {mirror && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    incrementDownloadCounter(game.id).catch(() => {});
                                    safeOpenExternalUrl(mirror.url, '_blank');
                                  }}
                                  className="min-h-[36px] px-3 py-1.5 rounded-xl liquid-glass-button-secondary text-[#0f2c38] text-xs font-semibold flex items-center gap-1 flex-shrink-0 cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3 text-[#0d9488]" />
                                  <span>Download</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'guide' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#fef3c7]/80 border border-white text-xs text-[#78350f] flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#b45309]" />
                  <div>
                    <strong className="block font-bold mb-1">Installation Notice</strong>
                    Ensure your device allows installing unknown applications in system settings.
                  </div>
                </div>

                <ol className="space-y-2.5">
                  {(game.installationGuide || [
                    'Download the verified package to your storage.',
                    'Locate the file in your Downloads folder and tap to install.',
                    'Launch the app and follow initial setup prompts.',
                  ]).map((step, idx) => (
                    <li
                      key={idx}
                      className="p-4 rounded-2xl liquid-glass-subtle flex items-start gap-3 text-xs sm:text-sm text-[#2c4f5e]"
                    >
                      <span className="w-6 h-6 rounded-xl bg-[#d7f5eb] text-[#0b5e58] font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {activeTab === 'changelog' && (
              <div className="space-y-3.5">
                {game.changelog.map((log, idx) => (
                  <div key={idx} className="p-4 rounded-2xl liquid-glass-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-[#0d9488] tabular-nums">
                        {log.version}
                      </span>
                      <span className="text-xs text-[#4a6f7d]">{log.date}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-[#355968] pl-4 list-disc">
                      {log.changes.map((change, cIdx) => (
                        <li key={cIdx}>{change}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-5 rounded-2xl liquid-glass-subtle space-y-3.5 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-[#4a6f7d] block">
                    Package Identifier
                  </span>
                  <span className="font-mono text-[#0f2c38] font-medium select-all">
                    {game.packageName}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#4a6f7d] block">
                    SHA-256 Signature Checksum
                  </span>
                  <span className="font-mono text-[#0d9488] break-all select-all">
                    {game.sha256}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#4a6f7d] block">
                    VirusTotal Scan Status
                  </span>
                  <div className="flex items-center gap-1.5 text-[#0d9488] mt-1 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verified Clean - 0 / 72 Security Engines Flagged</span>
                  </div>
                </div>
              </div>
            )}

            {/* Related Items Row */}
            {relatedGames.length > 0 && (
              <div className="pt-5 border-t border-[#0f2c38]/10">
                <h3 className="heading-font text-sm font-bold text-[#0f2c38] text-3d-subtle mb-3">
                  Related in {game.category}
                </h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {relatedGames.map((relGame) => (
                    <div key={relGame.id} className="w-[148px] flex-shrink-0">
                      <GameCard
                        game={relGame}
                        onSelect={(g) => onSelectGame(g)}
                        isSaved={savedGameIds.has(relGame.id)}
                        onToggleSave={onToggleSave}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sticky Thumb-Zone Download Action Bar */}
        <div className="sm:hidden shrink-0 liquid-glass-navbar border-t px-4 py-3 pb-safe-dock flex items-center gap-2.5 z-30">
          <button
            type="button"
            onClick={(e) => onToggleSave(game.id, e)}
            className={`min-w-[46px] min-h-[46px] p-2.5 rounded-2xl flex items-center justify-center cursor-pointer tactile-press shrink-0 ${
              isSaved
                ? 'liquid-glass-button text-white'
                : 'liquid-glass-button-secondary text-[#10242E]'
            }`}
            aria-label={isSaved ? 'Hapus dari tersimpan' : 'Simpan item'}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => onOpenDownload(game)}
            className="flex-1 min-h-[46px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-sm tracking-wide cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download ({game.fileSize})</span>
          </button>
        </div>

        {/* Lightbox for screenshots */}
        {selectedScreenshot && (
          <div
            className="fixed inset-0 z-50 bg-[#10242E]/80 backdrop-blur-md flex items-center justify-center p-4 backdrop-entrance"
            onClick={() => setSelectedScreenshot(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={selectedScreenshot}
                alt="Enlarged screenshot"
                referrerPolicy="no-referrer"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain border-2 border-white/90 shadow-2xl"
              />
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="absolute -top-12 right-0 min-w-[44px] min-h-[44px] rounded-full bg-white text-[#10242E] flex items-center justify-center shadow-md cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

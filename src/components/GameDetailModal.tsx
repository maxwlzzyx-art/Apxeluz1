import React, { useState } from 'react';
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
  Copy,
  Maximize2,
  ExternalLink,
  Server,
  History,
} from 'lucide-react';
import { Game } from '../types/game';
import { GameCard } from './GameCard';
import { safeOpenExternalUrl, getHostingProvider } from '../utils/urlValidation';
import { incrementDownloadCounter } from '../lib/firestoreService';

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
      } catch (err) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#040714]/80 backdrop-blur-[24px] saturate-[180%] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl liquid-glass rounded-3xl border border-white/20 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-game-title"
      >
        {/* Sticky Actions Header */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {onOpenModPage && (
            <button
              onClick={() => onOpenModPage(modSlug)}
              className="p-2 rounded-2xl liquid-glass-subtle hover:bg-white/20 text-slate-200 hover:text-white border border-white/20 transition-colors flex items-center gap-1.5 text-xs font-semibold px-3"
              aria-label="Open full page"
              title="Open full page"
            >
              <span>Full Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-2.5 rounded-2xl liquid-glass-subtle hover:bg-white/20 text-slate-200 hover:text-white border border-white/20 transition-colors"
            aria-label="Share direct URL"
            title="Copy URL"
          >
            {copiedLink ? (
              <span className="text-[10px] text-[#0A84FF] font-bold px-1">Copied!</span>
            ) : (
              <Share2 className="w-4 h-4 text-[#BF5AF2]" />
            )}
          </button>

          <button
            onClick={(e) => onToggleSave(game.id, e)}
            className={`p-2.5 rounded-2xl border backdrop-blur-xl transition-colors ${
              isSaved
                ? 'bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2] text-white border-white/30 shadow-md'
                : 'liquid-glass-subtle hover:bg-white/20 text-slate-200 hover:text-white border-white/20'
            }`}
            aria-label={isSaved ? 'Remove from saved' : 'Save'}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl liquid-glass-subtle hover:bg-white/20 text-slate-200 hover:text-white border border-white/20 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto custom-scrollbar flex-grow">
          {/* Hero Banner Section */}
          <div className="relative h-48 sm:h-64 w-full bg-white/5 overflow-hidden">
            <img
              src={game.bannerUrl || game.coverUrl}
              alt=""
              className="w-full h-full object-cover opacity-60 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080c1f] via-[#080c1f]/50 to-transparent" />
          </div>

          {/* Main Info Header */}
          <div className="px-6 sm:px-10 -mt-20 relative z-20 pb-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end">
              {/* Cover Art */}
              <div className="w-28 sm:w-36 aspect-[3/4] flex-shrink-0 rounded-2xl overflow-hidden border-2 border-white/25 bg-white/10 shadow-2xl relative">
                <img
                  src={game.coverUrl}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase backdrop-blur-md ${
                    game.status === 'Official'
                      ? 'bg-[#0A84FF]/30 text-[#0A84FF] border border-[#0A84FF]/50 shadow-sm'
                      : 'bg-[#BF5AF2]/30 text-[#BF5AF2] border border-[#BF5AF2]/50 shadow-sm'
                  }`}
                >
                  {game.status}
                </span>
              </div>

              {/* Title & Metadata */}
              <div className="flex-grow space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-[#0A84FF]">
                    {game.category}
                  </span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-mono bg-white/10 border border-white/15 text-slate-300">
                    {game.version}
                  </span>
                  {game.obbRequired && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Data Required
                    </span>
                  )}
                </div>

                <h1
                  id="modal-game-title"
                  className="heading-font text-2xl sm:text-3xl font-bold tracking-tight text-white"
                >
                  {game.title}
                </h1>

                <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                  <span>Developer: <strong className="text-white">{game.developer}</strong></span>
                  {game.porter && (
                    <span>• Ported/Mod by: <strong className="text-[#0A84FF]">{game.porter}</strong></span>
                  )}
                  <span>• {game.minAndroid}</span>
                </div>
              </div>

              {/* Download CTA Button */}
              <div className="w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0">
                <button
                  onClick={() => onOpenDownload(game)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl liquid-glass-button text-white font-bold text-sm tracking-wide transition-all shadow-[0_4px_24px_rgba(10,132,255,0.4)] active:scale-95"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download ({game.fileSize})</span>
                </button>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
              <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-[#0A84FF]" />
                <div>
                  <div className="text-[10px] text-slate-400">File Size</div>
                  <div className="font-semibold text-white">{game.fileSize}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-3">
                <Cpu className="w-4 h-4 text-[#BF5AF2]" />
                <div>
                  <div className="text-[10px] text-slate-400">Architecture</div>
                  <div className="font-semibold text-white truncate max-w-[120px]">
                    {game.architecture}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#0A84FF]" />
                <div>
                  <div className="text-[10px] text-slate-400">Updated</div>
                  <div className="font-semibold text-white">{game.updatedDate}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-[#0A84FF]" />
                <div>
                  <div className="text-[10px] text-slate-400">Safety Scan</div>
                  <div className="font-semibold text-[#0A84FF] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Clean (0/72)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 sm:px-10 border-b border-white/10 flex gap-4 sm:gap-8 text-sm">
            <button
              onClick={() => setActiveTab('about')}
              className={`py-4 border-b-2 font-semibold transition-all duration-300 ${
                activeTab === 'about'
                  ? 'border-[#0A84FF] text-[#0A84FF]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Overview & Features
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`py-4 border-b-2 font-semibold transition-all duration-300 ${
                activeTab === 'guide'
                  ? 'border-[#0A84FF] text-[#0A84FF]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Installation Guide
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`py-4 border-b-2 font-semibold transition-all duration-300 ${
                activeTab === 'changelog'
                  ? 'border-[#0A84FF] text-[#0A84FF]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Changelog ({game.changelog.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 border-b-2 font-semibold transition-all duration-300 ${
                activeTab === 'security'
                  ? 'border-[#0A84FF] text-[#0A84FF]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Integrity & Checksum
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-10 space-y-6">
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider mb-2">
                    About the Item
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {game.description}
                  </p>
                </div>

                {/* Screenshots Gallery */}
                {game.screenshots && game.screenshots.length > 0 && (
                  <div>
                    <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider mb-3">
                      Screenshots & Previews
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                      {game.screenshots.map((shot, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedScreenshot(shot)}
                          className="relative aspect-video rounded-2xl overflow-hidden liquid-glass-card group cursor-pointer"
                        >
                          <img
                            src={shot}
                            alt={`${game.title} screenshot ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {game.features && game.features.length > 0 && (
                  <div>
                    <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider mb-3">
                      Key Highlights
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {game.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl liquid-glass-subtle flex items-start gap-3 text-xs text-slate-200"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#0A84FF] flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download Destinations & Mirrors */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#0A84FF]" />
                      <span>Download Destinations</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      External Link • Safe Redirect
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
                    ).map((mirror, idx) => {
                      const hosting = getHostingProvider(mirror.url, mirror.name);
                      return (
                        <div
                          key={mirror.id || idx}
                          className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/15 flex flex-col justify-between gap-3 hover:border-[#0A84FF]/40 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-white truncate">
                                {mirror.name}
                              </span>
                              {mirror.isPrimary && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#0A84FF]/30 text-[#0A84FF] border border-[#0A84FF]/40 flex-shrink-0">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate mt-1">
                              {mirror.url}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              incrementDownloadCounter(game.id).catch(() => {});
                              safeOpenExternalUrl(mirror.url, '_blank');
                            }}
                            className="w-full py-2 px-3 rounded-xl liquid-glass-button text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open {mirror.name}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Previous Releases Archive if available */}
                  {game.versions && game.versions.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-[#0A84FF]" />
                          <span>Previous Releases ({game.versions.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Archives</span>
                      </div>

                      <div className="space-y-1.5">
                        {game.versions.map((ver, vIdx) => {
                          const mirror = ver.downloadLinks?.[0];
                          return (
                            <div
                              key={ver.id || vIdx}
                              className="p-2.5 rounded-xl liquid-glass-subtle border border-white/10 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-[11px] font-bold text-[#0A84FF] px-1.5 py-0.5 rounded bg-[#0A84FF]/20">
                                  {ver.version}
                                </span>
                                <span className="text-slate-300 text-[11px] truncate">
                                  {ver.formattedFileSize || `${ver.fileSizeValue || ''} ${ver.fileSizeUnit || 'MB'}`}
                                </span>
                              </div>
                              {mirror && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    incrementDownloadCounter(game.id).catch(() => {});
                                    safeOpenExternalUrl(mirror.url, '_blank');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#0A84FF] text-white text-[11px] font-medium flex items-center gap-1 flex-shrink-0 cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
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
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
                  <div>
                    <strong className="block font-bold mb-1">Installation Notice:</strong>
                    Ensure your device allows installing unknown applications in system settings.
                  </div>
                </div>

                <ol className="space-y-3">
                  {(game.installationGuide || [
                    'Download the verified package to your storage.',
                    'Locate the file in your Downloads folder and tap to install.',
                    'Launch the app and follow initial setup prompts.'
                  ]).map((step, idx) => (
                    <li
                      key={idx}
                      className="p-4 rounded-2xl liquid-glass-subtle flex items-start gap-3.5 text-xs text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#0A84FF]/25 text-[#0A84FF] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {activeTab === 'changelog' && (
              <div className="space-y-4">
                {game.changelog.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl liquid-glass-subtle space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-[#0A84FF]">
                        {log.version}
                      </span>
                      <span className="text-xs text-slate-400">{log.date}</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300 pl-4 list-disc">
                      {log.changes.map((change, cIdx) => (
                        <li key={cIdx}>{change}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4 text-xs">
                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Package Identifier
                    </span>
                    <span className="font-mono text-white select-all">{game.packageName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      SHA-256 Signature Checksum
                    </span>
                    <span className="font-mono text-[#0A84FF] break-all select-all">
                      {game.sha256}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      VirusTotal Scan Status
                    </span>
                    <div className="flex items-center gap-1.5 text-[#0A84FF] mt-1 font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Clean - 0 / 72 Security Engines Flagged</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Related Items Row */}
            {relatedGames.length > 0 && (
              <div className="pt-6 border-t border-white/10">
                <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Related in {game.category}
                </h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {relatedGames.map((relGame) => (
                    <div key={relGame.id} className="w-[145px] flex-shrink-0">
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

        {/* Lightbox for screenshots */}
        {selectedScreenshot && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedScreenshot(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={selectedScreenshot}
                alt="Enlarged screenshot"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain border border-white/20"
              />
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="absolute -top-10 right-0 text-white p-1 hover:text-[#0A84FF]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

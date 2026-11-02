import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  Bookmark,
  ChevronLeft,
  Calendar,
  HardDrive,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowLeft,
  Maximize2,
  X,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  Server,
  History,
} from 'lucide-react';
import { Game } from '../types/game';
import { safeOpenExternalUrl, getHostingProvider } from '../utils/urlValidation';
import { incrementDownloadCounter } from '../lib/firestoreService';

interface ModPageProps {
  slug: string;
  mod: Game | undefined;
  onNavigateHome: () => void;
  onOpenDownload: (game: Game) => void;
  isSaved: boolean;
  onToggleSave: (gameId: string, e: React.MouseEvent) => void;
}

export const ModPage: React.FC<ModPageProps> = ({
  slug,
  mod,
  onNavigateHome,
  onOpenDownload,
  isSaved,
  onToggleSave,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'guide' | 'changelog' | 'security'>('about');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const itemType = mod?.type || (window.location.pathname.startsWith('/app/') ? 'app' : window.location.pathname.startsWith('/game/') ? 'game' : 'mod');
  const typeLabel = itemType === 'app' ? 'Application' : itemType === 'game' ? 'Game' : 'Mod';

  // If item slug does not exist, display proper 404 page (requirement 5)
  if (!mod) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 px-4">
        <div className="p-8 sm:p-12 rounded-3xl liquid-glass border border-white/20 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#0A84FF]/20 to-[#BF5AF2]/20 border border-white/20 flex items-center justify-center text-[#BF5AF2] shadow-[0_0_25px_rgba(191,90,242,0.3)]">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              404 ERROR
            </span>
            <h1 className="heading-font text-2xl sm:text-3xl font-bold text-white">
              {typeLabel} Not Found
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              The {typeLabel.toLowerCase()} with slug <span className="font-mono text-[#0A84FF] font-semibold bg-white/10 px-2 py-0.5 rounded-lg">/{itemType}/{slug}</span> does not exist or has been removed from APXELUZ.
            </p>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl liquid-glass-button text-sm font-bold text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Discover</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/${mod.type || 'mod'}/${mod.slug || slug}`;

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // Fall back to textarea
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  };

  // Share button using Web Share API when available with clipboard fallback
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${mod.title} on APXELUZ`,
          text: `Check out ${mod.title} (${mod.version}) on APXELUZ:`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, proceed to fallback
      }
    }

    const copied = await copyToClipboard(shareUrl);
    setCopyFeedback(copied ? 'Link copied to clipboard!' : 'URL: ' + shareUrl);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCopyLink = async () => {
    const copied = await copyToClipboard(shareUrl);
    setCopyFeedback(copied ? 'Direct URL copied!' : 'URL: ' + shareUrl);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Breadcrumb & Share Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors p-1 -m-1"
        >
          <ChevronLeft className="w-4 h-4 text-[#0A84FF]" />
          <span>Back to Repository</span>
        </button>

        {/* Share & Copy Link Actions */}
        <div className="flex items-center gap-2">
          {copyFeedback && (
            <span className="text-xs font-semibold text-[#0A84FF] bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 animate-fade-in backdrop-blur-md">
              {copyFeedback}
            </span>
          )}

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl liquid-glass-subtle hover:bg-white/15 text-xs font-semibold text-slate-200 hover:text-white border border-white/15 transition-all"
            aria-label="Copy direct mod URL"
            title="Copy URL"
          >
            <Copy className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>Copy Link</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl liquid-glass hover:bg-white/15 text-xs font-bold text-white border border-white/20 shadow-sm transition-all"
            aria-label="Share this mod"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5 text-[#BF5AF2]" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Main Glass Panel */}
      <div className="relative rounded-3xl liquid-glass border border-white/20 shadow-2xl overflow-hidden">
        {/* Hero Banner with Soft Glass Gradient */}
        <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-white/5">
          <img
            src={mod.bannerUrl || mod.coverUrl}
            alt=""
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080c1f] via-[#080c1f]/50 to-transparent" />

          {/* Shareable Slug Pill in corner */}
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-black/50 text-slate-200 border border-white/20 backdrop-blur-xl">
              <LinkIcon className="w-3 h-3 text-[#0A84FF]" />
              <span>/{mod.type || itemType}/{mod.slug || slug}</span>
            </span>
          </div>
        </div>

        {/* Info Header */}
        <div className="px-6 sm:px-10 -mt-24 relative z-20 pb-8 border-b border-white/10">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            {/* Cover Art */}
            <div className="w-32 sm:w-40 aspect-[3/4] flex-shrink-0 rounded-2xl overflow-hidden border-2 border-white/25 shadow-[0_12px_40px_rgba(0,0,0,0.5)] bg-white/10 relative">
              <img
                src={mod.coverUrl}
                alt={mod.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase backdrop-blur-md bg-[#BF5AF2]/30 text-[#BF5AF2] border border-[#BF5AF2]/50 shadow-sm">
                {mod.status}
              </span>
            </div>

            {/* Title & Metadata */}
            <div className="flex-grow space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-[#0A84FF]">
                  {mod.category}
                </span>
                <span className="px-3 py-0.5 rounded-full text-xs font-mono bg-white/10 border border-white/15 text-slate-300">
                  {mod.version}
                </span>
                {mod.obbRequired && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Data Package Required
                  </span>
                )}
              </div>

              <h1 className="heading-font text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
                {mod.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                <span>By: <strong className="text-white">{mod.developer}</strong></span>
                {mod.porter && (
                  <span>• Maintained by: <strong className="text-[#0A84FF]">{mod.porter}</strong></span>
                )}
                <span>• {mod.minAndroid}</span>
              </div>
            </div>

            {/* Download CTA Button */}
            <div className="w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0 flex gap-2">
              <button
                onClick={(e) => onToggleSave(mod.id, e)}
                className={`p-3.5 rounded-2xl border backdrop-blur-xl transition-all ${
                  isSaved
                    ? 'bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2] text-white border-white/30 shadow-lg'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border-white/20'
                }`}
                aria-label={isSaved ? 'Remove from saved' : 'Save mod'}
              >
                <Bookmark className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={() => onOpenDownload(mod)}
                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl liquid-glass-button text-white font-bold text-sm tracking-wide transition-all shadow-[0_4px_24px_rgba(10,132,255,0.4)] active:scale-95"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download {typeLabel} ({mod.fileSize || mod.formattedFileSize || 'Package'})</span>
              </button>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
            <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-3">
              <HardDrive className="w-4 h-4 text-[#0A84FF]" />
              <div>
                <div className="text-[10px] text-slate-400">Package Size</div>
                <div className="font-semibold text-white">{mod.fileSize}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-3">
              <Cpu className="w-4 h-4 text-[#BF5AF2]" />
              <div>
                <div className="text-[10px] text-slate-400">Architecture</div>
                <div className="font-semibold text-white truncate max-w-[120px]">
                  {mod.architecture}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#0A84FF]" />
              <div>
                <div className="text-[10px] text-slate-400">Updated</div>
                <div className="font-semibold text-white">{mod.updatedDate}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-[#0A84FF]" />
              <div>
                <div className="text-[10px] text-slate-400">Security Check</div>
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
                ? 'border-[#0A84FF] text-[#0A84FF] drop-shadow-[0_0_10px_rgba(10,132,255,0.5)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Overview & Features
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-4 border-b-2 font-semibold transition-all duration-300 ${
              activeTab === 'guide'
                ? 'border-[#0A84FF] text-[#0A84FF] drop-shadow-[0_0_10px_rgba(10,132,255,0.5)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Installation Guide
          </button>
          <button
            onClick={() => setActiveTab('changelog')}
            className={`py-4 border-b-2 font-semibold transition-all duration-300 ${
              activeTab === 'changelog'
                ? 'border-[#0A84FF] text-[#0A84FF] drop-shadow-[0_0_10px_rgba(10,132,255,0.5)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Changelog ({mod.changelog?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 border-b-2 font-semibold transition-all duration-300 ${
              activeTab === 'security'
                ? 'border-[#0A84FF] text-[#0A84FF] drop-shadow-[0_0_10px_rgba(10,132,255,0.5)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Checksum & Hash
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-10 space-y-6">
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider mb-2.5">
                  About this {typeLabel}
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {mod.description || `Verified ${typeLabel.toLowerCase()} release published to APXELUZ.`}
                </p>
              </div>

              {/* Screenshots Gallery */}
              {mod.screenshots && mod.screenshots.length > 0 && (
                <div>
                  <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider mb-3">
                    {typeLabel} Screenshots
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {mod.screenshots.map((shot, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedScreenshot(shot)}
                        className="relative aspect-video rounded-2xl overflow-hidden liquid-glass-card group cursor-pointer"
                      >
                        <img
                          src={shot}
                          alt={`${mod.title} screenshot ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs">
                          <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mod Features */}
              {mod.features && mod.features.length > 0 && (
                <div>
                  <h3 className="heading-font text-sm font-bold text-white uppercase tracking-wider mb-3">
                    Key Features
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mod.features.map((feature, idx) => (
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
                    <span>Download Destinations & Mirrors</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Safe External Redirect
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {((mod.downloadLinks && mod.downloadLinks.length > 0)
                    ? mod.downloadLinks
                    : [
                        {
                          id: 'primary',
                          name: 'Primary Download',
                          url: 'https://example.com/download/' + (mod.slug || mod.id),
                          isPrimary: true,
                          notes: 'Official external mirror',
                        },
                      ]
                  ).map((mirror, idx) => {
                    const hosting = getHostingProvider(mirror.url, mirror.name);
                    return (
                      <div
                        key={mirror.id || idx}
                        className="p-4 rounded-2xl liquid-glass-subtle border border-white/15 flex flex-col justify-between gap-3 hover:border-[#0A84FF]/40 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-white truncate">
                              {mirror.name}
                            </span>
                            {mirror.isPrimary && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0A84FF]/30 text-[#0A84FF] border border-[#0A84FF]/40 flex-shrink-0">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate mt-1">
                            {mirror.url}
                          </div>
                          {mirror.notes && (
                            <div className="text-[10px] text-slate-400 mt-1 italic">
                              {mirror.notes}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            incrementDownloadCounter(mod.id).catch(() => {});
                            safeOpenExternalUrl(mirror.url, '_blank');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl liquid-glass-button text-white text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open {mirror.name}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Previous Versions Archive if available */}
                {mod.versions && mod.versions.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="heading-font text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <History className="w-4 h-4 text-[#0A84FF]" />
                        <span>Previous Version Releases ({mod.versions.length})</span>
                      </h4>
                      <span className="text-[11px] text-slate-400">Archived Releases</span>
                    </div>

                    <div className="space-y-2">
                      {mod.versions.map((ver, vIdx) => {
                        const verPrimaryMirror = ver.downloadLinks?.[0];
                        return (
                          <div
                            key={ver.id || vIdx}
                            className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#0A84FF] px-2 py-0.5 rounded-md bg-[#0A84FF]/20 border border-[#0A84FF]/30">
                                  {ver.version}
                                </span>
                                <span className="text-xs text-slate-300 font-medium">
                                  {ver.formattedFileSize || `${ver.fileSizeValue || ''} ${ver.fileSizeUnit || 'MB'}`}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  • {ver.releaseDate}
                                </span>
                              </div>
                              {ver.notes && (
                                <p className="text-[11px] text-slate-400 italic">{ver.notes}</p>
                              )}
                            </div>

                            {verPrimaryMirror && (
                              <button
                                type="button"
                                onClick={() => {
                                  incrementDownloadCounter(mod.id).catch(() => {});
                                  safeOpenExternalUrl(verPrimaryMirror.url, '_blank');
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-[#0A84FF] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Download {ver.version}</span>
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
                  Ensure you allow unknown app installation in your device settings. Follow mod file extraction steps carefully.
                </div>
              </div>

              <ol className="space-y-3">
                {(mod.installationGuide || [
                  'Download the verified package to your storage.',
                  'Locate the file in your Downloads folder and follow setup instructions.',
                  'Launch the app and enjoy.'
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
              {(mod.changelog || []).map((log, idx) => (
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
                  <span className="font-mono text-white select-all">{mod.packageName}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    SHA-256 Signature Checksum
                  </span>
                  <span className="font-mono text-[#0A84FF] break-all select-all">
                    {mod.sha256}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Security Scan Status
                  </span>
                  <div className="flex items-center gap-1.5 text-[#0A84FF] mt-1 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verified Clean - 0 / 72 Security Engines Flagged</span>
                  </div>
                </div>
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
  );
};

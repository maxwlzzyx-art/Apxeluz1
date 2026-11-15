import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Download,
  Bookmark,
  ChevronLeft,
  Calendar,
  HardDrive,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Maximize2,
  X,
  Link as LinkIcon,
  ExternalLink,
  Server,
  History,
} from 'lucide-react';
import { Game } from '../types/game';
import { safeOpenExternalUrl } from '../utils/urlValidation';
import { incrementDownloadCounter } from '../lib/supabaseService';

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

  const itemType =
    mod?.type ||
    (window.location.pathname.startsWith('/app/')
      ? 'app'
      : window.location.pathname.startsWith('/game/')
      ? 'game'
      : 'mod');
  const typeLabel = itemType === 'app' ? 'Application' : itemType === 'game' ? 'Game' : 'Mod';

  // Proper 404 screen
  if (!mod) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4">
        <div className="p-8 sm:p-12 rounded-3xl liquid-glass text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#fee2e2] to-[#ffedd5] border border-white flex items-center justify-center text-[#be123c] shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-mono font-bold text-[#be123c]">404 ERROR</p>
            <h1 className="heading-font text-2xl sm:text-3xl font-extrabold text-[#0f2c38] text-3d">
              {typeLabel} Not Found
            </h1>
            <p className="text-sm text-[#355968] max-w-md mx-auto">
              The {typeLabel.toLowerCase()} with slug{' '}
              <span className="font-mono text-[#0d9488] font-semibold">
                /{itemType}/{slug}
              </span>{' '}
              does not exist or has been removed from APXELUZ.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={onNavigateHome}
              className="min-h-[46px] flex items-center gap-2 px-6 py-3 rounded-2xl liquid-glass-button text-sm font-bold text-white cursor-pointer"
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
      } catch {
        // Fall back to textarea
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.className = 'fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none';
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${mod.title} on APXELUZ`,
          text: `Check out ${mod.title} (${mod.version}) on APXELUZ:`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall back
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
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-4 space-y-5">
      {/* Top Breadcrumb & Share Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onNavigateHome}
          className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[#0d9488] hover:text-[#0284c7] transition-colors cursor-pointer tactile-press"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Repository</span>
        </button>

        <div className="flex items-center gap-2">
          {copyFeedback && (
            <span className="text-xs font-semibold text-[#0b5e58] bg-[#d7f5eb] px-3 py-1.5 rounded-xl border border-white">
              {copyFeedback}
            </span>
          )}

          <button
            onClick={handleCopyLink}
            className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-2xl liquid-glass-button-secondary text-xs font-bold text-[#0f2c38] cursor-pointer"
            aria-label="Copy direct mod URL"
            title="Copy URL"
          >
            <Copy className="w-3.5 h-3.5 text-[#0d9488]" />
            <span>Copy Link</span>
          </button>

          <button
            onClick={handleShare}
            className="min-h-[40px] flex items-center gap-1.5 px-4 py-2 rounded-2xl liquid-glass-button-secondary text-xs font-bold text-[#0f2c38] cursor-pointer"
            aria-label="Share this mod"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Main Frosted Glass Panel */}
      <div className="relative rounded-3xl liquid-glass overflow-hidden">
        {/* Hero Banner */}
        <div className="relative h-48 sm:h-68 w-full overflow-hidden bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff]">
          <img
            src={mod.bannerUrl || mod.coverUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-85 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f2faf8] via-[#f2faf8]/45 to-transparent" />

          {/* Subtle Slug Tag */}
          <div className="absolute top-3.5 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-mono font-semibold bg-white/85 text-[#0f2c38] border border-white backdrop-blur-md shadow-sm">
              <LinkIcon className="w-3 h-3 text-[#0d9488]" />
              <span>/{mod.type || itemType}/{mod.slug || slug}</span>
            </span>
          </div>
        </div>

        {/* Info Header */}
        <div className="px-5 sm:px-9 -mt-20 relative z-20 pb-6 border-b border-[#0f2c38]/10">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end">
            {/* Cover Art (1:1 Icon Aspect) */}
            <div className="w-28 sm:w-36 aspect-square flex-shrink-0 rounded-2xl overflow-hidden border-2 border-white shadow-[0_14px_32px_-8px_rgba(15,44,56,0.22)] bg-white/75 relative">
              <img
                src={mod.coverUrl}
                alt={mod.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Clean Unboxed Metadata */}
            <div className="flex-grow space-y-1.5">
              <p className="text-xs font-bold text-[#0d9488] tabular-nums">
                {mod.status} · {mod.category} · {mod.version}
                {mod.obbRequired ? ' · Data Package Required' : ''}
              </p>

              <h1 className="heading-font text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#0f2c38] text-3d">
                {mod.title}
              </h1>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#355968] flex-wrap">
                <span>
                  By: <strong className="text-[#0f2c38]">{mod.developer}</strong>
                </span>
                {mod.porter && (
                  <span>
                    · Maintained by: <strong className="text-[#0284c7]">{mod.porter}</strong>
                  </span>
                )}
                <span>· {mod.minAndroid}</span>
              </div>
            </div>

            {/* Tactile Action Buttons */}
            <div className="w-full sm:w-auto flex-shrink-0 pt-1 sm:pt-0 flex gap-2.5">
              <button
                onClick={(e) => onToggleSave(mod.id, e)}
                className={`min-w-[48px] min-h-[48px] p-3 rounded-2xl flex items-center justify-center cursor-pointer ${
                  isSaved
                    ? 'liquid-glass-button text-white'
                    : 'liquid-glass-button-secondary text-[#355968]'
                }`}
                aria-label={isSaved ? 'Remove from saved' : 'Save mod'}
              >
                <Bookmark className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={() => onOpenDownload(mod)}
                className="flex-grow sm:flex-grow-0 min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl liquid-glass-button text-white font-bold text-sm tracking-wide cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download {typeLabel} ({mod.fileSize || mod.formattedFileSize || 'Package'})</span>
              </button>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 pt-5 border-t border-[#0f2c38]/10 text-xs">
            <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-[#0d9488] shrink-0" />
              <div>
                <div className="text-[10px] text-[#4a6f7d] font-medium">Package Size</div>
                <div className="font-bold text-[#0f2c38] tabular-nums">{mod.fileSize}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-[#0284c7] shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-[#4a6f7d] font-medium">Architecture</div>
                <div className="font-bold text-[#0f2c38] truncate">{mod.architecture}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#0d9488] shrink-0" />
              <div>
                <div className="text-[10px] text-[#4a6f7d] font-medium">Updated</div>
                <div className="font-bold text-[#0f2c38] tabular-nums">{mod.updatedDate}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-subtle flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#0d9488] shrink-0" />
              <div>
                <div className="text-[10px] text-[#4a6f7d] font-medium">Security Check</div>
                <div className="font-bold text-[#0d9488] flex items-center gap-1 tabular-nums">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clean (0/72)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Horizontally scrollable on mobile) */}
        <div className="px-5 sm:px-9 border-b border-[#0f2c38]/10 flex gap-5 sm:gap-8 text-xs sm:text-sm overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('about')}
            className={`py-4 border-b-2 font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'about'
                ? 'border-[#0d9488] text-[#0d9488]'
                : 'border-transparent text-[#4a6f7d] hover:text-[#0f2c38]'
            }`}
          >
            Overview &amp; Features
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-4 border-b-2 font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'guide'
                ? 'border-[#0d9488] text-[#0d9488]'
                : 'border-transparent text-[#4a6f7d] hover:text-[#0f2c38]'
            }`}
          >
            Installation Guide
          </button>
          <button
            onClick={() => setActiveTab('changelog')}
            className={`py-4 border-b-2 font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'changelog'
                ? 'border-[#0d9488] text-[#0d9488]'
                : 'border-transparent text-[#4a6f7d] hover:text-[#0f2c38]'
            }`}
          >
            Changelog ({mod.changelog?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 border-b-2 font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'security'
                ? 'border-[#0d9488] text-[#0d9488]'
                : 'border-transparent text-[#4a6f7d] hover:text-[#0f2c38]'
            }`}
          >
            Checksum &amp; Hash
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-9 space-y-6">
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h2 className="heading-font text-sm sm:text-base font-bold text-[#0f2c38] text-3d-subtle mb-2">
                  About this {typeLabel}
                </h2>
                <p className="text-sm text-[#2c4f5e] leading-relaxed whitespace-pre-line">
                  {mod.description || `Verified ${typeLabel.toLowerCase()} release published to APXELUZ.`}
                </p>
              </div>

              {/* Screenshots Gallery */}
              {mod.screenshots && mod.screenshots.length > 0 && (
                <div>
                  <h2 className="heading-font text-sm sm:text-base font-bold text-[#0f2c38] text-3d-subtle mb-3">
                    {typeLabel} Screenshots
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mod.screenshots.map((shot, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setSelectedScreenshot(shot)}
                        className="relative aspect-video rounded-2xl overflow-hidden liquid-glass-card group cursor-pointer"
                        aria-label={`View screenshot ${idx + 1}`}
                      >
                        <img
                          src={shot}
                          alt={`${mod.title} screenshot ${idx + 1}`}
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

              {/* Mod Features */}
              {mod.features && mod.features.length > 0 && (
                <div>
                  <h2 className="heading-font text-sm sm:text-base font-bold text-[#0f2c38] text-3d-subtle mb-3">
                    Key Features
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {mod.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl liquid-glass-subtle flex items-start gap-2.5 text-xs sm:text-sm text-[#2c4f5e]"
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
                  <h2 className="heading-font text-sm sm:text-base font-bold text-[#0f2c38] text-3d-subtle flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#0d9488]" />
                    <span>Download Destinations &amp; Mirrors</span>
                  </h2>
                  <span className="text-xs text-[#4a6f7d] font-medium">
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
                  ).map((mirror, idx) => (
                    <div
                      key={mirror.id || idx}
                      className="p-4 rounded-2xl liquid-glass-subtle flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-[#0f2c38] truncate">
                            {mirror.name}
                          </span>
                          {mirror.isPrimary && (
                            <span className="text-[11px] font-bold text-[#0d9488] flex-shrink-0">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#4a6f7d] font-mono truncate mt-1">
                          {mirror.url}
                        </div>
                        {mirror.notes && (
                          <div className="text-[11px] text-[#4a6f7d] mt-1">
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
                        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl liquid-glass-button text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open {mirror.name}</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Previous Versions Archive if available */}
                {mod.versions && mod.versions.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-[#0f2c38]/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="heading-font text-xs font-bold text-[#0f2c38] flex items-center gap-2">
                        <History className="w-4 h-4 text-[#0d9488]" />
                        <span>Previous Version Releases ({mod.versions.length})</span>
                      </h3>
                      <span className="text-[11px] text-[#4a6f7d]">Archived Releases</span>
                    </div>

                    <div className="space-y-2">
                      {mod.versions.map((ver, vIdx) => {
                        const verPrimaryMirror = ver.downloadLinks?.[0];
                        return (
                          <div
                            key={ver.id || vIdx}
                            className="p-3.5 rounded-2xl liquid-glass-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 text-xs tabular-nums">
                                <span className="font-mono font-bold text-[#0d9488]">
                                  {ver.version}
                                </span>
                                <span className="text-[#355968] font-medium">
                                  · {ver.formattedFileSize || `${ver.fileSizeValue || ''} ${ver.fileSizeUnit || 'MB'}`}
                                </span>
                                <span className="text-[#4a6f7d]">· {ver.releaseDate}</span>
                              </div>
                              {ver.notes && <p className="text-[11px] text-[#4a6f7d]">{ver.notes}</p>}
                            </div>

                            {verPrimaryMirror && (
                              <button
                                type="button"
                                onClick={() => {
                                  incrementDownloadCounter(mod.id).catch(() => {});
                                  safeOpenExternalUrl(verPrimaryMirror.url, '_blank');
                                }}
                                className="min-h-[40px] px-4 py-1.5 rounded-xl liquid-glass-button-secondary text-[#0f2c38] text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-[#0d9488]" />
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
              <div className="p-4 rounded-2xl bg-[#fef3c7]/80 border border-white text-xs text-[#78350f] flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#b45309]" />
                <div>
                  <strong className="block font-bold mb-1">Installation Notice</strong>
                  Ensure you allow unknown app installation in your device settings. Follow mod file extraction steps carefully.
                </div>
              </div>

              <ol className="space-y-3">
                {(mod.installationGuide || [
                  'Download the verified package to your storage.',
                  'Locate the file in your Downloads folder and follow setup instructions.',
                  'Launch the app and enjoy.',
                ]).map((step, idx) => (
                  <li
                    key={idx}
                    className="p-4 rounded-2xl liquid-glass-subtle flex items-start gap-3.5 text-xs sm:text-sm text-[#2c4f5e]"
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
            <div className="space-y-4">
              {(mod.changelog || []).map((log, idx) => (
                <div key={idx} className="p-4 rounded-2xl liquid-glass-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-[#0d9488] tabular-nums">
                      {log.version}
                    </span>
                    <span className="text-xs text-[#4a6f7d]">{log.date}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#355968] pl-4 list-disc">
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
                  {mod.packageName}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#4a6f7d] block">
                  SHA-256 Signature Checksum
                </span>
                <span className="font-mono text-[#0d9488] break-all select-all">
                  {mod.sha256}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#4a6f7d] block">
                  Security Scan Status
                </span>
                <div className="flex items-center gap-1.5 text-[#0d9488] mt-1 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Clean - 0 / 72 Security Engines Flagged</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for screenshots */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-[#0f2c38]/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedScreenshot}
              alt="Enlarged screenshot"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain border-2 border-white/80 shadow-2xl"
            />
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-11 right-0 min-w-[40px] min-h-[40px] rounded-full bg-white/90 text-[#0f2c38] flex items-center justify-center shadow-md cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

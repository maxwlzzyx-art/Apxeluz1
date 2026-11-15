import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Server,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Game } from '../types/game';
import { isValidHttpUrl, safeOpenExternalUrl, getHostingProvider } from '../utils/urlValidation';
import { incrementDownloadCounter } from '../lib/supabaseService';
import { useScrollLock } from '../utils/useScrollLock';

interface DownloadModalProps {
  game: Game | null;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ game, onClose }) => {
  const [selectedMirrorIndex, setSelectedMirrorIndex] = useState<number>(0);
  const [redirectedUrl, setRedirectedUrl] = useState<string | null>(null);
  const [redirectedName, setRedirectedName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useScrollLock(Boolean(game));

  if (!game) return null;

  const mirrors = (game.downloadLinks && game.downloadLinks.length > 0)
    ? game.downloadLinks
    : [
        {
          id: 'primary',
          name: 'Primary Download',
          url: 'https://example.com/download/' + (game.slug || game.id),
          isPrimary: true,
          notes: 'Official external mirror',
        },
      ];

  const currentMirror = mirrors[selectedMirrorIndex] || mirrors[0];

  const handleOpenMirror = (url: string, name: string) => {
    setErrorMessage(null);

    if (!isValidHttpUrl(url)) {
      setErrorMessage(`Destination URL is not a valid HTTP/HTTPS address: ${url}`);
      return;
    }

    const success = safeOpenExternalUrl(url, '_blank');
    if (success) {
      setRedirectedUrl(url);
      setRedirectedName(name);

      incrementDownloadCounter(game.id).catch(() => {});
      try {
        fetch(`/api/items/${game.id}/download`, { method: 'POST' }).catch(() => {});
      } catch {
        // Non-blocking
      }
    } else {
      setErrorMessage('Could not open external destination. Please verify browser popup settings.');
    }
  };

  const handleCopyUrl = async (url: string) => {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/25 backdrop-blur-md overscroll-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col liquid-glass rounded-t-[28px] sm:rounded-3xl p-5 sm:p-7 overflow-hidden text-left overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-title"
      >
        <div className="w-10 h-1.5 rounded-full bg-[#0f2c38]/15 mx-auto mb-3 sm:hidden shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 min-w-[40px] min-h-[40px] p-2 rounded-2xl liquid-glass-button-secondary text-[#355968] hover:text-[#0f2c38] flex items-center justify-center cursor-pointer z-10"
          aria-label="Close download modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto custom-scrollbar overscroll-y-contain touch-pan-y flex-grow">
          {/* Modal Header */}
          <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[#0f2c38]/10 pr-10">
            <div className="w-14 h-14 aspect-square rounded-2xl overflow-hidden bg-white/70 border border-white flex-shrink-0 shadow-md">
              <img src={game.coverUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#0d9488] tabular-nums">
              {game.status} · {game.version}
            </p>
            <h2 id="download-title" className="heading-font text-lg font-extrabold text-[#0f2c38] text-3d-subtle truncate mt-0.5">
              {game.title}
            </h2>
            <p className="text-xs text-[#4a6f7d] tabular-nums">
              Size: <span className="text-[#0f2c38] font-semibold">{game.fileSize}</span> · Arch:{' '}
              <span className="text-[#0f2c38] font-semibold">{game.architecture}</span>
            </p>
          </div>
        </div>

        {/* Status notice if visitor just opened a link */}
        {redirectedUrl && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#d7f5eb]/85 border border-white text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#0b5e58] font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#0d9488]" />
                Opened: {redirectedName}
              </span>
              <button
                onClick={() => handleCopyUrl(redirectedUrl)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#0284c7] hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#0d9488]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
            <p className="text-[#355968] text-[11px] font-mono break-all line-clamp-1">
              {redirectedUrl}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#fee2e2] border border-white text-[#be123c] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Download Destinations List */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#355968]">
                Select Download Destination
              </span>
              <span className="text-[11px] text-[#4a6f7d] tabular-nums">
                {mirrors.length} {mirrors.length === 1 ? 'Mirror' : 'Mirrors'}
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {mirrors.map((mirror, idx) => {
                const isSelected = selectedMirrorIndex === idx;
                const hosting = getHostingProvider(mirror.url, mirror.name);

                return (
                  <div
                    key={mirror.id || idx}
                    onClick={() => setSelectedMirrorIndex(idx)}
                    className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-xs cursor-pointer tactile-press ${
                      isSelected
                        ? 'bg-[#D6F2EE] border border-[#0D9488]/45 text-[#10242E] shadow-[0_6px_14px_-6px_rgba(13,148,136,0.22)]'
                        : 'liquid-glass-subtle text-[#10242E]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isSelected
                            ? 'bg-[#0d9488] text-white'
                            : 'bg-white/80 text-[#4a6f7d] border border-white'
                        }`}
                      >
                        <Server className="w-4 h-4" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#0f2c38] truncate">{mirror.name}</span>
                          <span className="text-[10px] text-[#4a6f7d] font-medium">
                            · {hosting.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#4a6f7d] font-mono truncate max-w-[210px] sm:max-w-[260px]">
                          {mirror.url}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMirrorIndex(idx);
                        handleOpenMirror(mirror.url, mirror.name);
                      }}
                      className="min-w-[40px] min-h-[40px] p-2 rounded-xl liquid-glass-button-secondary text-[#0d9488] flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="Open external download destination in new tab"
                      aria-label={`Open ${mirror.name}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security & Integrity Note */}
          <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#355968]">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0d9488]" />
                <span>Redirect Security</span>
              </span>
              <span className="text-[#0d9488] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified HTTP/HTTPS</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[#355968]">
              <span className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#4a6f7d]" />
                <span>Package Target</span>
              </span>
              <span className="font-mono text-[#0f2c38] truncate max-w-[200px]">
                {game.downloadFilename || `${game.slug}.apk`}
              </span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-1">
            <button
              onClick={() => handleOpenMirror(currentMirror.url, currentMirror.name)}
              className="w-full min-h-[48px] flex items-center justify-center gap-2.5 py-3.5 rounded-2xl liquid-glass-button text-white font-bold text-sm tracking-wide cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              <span>Open {currentMirror.name} ({game.fileSize})</span>
            </button>
            <p className="text-[11px] text-center text-[#4a6f7d] mt-2">
              Opens the destination page in a new browser tab.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

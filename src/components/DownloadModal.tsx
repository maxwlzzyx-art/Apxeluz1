import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Server,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import { Game } from '../types/game';
import { isValidHttpUrl, safeOpenExternalUrl, getHostingProvider } from '../utils/urlValidation';
import { incrementDownloadCounter } from '../lib/supabaseService';

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

  if (!game) return null;

  // Normalized download mirrors from game data or admin saved links
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

    // Safely open the actual destination URL in a new browser tab
    // No blobs, no fetch, no download attribute
    const success = safeOpenExternalUrl(url, '_blank');
    if (success) {
      setRedirectedUrl(url);
      setRedirectedName(name);

      // Increment Cloud Firestore download metric atomically
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#040714]/80 backdrop-blur-[24px] saturate-[180%] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg liquid-glass rounded-3xl border border-white/20 shadow-2xl p-6 sm:p-7 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-2xl liquid-glass-subtle hover:bg-white/20 text-slate-300 hover:text-white border border-white/15 transition-colors"
          aria-label="Close download modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/10">
          <div className="w-14 h-18 rounded-2xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0 shadow-lg">
            <img src={game.coverUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-[#0A84FF] bg-[#0A84FF]/20 px-2.5 py-0.5 rounded-full border border-[#0A84FF]/30">
                {game.status}
              </span>
              <span className="font-mono text-xs text-slate-300">{game.version}</span>
            </div>
            <h3 id="download-title" className="heading-font text-lg font-bold text-white mt-1">
              {game.title}
            </h3>
            <p className="text-xs text-slate-400">
              File Size: <span className="text-white font-medium">{game.fileSize}</span> • Arch:{' '}
              <span className="text-white font-medium">{game.architecture}</span>
            </p>
          </div>
        </div>

        {/* Status notice if visitor just opened a link */}
        {redirectedUrl && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/30 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-white font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#0A84FF]" />
                Opened: {redirectedName}
              </span>
              <button
                onClick={() => handleCopyUrl(redirectedUrl)}
                className="flex items-center gap-1 text-[11px] text-[#0A84FF] hover:underline"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
            <p className="text-slate-300 text-[11px] font-mono break-all line-clamp-1">
              {redirectedUrl}
            </p>
            <p className="text-slate-400 text-[11px]">
              Destination opened in a new tab. External hosting service handles the file download directly.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Download Destinations List */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Select Download Destination
              </label>
              <span className="text-[11px] text-slate-400">
                {mirrors.length} {mirrors.length === 1 ? 'Mirror' : 'Mirrors'} Available
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {mirrors.map((mirror, idx) => {
                const isSelected = selectedMirrorIndex === idx;
                const hosting = getHostingProvider(mirror.url, mirror.name);

                return (
                  <div
                    key={mirror.id || idx}
                    onClick={() => setSelectedMirrorIndex(idx)}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0A84FF]/20 to-[#BF5AF2]/20 border-[#0A84FF]/60 text-white shadow-[0_4px_18px_rgba(10,132,255,0.25)]'
                        : 'liquid-glass-subtle hover:bg-white/10 text-slate-300 hover:text-white border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-[#0A84FF]/30 text-white' : 'bg-white/5 text-slate-400'}`}>
                        <Server className="w-4 h-4" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">{mirror.name}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                            {hosting.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[240px] sm:max-w-[280px]">
                          {mirror.url}
                        </div>
                        {mirror.notes && (
                          <div className="text-[10px] text-slate-400 italic">
                            {mirror.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {mirror.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0A84FF]/30 text-[#0A84FF] border border-[#0A84FF]/40">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMirrorIndex(idx);
                          handleOpenMirror(mirror.url, mirror.name);
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-[#0A84FF] text-slate-300 hover:text-white transition-colors"
                        title="Open external download destination in new tab"
                        aria-label={`Open ${mirror.name}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security & Integrity Note */}
          <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0A84FF]" />
                <span>Redirect Security:</span>
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified HTTP/HTTPS</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-slate-400" />
                <span>Package Target:</span>
              </span>
              <span className="font-mono text-slate-300 truncate max-w-[220px]">
                {game.downloadFilename || `${game.slug}.apk`}
              </span>
            </div>
          </div>

          {/* Primary Action Button: Opens actual destination URL */}
          <div className="pt-1">
            <button
              onClick={() => handleOpenMirror(currentMirror.url, currentMirror.name)}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl liquid-glass-button text-white font-bold text-sm tracking-wide transition-all shadow-[0_4px_24px_rgba(10,132,255,0.4)] active:scale-95"
            >
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              <span>Open {currentMirror.name} ({game.fileSize})</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Opens the destination page in a new browser tab. No automated file forcing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

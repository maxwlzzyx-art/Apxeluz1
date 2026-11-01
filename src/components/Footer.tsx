import React, { useState } from 'react';
import { Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

  const openLegalModal = (type: 'privacy' | 'terms') => {
    switch (type) {
      case 'privacy':
        setModalContent({
          title: 'Privacy Policy',
          body: 'APXELUZ operates with zero trackers, zero data harvesting, and zero third-party advertising cookies. Saved items and preferences are stored exclusively on your local device.',
        });
        break;
      case 'terms':
        setModalContent({
          title: 'Terms of Service & DMCA',
          body: 'All trademarks, logos, and original game assets belong to their respective copyright holders. APXELUZ indexes community-submitted modifications and packages with integrity verification. We urge users to support original creators by owning legitimate software copies.',
        });
        break;
    }
  };

  return (
    <footer className="w-full bg-[#080c1f]/40 backdrop-blur-[24px] saturate-[180%] border-t border-white/10 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* APXELUZ Branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-white/20 via-white/10 to-transparent border border-white/25 flex items-center justify-center text-[#0A84FF] shadow-[0_4px_16px_rgba(10,132,255,0.25)]">
              <Layers className="w-4 h-4 text-[#0A84FF]" />
            </div>
            <span className="heading-font font-bold text-base tracking-tight text-white">
              APXE<span className="bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2] bg-clip-text text-transparent">LUZ</span>
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">•</span>
            <span className="text-xs text-slate-400 hidden sm:inline">App & Mod Repository</span>
          </div>

          {/* Legal Policies */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => openLegalModal('privacy')}
              className="hover:text-[#0A84FF] transition-colors"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => openLegalModal('terms')}
              className="hover:text-[#0A84FF] transition-colors"
            >
              Terms of Service & DMCA
            </button>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} APXELUZ.
          </div>
        </div>
      </div>

      {/* Info Dialog */}
      {modalContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040714]/80 backdrop-blur-xl"
          onClick={() => setModalContent(null)}
        >
          <div
            className="w-full max-w-md liquid-glass rounded-3xl border border-white/20 p-6 sm:p-7 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-font text-lg font-bold text-white uppercase tracking-wider mb-3">
              {modalContent.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {modalContent.body}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setModalContent(null)}
                className="px-5 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

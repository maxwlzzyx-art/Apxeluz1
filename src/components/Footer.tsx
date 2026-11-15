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
    <footer className="w-full bg-white/55 backdrop-blur-2xl saturate-150 border-t border-white/80 mt-10 pt-7 pb-24 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* APXELUZ Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff] border border-white/95 flex items-center justify-center text-[#0d9488] shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <span className="heading-font font-extrabold text-base tracking-tight text-[#0f2c38]">
              APXE<span className="text-[#0d9488]">LUZ</span>
            </span>
            <span className="text-xs text-[#648b99] hidden sm:inline">·</span>
            <span className="text-xs text-[#4a6f7d] hidden sm:inline">App &amp; Mod Repository</span>
          </div>

          {/* Legal Policies */}
          <div className="flex items-center gap-3 text-xs font-medium text-[#4a6f7d]">
            <button
              onClick={() => openLegalModal('privacy')}
              className="min-h-[36px] px-2 hover:text-[#0d9488] transition-colors cursor-pointer tactile-press"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => openLegalModal('terms')}
              className="min-h-[36px] px-2 hover:text-[#0d9488] transition-colors cursor-pointer tactile-press"
            >
              Terms of Service &amp; DMCA
            </button>
          </div>

          {/* Copyright */}
          <div className="text-xs text-[#5c7f8c]">
            © {new Date().getFullYear()} APXELUZ.
          </div>
        </div>
      </div>

      {/* Mobile-Friendly Frosted Bottom Sheet / Info Dialog */}
      {modalContent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0f2c38]/25 backdrop-blur-md"
          onClick={() => setModalContent(null)}
        >
          <div
            className="w-full max-w-md liquid-glass rounded-t-[28px] sm:rounded-3xl p-6 sm:p-7 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-[#0f2c38]/15 mx-auto mb-4 sm:hidden" />
            <h2 className="heading-font text-lg font-bold text-[#0f2c38] text-3d-subtle mb-3">
              {modalContent.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#355968] leading-relaxed whitespace-pre-line">
              {modalContent.body}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalContent(null)}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl liquid-glass-button text-white font-bold text-xs cursor-pointer"
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

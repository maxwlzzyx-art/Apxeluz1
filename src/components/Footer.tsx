import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { useScrollLock } from '../utils/useScrollLock';
import { useSwipeToClose } from '../utils/useSwipeToClose';

const WEB_PROFILE_ICON_URL =
  'https://cdn.phototourl.com/anon/2026-11-15-95ccde76-958a-450f-91b0-60424cee492b.jpg';

interface FooterProps {
  onNavigateGuides?: () => void;
  onNavigatePremium?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateGuides,
  onNavigatePremium,
}) => {
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);
  const { sheetMotionClass, handleBarClass, dragHandlers } = useSwipeToClose(
    () => setModalContent(null),
    Boolean(modalContent)
  );
  const [profileIconFailed, setProfileIconFailed] = useState(false);

  useScrollLock(Boolean(modalContent));

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
    <footer className="w-full liquid-glass-navbar border-t mt-10 pt-7 pb-24 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* APXELUZ Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#D6F2EE] border border-[#D3DDE3] flex items-center justify-center text-[#0D9488] shadow-sm">
              {!profileIconFailed ? (
                <img
                  src={WEB_PROFILE_ICON_URL}
                  alt="APXELUZ Profile"
                  referrerPolicy="no-referrer"
                  onError={() => setProfileIconFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Layers className="w-4 h-4" />
              )}
            </div>
            <span className="heading-font font-extrabold text-base tracking-tight text-[#0f2c38]">
              APXE<span className="text-[#0d9488]">LUZ</span>
            </span>
            <span className="text-xs text-[#648b99] hidden sm:inline">·</span>
            <span className="text-xs text-[#4a6f7d] hidden sm:inline">Curated by Axeluf</span>
          </div>

          {/* Site & Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs font-medium text-[#4a6f7d]">
            <a
              href="/guides"
              onClick={(e) => {
                if (onNavigateGuides && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  onNavigateGuides();
                }
              }}
              className="min-h-[36px] px-2 inline-flex items-center hover:text-[#0d9488] transition-colors"
            >
              Guides
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="/premium"
              onClick={(e) => {
                if (onNavigatePremium && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  onNavigatePremium();
                }
              }}
              className="min-h-[36px] px-2 inline-flex items-center hover:text-[#0d9488] transition-colors"
            >
              Premium
            </a>
            <span aria-hidden="true">·</span>
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
            © {new Date().getFullYear()} APXELUZ · Axeluf
          </div>
        </div>
      </div>

      {/* Mobile-Friendly Frosted Bottom Sheet / Info Dialog */}
      {modalContent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#10242E]/30 backdrop-blur-md overscroll-none backdrop-entrance"
          onClick={() => setModalContent(null)}
        >
          <div
            className={`w-full max-w-md liquid-glass rounded-t-[28px] sm:rounded-3xl p-6 sm:p-7 pt-2 sm:pt-3 text-left overscroll-y-contain sheet-entrance ${sheetMotionClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              {...dragHandlers}
              className="w-full py-2.5 flex justify-center touch-none select-none cursor-grab active:cursor-grabbing mb-1"
              title="Geser ke bawah untuk menutup"
            >
              <div className={handleBarClass} />
            </div>
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

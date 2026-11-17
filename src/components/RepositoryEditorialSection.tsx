import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  CURATOR_FAQS,
  CURATOR_PROFILE,
  EDITORIAL_GUIDES,
} from '../data/editorialContent';

interface RepositoryEditorialSectionProps {
  onOpenGuidesIndex: () => void;
  onSelectGuide: (slug: string) => void;
}

export const RepositoryEditorialSection: React.FC<RepositoryEditorialSectionProps> = ({
  onOpenGuidesIndex,
  onSelectGuide,
}) => {
  const [openFaqId, setOpenFaqId] = useState<string>(CURATOR_FAQS[0]?.id || '');

  return (
    <div className="space-y-6 sm:space-y-8 pt-2">
      {/* 1. Founder & Curator Voice + Verification Standards */}
      <section
        aria-labelledby="curator-standards-heading"
        className="liquid-glass rounded-3xl p-5 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
              <UserCheck className="w-4 h-4" />
              <span>Maintainer Note</span>
              <span aria-hidden="true">·</span>
              <span>
                {CURATOR_PROFILE.curatorName} ({CURATOR_PROFILE.curatorTitle})
              </span>
            </div>

            <h2
              id="curator-standards-heading"
              className="heading-font text-lg sm:text-2xl font-extrabold text-[#10242E] text-3d-subtle leading-snug text-balance"
            >
              {CURATOR_PROFILE.headline}
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm text-[#4A6270] leading-relaxed">
              {CURATOR_PROFILE.storyParagraphs.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-2.5">
            {CURATOR_PROFILE.commitments.map((item, idx) => (
              <div
                key={idx}
                className="recessed-well rounded-2xl p-3.5 sm:p-4 space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#10242E]">
                  <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span>{item.title}</span>
                </div>
                <p className="text-xs text-[#4A6270] leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Substantive Technical Guides & Field Notes */}
      <section aria-labelledby="repository-guides-heading" className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#DBEAF6] border border-[#D3DDE3] flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(16,36,46,0.12)]">
              <BookOpen className="w-4 h-4 text-[#1D6FA5]" />
            </div>
            <div>
              <h2
                id="repository-guides-heading"
                className="heading-font text-base sm:text-lg font-bold tracking-tight text-[#10242E] text-3d-subtle"
              >
                Guides &amp; Verification Notes
              </h2>
            </div>
          </div>

          <a
            href="/guides"
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                onOpenGuidesIndex();
              }
            }}
            className="min-h-[40px] px-2 flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#1D6FA5] transition-colors tactile-press"
          >
            <span>All guides</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {EDITORIAL_GUIDES.map((guide) => (
            <a
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  onSelectGuide(guide.slug);
                }
              }}
              className="liquid-glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3 text-left"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#4A6270] font-medium">
                  <span className="font-bold text-[#0F766E]">{guide.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{guide.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{guide.readingTimeMinutes} min read</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#10242E] leading-snug">
                  {guide.title}
                </h3>
                <p className="text-xs text-[#4A6270] leading-relaxed line-clamp-2">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[#10242E]/10 flex items-center justify-between text-xs font-bold text-[#1D6FA5]">
                <span>Read verification note</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 3. Technical FAQ Accordion */}
      <section
        aria-labelledby="repository-faq-heading"
        className="liquid-glass rounded-3xl p-5 sm:p-7 space-y-4"
      >
        <h2
          id="repository-faq-heading"
          className="heading-font text-base sm:text-lg font-bold text-[#10242E] text-3d-subtle"
        >
          Verification &amp; Installation FAQ
        </h2>

        <div className="divide-y divide-[#D3DDE3]">
          {CURATOR_FAQS.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div key={faq.id} className="py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
                  aria-expanded={isOpen}
                  className="w-full min-h-[40px] flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-bold text-[#10242E] hover:text-[#0D9488] transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#4A6270] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#0D9488]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="pt-2 text-xs sm:text-sm text-[#4A6270] leading-relaxed">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

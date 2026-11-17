import React from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  Clock,
} from 'lucide-react';
import {
  CURATOR_PROFILE,
  EDITORIAL_GUIDES,
  EditorialGuide,
} from '../data/editorialContent';

interface GuidesViewProps {
  activeSlug?: string;
  onSelectGuide: (slug: string) => void;
  onNavigateHome: () => void;
  onNavigatePremium: () => void;
}

export const GuidesView: React.FC<GuidesViewProps> = ({
  activeSlug,
  onSelectGuide,
  onNavigateHome,
  onNavigatePremium,
}) => {
  const activeGuide: EditorialGuide | undefined = activeSlug
    ? EDITORIAL_GUIDES.find((g) => g.slug === activeSlug)
    : undefined;

  if (activeGuide) {
    const relatedGuides = EDITORIAL_GUIDES.filter((g) => g.slug !== activeGuide.slug);

    return (
      <article className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#4A6270]">
          <a
            href="/"
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            className="hover:text-[#0D9488] font-medium transition-colors"
          >
            Discover
          </a>
          <span aria-hidden="true">/</span>
          <a
            href="/guides"
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                onSelectGuide('');
              }
            }}
            className="hover:text-[#0D9488] font-medium transition-colors"
          >
            Guides &amp; Field Notes
          </a>
          <span aria-hidden="true">/</span>
          <span className="text-[#10242E] font-semibold truncate">{activeGuide.category}</span>
        </nav>

        {/* Main Article Card */}
        <div className="liquid-glass rounded-3xl p-5 sm:p-9 space-y-6">
          <header className="space-y-3 border-b border-[#D3DDE3] pb-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A6270] font-medium">
              <span className="font-bold text-[#0F766E]">{activeGuide.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>By {activeGuide.authorName}</span>
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={activeGuide.updatedAt}>Updated {activeGuide.updatedAt}</time>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#1D6FA5]" />
                <span>{activeGuide.readingTimeMinutes} min read</span>
              </span>
            </div>

            <h1 className="heading-font text-2xl sm:text-3xl font-extrabold text-[#10242E] text-3d leading-tight text-balance">
              {activeGuide.title}
            </h1>

            <p className="text-sm sm:text-base text-[#4A6270] leading-relaxed">
              {activeGuide.subtitle}
            </p>
          </header>

          {/* Key Takeaways */}
          <section className="recessed-well rounded-2xl p-4 sm:p-5 space-y-2.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#10242E] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
              <span>Summary &amp; Key Takeaways</span>
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-[#10242E]">
              {activeGuide.keyTakeaways.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Article Body Sections */}
          <div className="space-y-6">
            {activeGuide.sections.map((section, idx) => (
              <section key={idx} className="space-y-3">
                <h2 className="heading-font text-lg sm:text-xl font-bold text-[#10242E]">
                  {section.heading}
                </h2>
                {section.paragraphs.map((para, pIdx) => (
                  <p key={pIdx} className="text-sm text-[#4A6270] leading-relaxed">
                    {para}
                  </p>
                ))}
                {section.checklist && section.checklist.length > 0 && (
                  <ol className="space-y-2 pt-1 pl-1">
                    {section.checklist.map((step, sIdx) => (
                      <li
                        key={sIdx}
                        className="flex items-start gap-3 text-xs sm:text-sm text-[#10242E] bg-white/75 border border-[#D3DDE3] rounded-2xl px-3.5 py-2.5"
                      >
                        <span className="w-5 h-5 rounded-lg bg-[#D6F2EE] text-[#0F766E] font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                          {sIdx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>

          {/* Action Footer */}
          <footer className="pt-5 border-t border-[#D3DDE3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <a
              href="/guides"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  onSelectGuide('');
                }
              }}
              className="min-h-[42px] px-4 py-2 rounded-2xl liquid-glass-button-secondary text-xs font-bold text-[#10242E] inline-flex items-center justify-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>All Technical Guides</span>
            </a>

            <div className="flex items-center gap-2.5">
              <a
                href="/"
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    onNavigateHome();
                  }
                }}
                className="min-h-[42px] px-4 py-2 rounded-2xl liquid-glass-button text-white text-xs font-bold inline-flex items-center justify-center"
              >
                Browse Verified Releases
              </a>
            </div>
          </footer>
        </div>

        {/* Related Guides */}
        <section className="space-y-3">
          <h2 className="heading-font text-base sm:text-lg font-bold text-[#10242E]">
            More Field Notes from {CURATOR_PROFILE.curatorName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {relatedGuides.map((g) => (
              <a
                key={g.slug}
                href={`/guides/${g.slug}`}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    onSelectGuide(g.slug);
                  }
                }}
                className="liquid-glass-card rounded-2xl p-4 flex flex-col justify-between gap-3 text-left"
              >
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#0F766E]">
                    {g.category} · {g.readingTimeMinutes} min
                  </div>
                  <h3 className="text-sm font-bold text-[#10242E] leading-snug line-clamp-2">
                    {g.title}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1D6FA5]">
                  <span>Read guide</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </a>
            ))}
          </div>
        </section>
      </article>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Guides Directory Hero */}
      <section className="liquid-glass rounded-3xl p-5 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
            <BookOpen className="w-4 h-4" />
            <span>APXELUZ Engineering &amp; Verification Notebook</span>
            <span aria-hidden="true">·</span>
            <span>Maintained by {CURATOR_PROFILE.curatorName}</span>
          </div>
          <h1 className="heading-font text-2xl sm:text-3xl font-extrabold text-[#10242E] text-3d leading-tight text-balance">
            Android Modding Guides, SHA-256 Audits &amp; Compatibility Notes
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6270] leading-relaxed">
            Practical documentation on package integrity, ARM64 vs ARM32 chip matching, OBB folder placement on Android 12–15, and framerate tuning across community ports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="/premium"
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                onNavigatePremium();
              }
            }}
            className="min-h-[42px] px-4 py-2 rounded-2xl liquid-glass-button-secondary text-xs font-bold text-[#10242E] inline-flex items-center justify-center"
          >
            Explore Premium Ports
          </a>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            className="liquid-glass-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4 text-left"
          >
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A6270] font-medium">
                <span className="font-bold text-[#0F766E]">{guide.category}</span>
                <span aria-hidden="true">·</span>
                <span>{guide.authorName}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={guide.updatedAt}>{guide.updatedAt}</time>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{guide.readingTimeMinutes} min read</span>
              </div>

              <h2 className="heading-font text-base sm:text-lg font-extrabold text-[#10242E] leading-snug">
                {guide.title}
              </h2>

              <p className="text-xs sm:text-sm text-[#4A6270] leading-relaxed">
                {guide.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-[#10242E]/10 flex items-center justify-between text-xs font-bold text-[#0D9488]">
              <span>Read full guide</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </a>
        ))}
      </section>
    </div>
  );
};

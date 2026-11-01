import React, { useRef } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Sword,
  Compass,
  Layers,
  Shield,
  Cpu,
  Gauge,
  Trophy,
  Boxes,
  FolderOpen,
} from 'lucide-react';
import { HOT_CATEGORIES } from '../data/games';
import { GameCategory } from '../types/game';

interface HotCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onSeeMore?: () => void;
  categories?: typeof HOT_CATEGORIES;
}

export const HotCategories: React.FC<HotCategoriesProps> = ({
  selectedCategory,
  onSelectCategory,
  onSeeMore,
  categories = HOT_CATEGORIES,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sword':
        return <Sword className="w-4 h-4 text-[#0A84FF]" />;
      case 'Compass':
        return <Compass className="w-4 h-4 text-[#BF5AF2]" />;
      case 'Layers':
        return <Layers className="w-4 h-4 text-[#0A84FF]" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-[#BF5AF2]" />;
      case 'Shield':
        return <Shield className="w-4 h-4 text-[#0A84FF]" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-[#BF5AF2]" />;
      case 'Gauge':
        return <Gauge className="w-4 h-4 text-[#0A84FF]" />;
      case 'Trophy':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'Boxes':
      default:
        return <Boxes className="w-4 h-4 text-[#0A84FF]" />;
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0A84FF]/20 to-[#BF5AF2]/20 border border-white/20 flex items-center justify-center text-[#0A84FF] shadow-[0_2px_12px_rgba(10,132,255,0.25)]">
            <Sparkles className="w-4 h-4 text-[#0A84FF]" />
          </div>
          <h2 className="heading-font text-base sm:text-lg font-bold tracking-tight text-white uppercase flex items-center gap-2">
            HOT CATEGORIES
          </h2>
        </div>

        {categories && categories.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => handleScroll('left')}
                className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-all"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-all"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onSeeMore}
              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-[#0A84FF] transition-colors group"
              aria-label="See more categories"
            >
              <span>See all</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Category Content: Either Empty State or Scrollable Cards */}
      {(!categories || categories.length === 0) ? (
        /* Elegant Liquid Glass Empty State */
        <div className="p-6 rounded-3xl liquid-glass border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#0A84FF] shadow-[0_0_20px_rgba(10,132,255,0.2)]">
              <FolderOpen className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">No Categories Configured</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Categories are currently cleared. Content collections will populate dynamically.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 text-slate-300 border border-white/15">
              Ready for Additions
            </span>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 pt-0.5"
        >
          {/* All button */}
          <button
            onClick={() => onSelectCategory('All')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all duration-300 ${
              selectedCategory === 'All'
                ? 'bg-gradient-to-r from-[#0A84FF]/25 to-[#BF5AF2]/25 border-[#0A84FF]/60 text-white shadow-[0_4px_18px_rgba(10,132,255,0.3)]'
                : 'liquid-glass-subtle text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            aria-label="All Categories"
          >
            <span className="w-2 h-2 rounded-full bg-[#0A84FF] shadow-[0_0_8px_#0A84FF]"></span>
            <span>All Categories</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isSelected ? 'All' : cat.id)}
                className={`flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-300 group ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0A84FF]/25 to-[#BF5AF2]/25 border-[#0A84FF]/60 text-white shadow-[0_4px_18px_rgba(10,132,255,0.3)]'
                    : 'liquid-glass-card text-slate-200 hover:text-white'
                }`}
                aria-label={`Filter by ${cat.name}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-[#0A84FF]'
                      : 'bg-white/10 text-slate-300 group-hover:text-[#0A84FF]'
                  }`}
                >
                  {getCategoryIcon(cat.icon)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold leading-tight">{cat.name}</span>
                  <span className="text-[10px] text-slate-400 leading-tight font-normal">
                    {cat.count} items
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

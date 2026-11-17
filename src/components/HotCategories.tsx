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
import { HotCategoriesSkeleton } from './GameCardSkeleton';

interface HotCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onSeeMore?: () => void;
  categories?: typeof HOT_CATEGORIES;
  isLoading?: boolean;
}

export const HotCategories: React.FC<HotCategoriesProps> = ({
  selectedCategory,
  onSelectCategory,
  onSeeMore,
  categories = HOT_CATEGORIES,
  isLoading = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sword':
        return <Sword className="w-4 h-4 text-[#0d9488]" />;
      case 'Compass':
        return <Compass className="w-4 h-4 text-[#0284c7]" />;
      case 'Layers':
        return <Layers className="w-4 h-4 text-[#0d9488]" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-[#0284c7]" />;
      case 'Shield':
        return <Shield className="w-4 h-4 text-[#0d9488]" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-[#0284c7]" />;
      case 'Gauge':
        return <Gauge className="w-4 h-4 text-[#0d9488]" />;
      case 'Trophy':
        return <Trophy className="w-4 h-4 text-[#b45309]" />;
      case 'Boxes':
      default:
        return <Boxes className="w-4 h-4 text-[#0d9488]" />;
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#D6F2EE] border border-[#D3DDE3] flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(16,36,46,0.12)]">
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
          </div>
          <h2 className="heading-font text-base sm:text-lg font-bold tracking-tight text-[#10242E] text-3d-subtle">
            Hot Categories
          </h2>
        </div>

        {categories && categories.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => handleScroll('left')}
                className="p-2 rounded-xl liquid-glass-button-secondary text-[#4A6270] hover:text-[#10242E] cursor-pointer"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="p-2 rounded-xl liquid-glass-button-secondary text-[#4A6270] hover:text-[#10242E] cursor-pointer"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onSeeMore && (
              <button
                onClick={onSeeMore}
                className="min-h-[40px] px-2 flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#1D6FA5] transition-colors group cursor-pointer tactile-press"
                aria-label="See more categories"
              >
                <span>See all</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Category Content */}
      {isLoading && (!categories || categories.length === 0) ? (
        <HotCategoriesSkeleton />
      ) : !categories || categories.length === 0 ? (
        <div className="p-5 sm:p-6 rounded-3xl liquid-glass flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E3F2F0] border border-[#D3DDE3] flex items-center justify-center text-[#0D9488] shadow-sm">
              <FolderOpen className="w-6 h-6 stroke-[1.6]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#10242E]">No Categories Configured</h3>
              <p className="text-xs text-[#4A6270] mt-0.5">
                Categories will appear automatically as collections are added.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar mobile-scroll-row scroll-smooth pb-2 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
        >
          {/* All Categories Interactive Filter Tab */}
          <button
            onClick={() => onSelectCategory('All')}
            className={`snap-start flex-shrink-0 min-h-[46px] flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer tactile-press whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'liquid-glass-button text-white'
                : 'liquid-glass-button-secondary text-[#10242E]'
            }`}
            aria-label="All Categories"
          >
            <span>All Categories</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isSelected ? 'All' : cat.id)}
                className={`snap-start flex-shrink-0 min-h-[46px] flex items-center gap-2.5 px-3.5 py-2 rounded-2xl cursor-pointer group ${
                  isSelected
                    ? 'liquid-glass-button text-white'
                    : 'liquid-glass-card text-[#10242E]'
                }`}
                aria-label={`Filter by ${cat.name}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'recessed-well'
                  }`}
                >
                  {getCategoryIcon(cat.icon)}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold whitespace-nowrap">{cat.name}</span>
                  <span
                    className={`text-[11px] tabular-nums font-medium ${
                      isSelected ? 'text-white/90' : 'text-[#4A6270]'
                    }`}
                  >
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

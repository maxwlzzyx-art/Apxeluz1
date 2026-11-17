import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft, Package, Zap, Trophy, Sparkles, Inbox, Plus } from 'lucide-react';
import { Game } from '../types/game';
import { GameCard } from './GameCard';
import { GameCardSkeleton } from './GameCardSkeleton';
import { getSkeletonCountForLayout } from '../utils/loadingState';

interface GameRowProps {
  title: string;
  iconType: 'package' | 'lightning' | 'trophy' | 'sparkles';
  games: Game[];
  onSelectGame: (game: Game) => void;
  onSeeMore?: () => void;
  savedGameIds: Set<string>;
  onToggleSave: (gameId: string, e: React.MouseEvent) => void;
  showRanking?: boolean;
  emptyMessage?: string;
  onAddContent?: () => void;
  isLoading?: boolean;
}

export const GameRow: React.FC<GameRowProps> = ({
  title,
  iconType,
  games,
  onSelectGame,
  onSeeMore,
  savedGameIds,
  onToggleSave,
  showRanking = false,
  emptyMessage = 'No items currently in this section. Ready for new releases.',
  onAddContent,
  isLoading = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getSectionIcon = () => {
    switch (iconType) {
      case 'package':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#D6F2EE] border border-[#D3DDE3] flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(16,36,46,0.12)]">
            <Package className="w-4 h-4 text-[#0D9488]" />
          </div>
        );
      case 'lightning':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#DBEAF6] border border-[#D3DDE3] flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(16,36,46,0.12)]">
            <Zap className="w-4 h-4 text-[#1D6FA5]" />
          </div>
        );
      case 'trophy':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/40 flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(16,36,46,0.12)]">
            <Trophy className="w-4 h-4 text-[#7C4A03]" />
          </div>
        );
      case 'sparkles':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-[#E4EFF8] border border-[#D3DDE3] flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(16,36,46,0.12)]">
            <Sparkles className="w-4 h-4 text-[#1D6FA5]" />
          </div>
        );
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          {getSectionIcon()}
          <h2 className="heading-font text-base sm:text-lg font-bold tracking-tight text-[#10242E] text-3d-subtle">
            {title}
          </h2>
          {isLoading && games.length === 0 ? (
            <span
              aria-hidden="true"
              className="inline-block h-4 w-7 rounded-md liquid-glass-skeleton-slot"
            />
          ) : (
            <span className="text-xs text-[#4A6270] font-medium tabular-nums">
              ({games.length})
            </span>
          )}
        </div>

        {games.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-xl liquid-glass-button-secondary text-[#4A6270] hover:text-[#10242E] cursor-pointer"
                aria-label={`Scroll ${title} left`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-xl liquid-glass-button-secondary text-[#4A6270] hover:text-[#10242E] cursor-pointer"
                aria-label={`Scroll ${title} right`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onSeeMore && (
              <button
                onClick={onSeeMore}
                className="min-h-[40px] px-2 flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#1D6FA5] transition-colors group cursor-pointer tactile-press"
                aria-label={`See more ${title}`}
              >
                <span>See all</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area: Skeleton Loader, Empty State, or Cards */}
      {isLoading && games.length === 0 ? (
        <div
          role="status"
          aria-busy="true"
          aria-label={`Loading ${title}`}
          data-testid={`skeleton-row-${iconType}`}
          className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar mobile-scroll-row pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          <span className="sr-only">Loading {title}</span>
          {Array.from({ length: getSkeletonCountForLayout('row') }).map((_, idx) => (
            <GameCardSkeleton key={idx} showRanking={showRanking} />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="p-5 sm:p-7 rounded-3xl liquid-glass flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E3F2F0] border border-[#D3DDE3] flex items-center justify-center text-[#0D9488] shadow-sm">
              <Inbox className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#10242E]">No {title.toLowerCase()} currently available</h3>
              <p className="text-xs text-[#4A6270] mt-0.5 max-w-md">
                {emptyMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAddContent ? (
              <button
                onClick={onAddContent}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl liquid-glass-button text-xs font-bold text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Item</span>
              </button>
            ) : (
              <span className="text-xs font-medium text-[#4a6f7d]">
                Awaiting Content
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar mobile-scroll-row scroll-smooth pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
        >
          {games.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              onSelect={onSelectGame}
              isSaved={savedGameIds.has(game.id)}
              onToggleSave={onToggleSave}
              ranking={showRanking ? index + 1 : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
};

import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft, Package, Zap, Trophy, Sparkles, Inbox, Plus } from 'lucide-react';
import { Game } from '../types/game';
import { GameCard } from './GameCard';

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
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getSectionIcon = () => {
    switch (iconType) {
      case 'package':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff] border border-white/90 flex items-center justify-center shadow-[0_4px_10px_-3px_rgba(13,148,136,0.18),inset_0_1px_0_rgba(255,255,255,0.95)]">
            <Package className="w-4 h-4 text-[#0d9488]" />
          </div>
        );
      case 'lightning':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#dff1ff] to-[#d7f5eb] border border-white/90 flex items-center justify-center shadow-[0_4px_10px_-3px_rgba(2,132,199,0.18),inset_0_1px_0_rgba(255,255,255,0.95)]">
            <Zap className="w-4 h-4 text-[#0284c7]" />
          </div>
        );
      case 'trophy':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#fef3c7] to-[#e0f2fe] border border-white/90 flex items-center justify-center shadow-[0_4px_10px_-3px_rgba(180,83,9,0.16),inset_0_1px_0_rgba(255,255,255,0.95)]">
            <Trophy className="w-4 h-4 text-[#b45309]" />
          </div>
        );
      case 'sparkles':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff] border border-white/90 flex items-center justify-center shadow-[0_4px_10px_-3px_rgba(2,132,199,0.18),inset_0_1px_0_rgba(255,255,255,0.95)]">
            <Sparkles className="w-4 h-4 text-[#0284c7]" />
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
          <h2 className="heading-font text-base sm:text-lg font-bold tracking-tight text-[#0f2c38] text-3d-subtle">
            {title}
          </h2>
          <span className="text-xs text-[#4a6f7d] font-medium tabular-nums">
            ({games.length})
          </span>
        </div>

        {games.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-xl liquid-glass-button-secondary text-[#355968] hover:text-[#0f2c38] cursor-pointer"
                aria-label={`Scroll ${title} left`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-xl liquid-glass-button-secondary text-[#355968] hover:text-[#0f2c38] cursor-pointer"
                aria-label={`Scroll ${title} right`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onSeeMore && (
              <button
                onClick={onSeeMore}
                className="min-h-[40px] px-2 flex items-center gap-1 text-xs font-semibold text-[#0d9488] hover:text-[#0284c7] transition-colors group cursor-pointer tactile-press"
                aria-label={`See more ${title}`}
              >
                <span>See all</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area: Empty State or Cards */}
      {games.length === 0 ? (
        <div className="p-5 sm:p-7 rounded-3xl liquid-glass flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d7f5eb] to-[#dff1ff] border border-white/90 flex items-center justify-center text-[#0d9488] shadow-sm">
              <Inbox className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0f2c38]">No {title.toLowerCase()} currently available</h3>
              <p className="text-xs text-[#4a6f7d] mt-0.5 max-w-md">
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
          className="flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
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

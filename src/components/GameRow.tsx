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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0A84FF]/25 to-[#BF5AF2]/20 border border-white/20 flex items-center justify-center text-[#0A84FF] shadow-[0_2px_12px_rgba(10,132,255,0.25)]">
            <Package className="w-4 h-4 text-[#0A84FF]" />
          </div>
        );
      case 'lightning':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0A84FF]/25 to-[#BF5AF2]/20 border border-white/20 flex items-center justify-center text-[#0A84FF] shadow-[0_2px_12px_rgba(10,132,255,0.25)]">
            <Zap className="w-4 h-4 fill-[#0A84FF] text-[#0A84FF]" />
          </div>
        );
      case 'trophy':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/25 to-[#BF5AF2]/20 border border-white/20 flex items-center justify-center text-amber-400 shadow-[0_2px_12px_rgba(245,158,11,0.25)]">
            <Trophy className="w-4 h-4" />
          </div>
        );
      case 'sparkles':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#BF5AF2]/25 to-[#0A84FF]/20 border border-white/20 flex items-center justify-center text-[#BF5AF2] shadow-[0_2px_12px_rgba(191,90,242,0.25)]">
            <Sparkles className="w-4 h-4 fill-[#BF5AF2]" />
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
          <h2 className="heading-font text-base sm:text-lg font-bold tracking-tight text-white uppercase">
            {title}
          </h2>
          <span className="hidden sm:inline text-xs text-slate-400 font-mono">
            ({games.length})
          </span>
        </div>

        {games.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scroll('left')}
                className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-all"
                aria-label={`Scroll ${title} left`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-all"
                aria-label={`Scroll ${title} right`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onSeeMore && (
              <button
                onClick={onSeeMore}
                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-[#0A84FF] transition-colors group"
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
        /* Requirement 4: Display elegant Liquid Glass empty states instead of fake content */
        <div className="p-6 sm:p-8 rounded-3xl liquid-glass border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-slate-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Inbox className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">No {title.toLowerCase()} currently available</h3>
              <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                {emptyMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAddContent ? (
              <button
                onClick={onAddContent}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl liquid-glass-button text-xs font-bold text-white transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Item</span>
              </button>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full text-[11px] font-medium bg-white/10 text-slate-300 border border-white/15 backdrop-blur-md">
                Awaiting Content
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0"
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

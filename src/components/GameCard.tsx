import React from 'react';
import { Star, Download, Bookmark, Sparkles, Share2 } from 'lucide-react';
import { Game } from '../types/game';

interface GameCardProps {
  game: Game;
  onSelect: (game: Game) => void;
  isSaved?: boolean;
  onToggleSave?: (gameId: string, e: React.MouseEvent) => void;
  ranking?: number;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onSelect,
  isSaved = false,
  onToggleSave,
  ranking,
}) => {
  return (
    <div
      onClick={() => onSelect(game)}
      className="group relative flex flex-col flex-shrink-0 w-[165px] sm:w-[190px] md:w-[205px] cursor-pointer rounded-3xl liquid-glass-card overflow-hidden text-left"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(game);
        }
      }}
      aria-label={`View details for ${game.title} version ${game.version}`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
        <img
          src={game.coverUrl}
          alt={game.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Ambient Glass Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080c1f]/90 via-[#080c1f]/20 to-transparent opacity-90 group-hover:opacity-75 transition-opacity" />

        {/* Top Badges Row */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
          {/* Status Badge in Apple Frosted Glass */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-md shadow-sm ${
              game.status === 'Official'
                ? 'bg-[#0A84FF]/25 text-[#0A84FF] border border-[#0A84FF]/40 shadow-[0_0_10px_rgba(10,132,255,0.3)]'
                : 'bg-[#BF5AF2]/25 text-[#BF5AF2] border border-[#BF5AF2]/40 shadow-[0_0_10px_rgba(191,90,242,0.3)]'
            }`}
          >
            {game.status}
          </span>

          {/* Ranking if popular */}
          {ranking !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md ${
                ranking === 1
                  ? 'bg-amber-400/90 text-black shadow-md'
                  : ranking === 2
                  ? 'bg-slate-200/90 text-black shadow-md'
                  : ranking === 3
                  ? 'bg-amber-600/90 text-white shadow-md'
                  : 'bg-white/20 text-white border border-white/20'
              }`}
            >
              #{ranking}
            </span>
          )}
        </div>

        {/* Bookmark Quick Action Button */}
        {onToggleSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(game.id, e);
            }}
            className={`absolute bottom-2.5 right-2.5 p-2 rounded-2xl backdrop-blur-xl transition-all duration-300 ${
              isSaved
                ? 'bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2] text-white shadow-lg'
                : 'bg-black/40 text-slate-300 hover:text-white hover:bg-black/60 border border-white/20'
            }`}
            aria-label={isSaved ? `Remove ${game.title} from saved` : `Save ${game.title}`}
          >
            <Bookmark className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        {/* Architecture Chip */}
        <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-black/40 text-slate-300 border border-white/15 backdrop-blur-md">
            {game.architecture.includes('64') ? 'ARM64' : 'ARM32'}
          </span>
        </div>
      </div>

      {/* Info Content Area */}
      <div className="p-3.5 flex flex-col flex-grow justify-between">
        <div>
          <h3
            className="text-sm font-bold text-white group-hover:text-[#0A84FF] transition-colors truncate leading-snug"
            title={game.title}
          >
            {game.title}
          </h3>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span className="font-mono text-slate-300">{game.version}</span>
            <span className="truncate max-w-[80px] text-right">{game.category}</span>
          </div>
        </div>

        {/* Meta Stats Row */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2.5 mt-2.5 border-t border-white/10">
          <div className="flex items-center gap-1 text-amber-300 font-medium">
            <Star className="w-3 h-3 fill-amber-300" />
            <span>{game.rating.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1 font-medium text-slate-400">
            <Download className="w-3 h-3" />
            <span>{game.downloads}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

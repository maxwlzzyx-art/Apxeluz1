import React, { useState } from 'react';
import { Star, Download, Bookmark, Layers } from 'lucide-react';
import { Game } from '../types/game';

interface GameCardProps {
  game: Game;
  onSelect: (game: Game) => void;
  isSaved?: boolean;
  onToggleSave?: (gameId: string, e: React.MouseEvent) => void;
  ranking?: number;
  headingLevel?: 'h2' | 'h3';
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onSelect,
  isSaved = false,
  onToggleSave,
  ranking,
  headingLevel = 'h3',
}) => {
  const HeadingTag = headingLevel;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      onClick={() => onSelect(game)}
      className="group relative flex flex-col flex-shrink-0 w-[160px] sm:w-[192px] md:w-[208px] cursor-pointer rounded-3xl liquid-glass-card overflow-hidden text-left snap-start"
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
      {/* Cover Image Container (1:1 Icon Aspect) */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#E6ECEF]">
        {!imgFailed && game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={game.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#E3F2F0]">
            <Layers className="w-8 h-8 text-[#0D9488] mb-2" />
            <span className="text-xs font-bold text-[#10242E] line-clamp-2">{game.title}</span>
          </div>
        )}

        {/* Solid Subtle Bottom Accent Bar (Zero Gradient) */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-[#10242E]/10 pointer-events-none" />

        {/* Subtle Single Corner Status Indicator (No Pill Sandwiches) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-xl text-[10px] font-bold tracking-wide backdrop-blur-md border shadow-sm ${
              game.status === 'Official'
                ? 'bg-white/85 text-[#0b5e58] border-white/95'
                : 'bg-[#e0f2fe]/90 text-[#0369a1] border-white/90'
            }`}
          >
            {game.status}
          </span>

          {ranking !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-xl text-[10px] font-bold tabular-nums backdrop-blur-md border border-white/90 shadow-sm ${
                ranking === 1
                  ? 'bg-[#fef3c7] text-[#92400e]'
                  : ranking === 2
                  ? 'bg-white/90 text-[#1e293b]'
                  : ranking === 3
                  ? 'bg-[#ffedd5] text-[#9a3412]'
                  : 'bg-white/80 text-[#0f2c38]'
              }`}
            >
              #{ranking}
            </span>
          )}
        </div>

        {/* Tactile 3D Bookmark Button (>= 40px touch hitbox) */}
        {onToggleSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(game.id, e);
            }}
            className={`absolute bottom-2.5 right-2.5 min-w-[40px] min-h-[40px] p-2 rounded-2xl backdrop-blur-xl flex items-center justify-center cursor-pointer tactile-press ${
              isSaved
                ? 'liquid-glass-button text-white'
                : 'bg-white/85 text-[#355968] hover:text-[#0d9488] border border-white/95 shadow-[0_4px_12px_rgba(15,44,56,0.14)]'
            }`}
            aria-label={isSaved ? `Remove ${game.title} from saved` : `Save ${game.title}`}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>

      {/* Clean Unboxed Info Area */}
      <div className="p-3.5 flex flex-col flex-grow justify-between gap-2">
        <div>
          <HeadingTag
            className="text-sm font-bold text-[#0f2c38] text-3d-subtle group-hover:text-[#0d9488] transition-colors truncate leading-snug"
            title={game.title}
          >
            {game.title}
          </HeadingTag>

          <p className="text-[11px] text-[#4a6f7d] mt-1 truncate font-medium tabular-nums">
            {game.version} · {game.category} · {game.architecture.includes('64') ? 'ARM64' : 'ARM32'}
          </p>
        </div>

        {/* Meta Stats Row */}
        <div className="flex items-center justify-between text-[11px] text-[#355968] pt-2 border-t border-[#0f2c38]/8 tabular-nums">
          <div className="flex items-center gap-1 font-semibold text-[#b45309]">
            <Star className="w-3.5 h-3.5 fill-[#f59e0b] text-[#f59e0b]" />
            <span>{game.rating.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1 font-medium text-[#4a6f7d]">
            <Download className="w-3 h-3 text-[#0d9488]" />
            <span>{game.downloads}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

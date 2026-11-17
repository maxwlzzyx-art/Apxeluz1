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
  fluid?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onSelect,
  isSaved = false,
  onToggleSave,
  ranking,
  headingLevel = 'h3',
  fluid = false,
}) => {
  const HeadingTag = headingLevel;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      onClick={() => onSelect(game)}
      className={`group relative flex flex-col cursor-pointer rounded-3xl liquid-glass-card perf-card overflow-hidden text-left snap-start ${
        fluid ? 'w-full' : 'flex-shrink-0 w-[154px] sm:w-[192px] md:w-[208px]'
      }`}
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
      {/* Cover Image Container (1:1 Icon Aspect with Realistic Inset Glass Bezel) */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#E6ECEF] ring-1 ring-inset ring-black/5">
        {!imgFailed && game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={game.title}
            loading="lazy"
            decoding="async"
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

        {/* Top Specular Edge Gleam + Solid Bottom Shelf Rim (Zero Gradient) */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/60 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-[#10242E]/10 pointer-events-none" />

        {/* Single Corner Status Indicator */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-xl text-[10px] font-bold tracking-wide backdrop-blur-md border shadow-sm ${
              game.status === 'Official'
                ? 'bg-white/78 text-[#0F766E] border-white/95'
                : 'bg-[#DBEAF6]/84 text-[#165985] border-white/90'
            }`}
          >
            {game.status}
          </span>

          {ranking !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-xl text-[10px] font-bold tabular-nums backdrop-blur-md border shadow-sm ${
                ranking === 1
                  ? 'bg-[#FEF3C7]/90 text-[#7C4A03] border-white/90'
                  : ranking === 2
                  ? 'bg-white/80 text-[#10242E] border-white/95'
                  : ranking === 3
                  ? 'bg-[#FFE4E6]/90 text-[#9F1239] border-white/90'
                  : 'bg-white/75 text-[#10242E] border-white/90'
              }`}
            >
              #{ranking}
            </span>
          )}
        </div>

        {/* Tactile Physical Keycap Bookmark Button (>= 40px touch hitbox) */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(game.id, e);
            }}
            className={`absolute bottom-2.5 right-2.5 min-w-[40px] min-h-[40px] p-2 rounded-2xl flex items-center justify-center cursor-pointer tactile-press ${
              isSaved
                ? 'liquid-glass-button text-white'
                : 'bg-white/78 backdrop-blur-md text-[#10242E] hover:text-[#0D9488] border border-white/95 shadow-[0_8px_16px_-4px_rgba(16,36,46,0.2),inset_0_1.5px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(211,221,227,0.7)]'
            }`}
            aria-label={isSaved ? `Remove ${game.title} from saved` : `Save ${game.title}`}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>

      {/* Clean Sculpted Info Area */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-grow justify-between gap-2">
        <div>
          <HeadingTag
            className="text-[13px] sm:text-sm font-bold text-[#10242E] text-3d-subtle group-hover:text-[#0D9488] transition-colors truncate leading-snug"
            title={game.title}
          >
            {game.title}
          </HeadingTag>

          <p className="text-[11px] text-[#4A6270] mt-0.5 sm:mt-1 truncate font-medium tabular-nums">
            {game.version} · {game.category} · {game.architecture.includes('64') ? 'ARM64' : 'ARM32'}
          </p>
        </div>

        {/* Meta Stats Row */}
        <div className="flex items-center justify-between text-[11px] text-[#4A6270] pt-2 border-t border-[#10242E]/10 tabular-nums">
          <div className="flex items-center gap-1 font-semibold text-[#7C4A03]">
            <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
            <span>{game.rating.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1 font-semibold text-[#4A6270]">
            <Download className="w-3 h-3 text-[#0D9488]" />
            <span>{game.downloads}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

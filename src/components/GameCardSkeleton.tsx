import React from 'react';
import { getSkeletonCountForLayout } from '../utils/loadingState';

interface GameCardSkeletonProps {
  fluid?: boolean;
  variant?: 'free' | 'premium';
  showRanking?: boolean;
}

export const GameCardSkeleton: React.FC<GameCardSkeletonProps> = ({
  fluid = false,
  variant = 'free',
  showRanking = false,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`relative flex flex-col rounded-3xl liquid-glass-card perf-card overflow-hidden text-left snap-start pointer-events-none select-none ${
        fluid ? 'w-full' : 'flex-shrink-0 w-[154px] sm:w-[192px] md:w-[208px]'
      }`}
    >
      {/* Cover Image Glass Bezel (1:1 Aspect matching GameCard) */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#E6ECEF]/80 ring-1 ring-inset ring-black/5">
        <div className="w-full h-full liquid-glass-skeleton-slot border-0 rounded-none" />

        {/* Top Specular Edge Gleam + Bottom Shelf Rim */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/70 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-[#10242E]/10 pointer-events-none" />

        {/* Corner Frosted Badge Skeletons */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10">
          <div
            className={`h-5 w-14 rounded-xl backdrop-blur-md liquid-glass-skeleton-slot ${
              variant === 'premium' ? 'liquid-glass-skeleton-warm' : ''
            }`}
          />
          {(showRanking || variant === 'premium') && (
            <div className="h-5 w-10 rounded-xl backdrop-blur-md liquid-glass-skeleton-slot" />
          )}
        </div>

        {/* Floating Bottom-Right Frosted Keycap Skeleton */}
        <div className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-2xl bg-white/75 backdrop-blur-md border border-white/95 shadow-[0_8px_16px_-4px_rgba(16,36,46,0.16),inset_0_1.5px_0_rgba(255,255,255,1)] flex items-center justify-center">
          <div className="w-4 h-4 rounded-md liquid-glass-skeleton-slot" />
        </div>
      </div>

      {/* Info Area Matching Free & Premium Card Proportions */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-grow justify-between gap-2">
        <div className="space-y-1.5">
          {/* Title line */}
          <div className="h-4 w-4/5 rounded-lg liquid-glass-skeleton-slot" />
          {/* Version · Category · Arch line */}
          <div className="h-3 w-3/5 rounded-md liquid-glass-skeleton-slot" />

          {variant === 'premium' && (
            <div className="pt-1 space-y-1">
              <div className="h-2.5 w-full rounded-md liquid-glass-skeleton-slot" />
              <div className="h-2.5 w-2/3 rounded-md liquid-glass-skeleton-slot" />
            </div>
          )}
        </div>

        {variant === 'premium' ? (
          <div className="pt-2 border-t border-[#10242E]/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-10 rounded-md liquid-glass-skeleton-slot" />
              <div className="h-3.5 w-16 rounded-md liquid-glass-skeleton-slot liquid-glass-skeleton-accent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="h-[38px] rounded-xl liquid-glass-skeleton-slot liquid-glass-skeleton-accent" />
              <div className="h-[38px] rounded-xl liquid-glass-skeleton-slot liquid-glass-skeleton-accent" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-[#10242E]/10">
            <div className="h-3.5 w-10 rounded-md liquid-glass-skeleton-slot liquid-glass-skeleton-warm" />
            <div className="h-3.5 w-12 rounded-md liquid-glass-skeleton-slot liquid-glass-skeleton-accent" />
          </div>
        )}
      </div>
    </div>
  );
};

interface GameSkeletonGridProps {
  count?: number;
  variant?: 'free' | 'premium';
  label?: string;
}

export const GameSkeletonGrid: React.FC<GameSkeletonGridProps> = ({
  count = getSkeletonCountForLayout('grid'),
  variant = 'free',
  label = 'Loading games from repository',
}) => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-testid="liquid-glass-skeleton-grid"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, idx) => (
        <GameCardSkeleton key={idx} fluid={true} variant={variant} />
      ))}
    </div>
  );
};

interface HotCategoriesSkeletonProps {
  count?: number;
}

export const HotCategoriesSkeleton: React.FC<HotCategoriesSkeletonProps> = ({
  count = getSkeletonCountForLayout('categories'),
}) => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading categories"
      data-testid="liquid-glass-categories-skeleton"
      className="flex items-center gap-2.5 overflow-x-auto no-scrollbar mobile-scroll-row pb-2 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0"
    >
      <span className="sr-only">Loading categories</span>
      <div className="flex-shrink-0 min-h-[46px] w-28 rounded-2xl liquid-glass-card p-2.5 flex items-center justify-center pointer-events-none">
        <div className="h-3.5 w-20 rounded-md liquid-glass-skeleton-slot liquid-glass-skeleton-accent" />
      </div>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          aria-hidden="true"
          className="flex-shrink-0 min-h-[46px] flex items-center gap-2.5 px-3.5 py-2 rounded-2xl liquid-glass-card pointer-events-none select-none"
        >
          <div className="w-7 h-7 rounded-xl liquid-glass-skeleton-slot flex-shrink-0" />
          <div className="flex flex-col gap-1">
            <div className="h-3 w-16 rounded-md liquid-glass-skeleton-slot" />
            <div className="h-2.5 w-10 rounded-md liquid-glass-skeleton-slot" />
          </div>
        </div>
      ))}
    </div>
  );
};

import React from 'react';
import { ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { FilterOptions } from '../types/game';

interface BrowseFiltersProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  totalMatches: number;
  onReset: () => void;
}

export const BrowseFilters: React.FC<BrowseFiltersProps> = ({
  isOpen,
  onToggle,
  filters,
  setFilters,
  totalMatches,
  onReset,
}) => {
  const categories = [
    'All',
    'Action',
    'Adventure',
    '2D',
    'Indie',
    'RPG',
    'Simulation',
    'Racing',
    'Sports',
    'Strategy',
  ];

  const architectures = [
    { label: 'All Architectures', value: 'All' },
    { label: 'arm64-v8a (64-bit)', value: 'arm64-v8a' },
    { label: 'armeabi-v7a (32-bit)', value: 'armeabi-v7a' },
  ];

  const androidVersions = [
    { label: 'All Android Versions', value: 'All' },
    { label: 'Android 8.0+', value: '8.0+' },
    { label: 'Android 9.0+', value: '9.0+' },
    { label: 'Android 10.0+', value: '10.0+' },
  ];

  const statusOptions = [
    { label: 'All Releases', value: 'All' },
    { label: 'Community Mods', value: 'Unofficial' },
    { label: 'Official Apps', value: 'Official' },
  ];

  const sortOptions = [
    { label: 'Latest Added', value: 'latest' },
    { label: 'Most Popular', value: 'popular' },
    { label: 'Highest Rated', value: 'rating' },
    { label: 'Recently Updated', value: 'updated' },
    { label: 'Alphabetical (A-Z)', value: 'az' },
  ];

  const hasActiveFilters =
    filters.category !== 'All' ||
    filters.status !== 'All' ||
    filters.architecture !== 'All' ||
    filters.minAndroid !== 'All' ||
    filters.sortBy !== 'latest';

  return (
    <div className="w-full my-3">
      {/* Centered Liquid Glass Trigger Button */}
      <div className="flex justify-center">
        <button
          onClick={onToggle}
          className="group flex items-center gap-2.5 px-6 py-2.5 rounded-full liquid-glass hover:bg-white/[0.12] text-white hover:border-[#0A84FF]/50 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] active:scale-95"
          aria-expanded={isOpen}
          aria-label="Browse all items and filters"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#0A84FF]" />
          <span className="text-xs sm:text-sm font-semibold tracking-wide">
            Browse all items & filters
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-300 group-hover:text-white transition-transform duration-300 ${
              isOpen ? 'rotate-180 text-[#0A84FF]' : ''
            }`}
          />
        </button>
      </div>

      {/* Collapsible Liquid Glass Filter Panel */}
      {isOpen && (
        <div className="mt-4 p-5 sm:p-6 rounded-3xl liquid-glass border border-white/20 shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="heading-font text-sm font-bold tracking-tight text-white uppercase">
                Filter & Sort Repository
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#0A84FF]/20 text-[#0A84FF] font-semibold border border-[#0A84FF]/30 shadow-sm">
                {totalMatches} Found
              </span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#BF5AF2] transition-colors"
                aria-label="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 focus:bg-white/[0.12] backdrop-blur-xl"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[#0f172a] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Release Type
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 focus:bg-white/[0.12] backdrop-blur-xl"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Architecture Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                CPU Architecture
              </label>
              <select
                value={filters.architecture}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, architecture: e.target.value }))
                }
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 focus:bg-white/[0.12] backdrop-blur-xl"
              >
                {architectures.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Sort Order
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as FilterOptions['sortBy'],
                  }))
                }
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 focus:bg-white/[0.12] backdrop-blur-xl"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

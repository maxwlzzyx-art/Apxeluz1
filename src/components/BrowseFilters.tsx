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
    <div className="w-full">
      {/* Centered 3D Frosted Glass Filter Trigger */}
      <div className="flex justify-center">
        <button
          onClick={onToggle}
          className={`group min-h-[44px] flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold tracking-wide cursor-pointer ${
            isOpen
              ? 'liquid-glass-button text-white'
              : 'liquid-glass-button-secondary text-[#0f2c38]'
          }`}
          aria-expanded={isOpen}
          aria-label="Browse all items and filters"
        >
          <SlidersHorizontal className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-[#0d9488]'}`} />
          <span className="whitespace-nowrap">Browse all items &amp; filters</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-white' : 'text-[#4a6f7d]'
            }`}
          />
        </button>
      </div>

      {/* Collapsible Frosted Glass Filter Panel */}
      {isOpen && (
        <div className="mt-4 p-5 sm:p-6 rounded-3xl liquid-glass transition-all duration-200">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#0f2c38]/10">
            <div className="flex items-center gap-2.5">
              <span className="heading-font text-sm font-bold tracking-tight text-[#0f2c38] text-3d-subtle">
                Filter &amp; Sort Repository
              </span>
              <span className="text-xs font-semibold text-[#0d9488] tabular-nums">
                · {totalMatches} Found
              </span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="min-h-[36px] px-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#0284c7] hover:text-[#0f2c38] transition-colors cursor-pointer tactile-press"
                aria-label="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#355968] block">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full min-h-[44px] liquid-glass-input text-sm font-medium text-[#10242E] rounded-2xl px-3.5 py-2 focus:outline-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[#f2faf7] text-[#0f2c38]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#355968] block">
                Release Type
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full min-h-[44px] liquid-glass-input text-sm font-medium text-[#10242E] rounded-2xl px-3.5 py-2 focus:outline-none cursor-pointer"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#f2faf7] text-[#0f2c38]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Architecture Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#355968] block">
                CPU Architecture
              </label>
              <select
                value={filters.architecture}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, architecture: e.target.value }))
                }
                className="w-full min-h-[44px] liquid-glass-input text-sm font-medium text-[#10242E] rounded-2xl px-3.5 py-2 focus:outline-none cursor-pointer"
              >
                {architectures.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#f2faf7] text-[#0f2c38]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#355968] block">
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
                className="w-full min-h-[44px] liquid-glass-input text-sm font-medium text-[#10242E] rounded-2xl px-3.5 py-2 focus:outline-none cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#f2faf7] text-[#0f2c38]">
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

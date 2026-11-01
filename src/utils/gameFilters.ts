import { Game, FilterOptions } from '../types/game';

/**
 * Filter games by category, status, architecture, search query, etc.
 */
export function filterGames(games: Game[], filters: Partial<FilterOptions>): Game[] {
  return games.filter((game) => {
    // Search query check (title, tags, developer, porter)
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      const titleMatch = game.title.toLowerCase().includes(q);
      const tagMatch = game.tags.some((tag) => tag.toLowerCase().includes(q));
      const devMatch = game.developer.toLowerCase().includes(q);
      const porterMatch = game.porter ? game.porter.toLowerCase().includes(q) : false;
      const categoryMatch = game.category.toLowerCase().includes(q);

      if (!titleMatch && !tagMatch && !devMatch && !porterMatch && !categoryMatch) {
        return false;
      }
    }

    // Category filter
    if (filters.category && filters.category !== 'All') {
      if (game.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
    }

    // Status filter (Official / Unofficial)
    if (filters.status && filters.status !== 'All') {
      if (game.status !== filters.status) {
        return false;
      }
    }

    // Architecture filter
    if (filters.architecture && filters.architecture !== 'All') {
      if (!game.architecture.toLowerCase().includes(filters.architecture.toLowerCase())) {
        return false;
      }
    }

    // Min Android filter
    if (filters.minAndroid && filters.minAndroid !== 'All') {
      const minVersionNum = parseFloat(filters.minAndroid.replace(/[^0-9.]/g, ''));
      const gameVersionNum = parseFloat(game.minAndroid.replace(/[^0-9.]/g, ''));
      if (!isNaN(minVersionNum) && !isNaN(gameVersionNum) && gameVersionNum > minVersionNum) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort games according to the specified criteria
 */
export function sortGames(games: Game[], sortBy: FilterOptions['sortBy']): Game[] {
  const result = [...games];

  switch (sortBy) {
    case 'popular':
      return result.sort((a, b) => b.downloadCount - a.downloadCount);
    case 'rating':
      return result.sort((a, b) => b.rating - a.rating);
    case 'az':
      return result.sort((a, b) => a.title.localeCompare(b.title));
    case 'updated':
      return result.sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
    case 'latest':
    default:
      return result.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }
}

/**
 * Quick search games helper with relevance weighting
 */
export function searchGames(games: Game[], query: string): Game[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return games;

  return games
    .filter((g) => {
      return (
        g.title.toLowerCase().includes(trimmed) ||
        g.category.toLowerCase().includes(trimmed) ||
        g.developer.toLowerCase().includes(trimmed) ||
        (g.porter && g.porter.toLowerCase().includes(trimmed)) ||
        g.tags.some((t) => t.toLowerCase().includes(trimmed))
      );
    })
    .sort((a, b) => {
      // Prioritize exact or prefix matches in title
      const aStarts = a.title.toLowerCase().startsWith(trimmed);
      const bStarts = b.title.toLowerCase().startsWith(trimmed);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return b.downloadCount - a.downloadCount;
    });
}

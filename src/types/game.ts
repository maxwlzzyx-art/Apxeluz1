export type GameStatus = 'Unofficial' | 'Official';
import type { ItemVersion } from './admin';

export type GameCategory =
  | 'Action'
  | 'Adventure'
  | '2D'
  | 'Indie'
  | 'RPG'
  | 'Simulation'
  | 'Racing'
  | 'Sports'
  | 'Strategy';

export interface GameChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface DownloadMirror {
  id: string;
  name: string;
  url: string;
  isPrimary: boolean;
  version?: string;
  notes?: string;
}

export interface Game {
  id: string;
  slug: string;
  type?: 'game' | 'app' | 'mod';
  title: string;
  version: string;
  status: GameStatus;
  category: GameCategory;
  tags: string[];
  coverUrl: string;
  bannerUrl: string;
  rating: number;
  ratingCount: number;
  downloads: string;
  downloadCount: number;
  fileSize: string;
  formattedFileSize?: string;
  developer: string;
  porter?: string;
  packageName: string;
  minAndroid: string;
  architecture: string;
  obbRequired: boolean;
  updatedDate: string;
  releaseDate: string;
  isNewlyAdded?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  popularityRank?: number;
  description: string;
  installationGuide?: string[];
  features: string[];
  screenshots: string[];
  changelog: GameChangelogEntry[];
  sha256: string;
  virusTotalClean: boolean;
  downloadFilename: string;
  downloadLinks?: DownloadMirror[];
  versions?: ItemVersion[];
}

export interface FilterOptions {
  category: string;
  status: string; // 'All' | 'Official' | 'Unofficial'
  architecture: string; // 'All' | 'arm64-v8a' | 'armeabi-v7a'
  minAndroid: string; // 'All' | '8.0+' | '10.0+' | '12.0+'
  searchQuery: string;
  sortBy: 'latest' | 'popular' | 'rating' | 'az' | 'updated';
}

export interface CommunityPortRequest {
  id: string;
  title: string;
  originalPlatform: string;
  originalDeveloper: string;
  requesterName: string;
  votes: number;
  status: 'In Discussion' | 'Port in Progress' | 'Testing Build' | 'Completed';
  date: string;
  tags: string[];
}

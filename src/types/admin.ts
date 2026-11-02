import { GameCategory, GameStatus } from './game';

export type ItemType = 'game' | 'mod' | 'app';

export interface DownloadLink {
  id: string;
  name: string;
  url: string;
  isPrimary: boolean;
  version?: string;
  notes?: string;
  storagePath?: string;
  fileSizeBytes?: number;
}

export interface ItemVersion {
  id: string;
  version: string;
  releaseDate: string;
  formattedFileSize?: string;
  fileSizeValue?: number | string;
  fileSizeUnit?: 'MB' | 'GB';
  downloadLinks: DownloadLink[];
  changelog?: string[];
  notes?: string;
  isLatest?: boolean;
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  slug: string;
  version: string;
  status: GameStatus;
  category: string;
  tags: string[];
  shortDescription?: string;
  description: string;
  developer: string;
  porter?: string;
  platform: string;
  minAndroid: string;
  architecture: string;
  obbRequired: boolean;
  fileSizeValue: number | string;
  fileSizeUnit: 'MB' | 'GB';
  formattedFileSize: string;
  iconUrl?: string;
  coverUrl: string;
  bannerUrl: string;
  screenshots: string[];
  downloadLinks: DownloadLink[];
  rating: number;
  ratingCount: number;
  downloads: string;
  downloadCount: number;
  releaseDate: string;
  updatedDate: string;
  isNewlyAdded?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  visibility: 'published' | 'draft';
  changelog?: { version: string; date: string; changes: string[] }[];
  sha256?: string;
  versions?: ItemVersion[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  order: number;
  itemCount: number;
}

export interface WebsiteSettings {
  siteName: string;
  siteDescription: string;
  announcement?: string;
  enableDownloads: boolean;
  maintenanceMode: boolean;
  defaultArchitecture: string;
}

export interface AdminStats {
  totalGames: number;
  totalMods: number;
  totalApps: number;
  totalCategories: number;
  totalDownloads: number;
  recentItems: Item[];
}

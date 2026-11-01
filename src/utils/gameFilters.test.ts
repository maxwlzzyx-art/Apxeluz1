import test from 'node:test';
import assert from 'node:assert/strict';
import { filterGames, sortGames, searchGames } from './gameFilters';
import { Game } from '../types/game';

const mockGames: Game[] = [
  {
    id: 'hollow-knight',
    slug: 'hollow-knight',
    title: 'Hollow Knight',
    version: 'v1.4.3.2',
    status: 'Unofficial',
    category: 'Action',
    tags: ['Metroidvania', 'Souls-like', '2D'],
    coverUrl: '',
    bannerUrl: '',
    rating: 4.9,
    ratingCount: 18200,
    downloads: '1.4M',
    downloadCount: 1400000,
    fileSize: '1.24 GB',
    developer: 'Team Cherry',
    porter: 'Danil_05',
    packageName: 'com.teamcherry.hollowknight',
    minAndroid: 'Android 8.0+',
    architecture: 'arm64-v8a',
    obbRequired: true,
    updatedDate: '2024-11-12',
    releaseDate: '2024-01-15',
    description: 'Explore Hallownest on Android',
    features: ['Custom touch buttons', '60 FPS'],
    screenshots: [],
    changelog: [],
    sha256: 'abc123mock',
    virusTotalClean: true,
    downloadFilename: 'Hollow_Knight_v1.4.3.2_arm64.apk',
  },
  {
    id: 'dead-cells',
    slug: 'dead-cells',
    title: 'Dead Cells',
    version: 'v3.3.6',
    status: 'Official',
    category: 'Action',
    tags: ['Rogue-lite', 'Action', '2D'],
    coverUrl: '',
    bannerUrl: '',
    rating: 4.8,
    ratingCount: 22000,
    downloads: '2.1M',
    downloadCount: 2100000,
    fileSize: '950 MB',
    developer: 'Motion Twin',
    packageName: 'com.playdigious.deadcells.m',
    minAndroid: 'Android 7.0+',
    architecture: 'arm64-v8a / armeabi-v7a',
    obbRequired: false,
    updatedDate: '2024-10-05',
    releaseDate: '2023-06-20',
    description: 'Kill, die, learn, repeat.',
    features: ['Controller support'],
    screenshots: [],
    changelog: [],
    sha256: 'def456mock',
    virusTotalClean: true,
    downloadFilename: 'Dead_Cells_v3.3.6.apk',
  },
  {
    id: 'celeste',
    slug: 'celeste',
    title: 'Celeste',
    version: 'v1.4.0',
    status: 'Unofficial',
    category: 'Indie',
    tags: ['Platformer', 'Pixel Art', 'Precise'],
    coverUrl: '',
    bannerUrl: '',
    rating: 4.9,
    ratingCount: 11400,
    downloads: '850K',
    downloadCount: 850000,
    fileSize: '410 MB',
    developer: 'Maddy Makes Games',
    porter: 'PatataPort',
    packageName: 'com.maddy.celeste.android',
    minAndroid: 'Android 9.0+',
    architecture: 'arm64-v8a',
    obbRequired: false,
    updatedDate: '2024-09-18',
    releaseDate: '2024-08-01',
    description: 'Help Madeline survive her inner demons.',
    features: ['Touch controls', 'Full chapter access'],
    screenshots: [],
    changelog: [],
    sha256: 'celeste789mock',
    virusTotalClean: true,
    downloadFilename: 'Celeste_v1.4.0_arm64.apk',
  },
];

test('searchGames filters by title case-insensitively', () => {
  const results = searchGames(mockGames, 'hollow');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'hollow-knight');
});

test('searchGames filters by developer or porter', () => {
  const porterResults = searchGames(mockGames, 'Danil_05');
  assert.equal(porterResults.length, 1);
  assert.equal(porterResults[0].title, 'Hollow Knight');

  const devResults = searchGames(mockGames, 'Motion Twin');
  assert.equal(devResults.length, 1);
  assert.equal(devResults[0].title, 'Dead Cells');
});

test('filterGames applies category and status correctly', () => {
  const officialOnly = filterGames(mockGames, { status: 'Official' });
  assert.equal(officialOnly.length, 1);
  assert.equal(officialOnly[0].title, 'Dead Cells');

  const indieOnly = filterGames(mockGames, { category: 'Indie' });
  assert.equal(indieOnly.length, 1);
  assert.equal(indieOnly[0].title, 'Celeste');
});

test('sortGames sorts by popular and A-Z correctly', () => {
  const byPopular = sortGames(mockGames, 'popular');
  assert.equal(byPopular[0].title, 'Dead Cells'); // 2.1M downloads
  assert.equal(byPopular[1].title, 'Hollow Knight'); // 1.4M downloads

  const byAZ = sortGames(mockGames, 'az');
  assert.equal(byAZ[0].title, 'Celeste');
  assert.equal(byAZ[1].title, 'Dead Cells');
  assert.equal(byAZ[2].title, 'Hollow Knight');
});

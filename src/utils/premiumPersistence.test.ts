import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPublicPremiumGames,
  isSupabaseMissingTableError,
  mergePremiumGameLists,
  removePremiumGameFromList,
  upsertPremiumGameInList,
} from './premiumPersistence';
import { PremiumGame } from '../types/premium';

const sampleGame = (overrides: Partial<PremiumGame> = {}): PremiumGame => ({
  id: 'game-1',
  title: 'Test Premium Game',
  slug: 'test-premium-game',
  price: 20000,
  shortDescription: 'Short desc',
  description: 'Full desc',
  iconUrl: 'https://example.com/icon.jpg',
  coverUrl: 'https://example.com/cover.jpg',
  bannerUrl: 'https://example.com/banner.jpg',
  screenshots: [],
  paymentPlans: [
    {
      id: 'plan-30d',
      label: '30 Hari',
      durationDays: 30,
      price: 20000,
      paymentUrl: 'https://apxeluz.my.id/pay/30d',
    },
    {
      id: 'plan-life',
      label: 'Lifetime',
      durationDays: null,
      price: 30000,
      paymentUrl: 'https://apxeluz.my.id/pay/lifetime',
    },
  ],
  version: 'v1.0.0',
  fileSize: '1.0 GB',
  features: [],
  category: 'Action',
  developer: 'APXELUZ',
  isActive: true,
  visibility: 'published',
  ...overrides,
});

test('isSupabaseMissingTableError detects PGRST205 and PostgreSQL 42P01 errors', () => {
  assert.equal(
    isSupabaseMissingTableError({
      code: 'PGRST205',
      message: "Could not find the table 'public.premium_games' in the schema cache",
    }),
    true
  );
  assert.equal(
    isSupabaseMissingTableError({
      code: '42P01',
      message: 'relation "public.premium_games" does not exist',
    }),
    true
  );
  assert.equal(
    isSupabaseMissingTableError({ code: '42501', message: 'permission denied' }),
    false
  );
});

test('upsertPremiumGameInList prepends new items and updates existing by id/slug', () => {
  const initial = [sampleGame({ id: 'g1', slug: 'game-one', title: 'Game One' })];
  const added = upsertPremiumGameInList(
    initial,
    sampleGame({ id: 'g2', slug: 'game-two', title: 'Game Two' })
  );
  assert.equal(added.length, 2);
  assert.equal(added[0].id, 'g2');

  const updated = upsertPremiumGameInList(
    added,
    sampleGame({ id: 'g1', slug: 'game-one', title: 'Game One Updated' })
  );
  assert.equal(updated.length, 2);
  assert.equal(updated[1].title, 'Game One Updated');
});

test('filterPublicPremiumGames excludes inactive and draft entries', () => {
  const list = [
    sampleGame({ id: 'pub', slug: 'pub', isActive: true, visibility: 'published' }),
    sampleGame({ id: 'inactive', slug: 'inactive', isActive: false, visibility: 'published' }),
    sampleGame({ id: 'draft', slug: 'draft', isActive: true, visibility: 'draft' }),
  ];
  const visible = filterPublicPremiumGames(list);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'pub');
});

test('mergePremiumGameLists deduplicates by id and slug preferring primary source', () => {
  const primary = [sampleGame({ id: 'g1', slug: 'alpha', title: 'Primary Alpha' })];
  const secondary = [
    sampleGame({ id: 'g1', slug: 'alpha', title: 'Stale Alpha' }),
    sampleGame({ id: 'g2', slug: 'beta', title: 'Secondary Beta' }),
  ];
  const merged = mergePremiumGameLists(primary, secondary);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, 'Primary Alpha');
  assert.equal(removePremiumGameFromList(merged, 'g2').length, 1);
});

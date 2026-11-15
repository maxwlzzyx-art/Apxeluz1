import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLAN_PRESETS,
  buildDefaultPlansForGame,
  formatPlanDuration,
  formatRupiah,
  getStartingPrice,
  normalizePaymentPlans,
  normalizePremiumGameRecord,
  validatePaymentPlans,
} from './premiumPlans';
import type { PremiumGame } from '../types/premium';

test('DEFAULT_PLAN_PRESETS includes 30 Hari = 20000 and Lifetime = 30000', () => {
  assert.equal(DEFAULT_PLAN_PRESETS.length, 2);
  assert.deepEqual(DEFAULT_PLAN_PRESETS[0], {
    id: 'plan-30d',
    label: '30 Hari',
    durationDays: 30,
    price: 20000,
  });
  assert.deepEqual(DEFAULT_PLAN_PRESETS[1], {
    id: 'plan-lifetime',
    label: 'Lifetime',
    durationDays: null,
    price: 30000,
  });
});

test('formatRupiah formats Indonesian IDR prices cleanly without decimals', () => {
  const formatted20k = formatRupiah(20000).replace(/\s/g, ' ');
  assert.ok(formatted20k.includes('20.000'));
  assert.ok(formatted20k.includes('Rp'));

  const formattedZero = formatRupiah(-500);
  assert.ok(formattedZero.includes('0'));
});

test('formatPlanDuration falls back cleanly to durationDays or Lifetime', () => {
  assert.equal(formatPlanDuration({ label: '30 Hari', durationDays: 30 }), '30 Hari');
  assert.equal(formatPlanDuration({ label: '', durationDays: 14 }), '14 Hari');
  assert.equal(formatPlanDuration({ label: '', durationDays: null }), 'Lifetime');
});

test('normalizePaymentPlans builds 2 default plans when legacy game lacks paymentPlans', () => {
  const plans = normalizePaymentPlans(undefined, 20000, 'https://pay.example.com/game');
  assert.equal(plans.length, 2);
  assert.equal(plans[0].label, '30 Hari');
  assert.equal(plans[0].durationDays, 30);
  assert.equal(plans[0].price, 20000);
  assert.equal(plans[0].paymentUrl, 'https://pay.example.com/game');
  assert.equal(plans[1].label, 'Lifetime');
  assert.equal(plans[1].durationDays, null);
  assert.equal(plans[1].price, 30000);
});

test('validatePaymentPlans enforces non-empty label, valid numeric price, positive days, and HTTP/HTTPS paymentUrl', () => {
  assert.equal(validatePaymentPlans([]).valid, false);

  const badUrl = validatePaymentPlans([
    { label: '30 Hari', durationDays: 30, price: 20000, paymentUrl: 'javascript:alert(1)' },
  ]);
  assert.equal(badUrl.valid, false);
  assert.match(badUrl.error || '', /Link pembayaran/i);

  const badDays = validatePaymentPlans([
    { label: '0 Hari', durationDays: 0, price: 20000, paymentUrl: 'https://pay.example.com/a' },
  ]);
  assert.equal(badDays.valid, false);

  const valid = validatePaymentPlans([
    { label: '30 Hari', durationDays: 30, price: 20000, paymentUrl: 'https://pay.example.com/30d' },
    { label: 'Lifetime', durationDays: null, price: 30000, paymentUrl: 'https://pay.example.com/life' },
  ]);
  assert.equal(valid.valid, true);
});

test('getStartingPrice and normalizePremiumGameRecord compute lowest plan price', () => {
  const rawGame: PremiumGame = {
    id: 'prem-test',
    title: 'Test Game',
    slug: 'test-game',
    price: 50000,
    shortDescription: 'Desc',
    description: 'Full desc',
    iconUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=256',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
    screenshots: [],
    version: 'v1.0',
    fileSize: '500 MB',
    isActive: true,
    paymentPlans: [
      { id: 'p1', label: '30 Hari', durationDays: 30, price: 20000, paymentUrl: 'https://pay.example.com/30d' },
      { id: 'p2', label: 'Lifetime', durationDays: null, price: 30000, paymentUrl: 'https://pay.example.com/life' },
    ],
  };

  assert.equal(getStartingPrice(rawGame), 20000);
  const normalized = normalizePremiumGameRecord(rawGame);
  assert.equal(normalized.price, 20000);
  assert.equal(normalized.downloadUrl, 'https://pay.example.com/30d');

  const legacyBuilt = buildDefaultPlansForGame(undefined, undefined);
  assert.equal(legacyBuilt[0].price, 20000);
  assert.equal(legacyBuilt[1].price, 30000);
});

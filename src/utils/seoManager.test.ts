import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalUrl,
  resolveRouteSeoMetadata,
} from './seoManager';

test('buildCanonicalUrl strips query params, hashes, and trailing slashes on subpaths', () => {
  assert.equal(buildCanonicalUrl('https://apxeluz.my.id/', '/'), 'https://apxeluz.my.id/');
  assert.equal(
    buildCanonicalUrl('https://apxeluz.my.id', '/mod/super-sus-mod-menu/?utm_source=test#top'),
    'https://apxeluz.my.id/mod/super-sus-mod-menu'
  );
});

test('resolveRouteSeoMetadata returns Organization, WebSite, and CollectionPage schema on home route', () => {
  const meta = resolveRouteSeoMetadata(
    { view: 'home' },
    { origin: 'https://apxeluz.my.id', pathname: '/' }
  );
  assert.equal(meta.canonicalUrl, 'https://apxeluz.my.id/');
  assert.ok(meta.description.length >= 120 && meta.description.length <= 165);
  const types = meta.jsonLdGraph.map((node) => node['@type']);
  assert.ok(types.includes('Organization'));
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('CollectionPage'));
  assert.ok(!types.includes('FAQPage'));
});

test('resolveRouteSeoMetadata builds CollectionPage schema and canonical URL for premium route', () => {
  const meta = resolveRouteSeoMetadata(
    { view: 'premium' },
    { origin: 'https://apxeluz.my.id' }
  );
  assert.equal(meta.ogType, 'website');
  assert.equal(meta.canonicalUrl, 'https://apxeluz.my.id/premium');
  const types = meta.jsonLdGraph.map((node) => node['@type']);
  assert.ok(types.includes('CollectionPage'));
});

test('resolveRouteSeoMetadata sets noindex for admin views', () => {
  const meta = resolveRouteSeoMetadata({ view: 'admin-login' });
  assert.equal(meta.robots, 'noindex, nofollow');
});

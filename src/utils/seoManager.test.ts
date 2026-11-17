import test from 'node:test';
import assert from 'node:assert/strict';
import { EDITORIAL_GUIDES } from '../data/editorialContent';
import {
  buildCanonicalUrl,
  resolveRouteSeoMetadata,
} from './seoManager';

test('buildCanonicalUrl strips query params, hashes, and trailing slashes on subpaths', () => {
  assert.equal(buildCanonicalUrl('https://apxeluz.my.id/', '/'), 'https://apxeluz.my.id/');
  assert.equal(
    buildCanonicalUrl('https://apxeluz.my.id', '/guides/arm64-v8a-vs-armeabi-v7a-android-compatibility/?utm_source=test#top'),
    'https://apxeluz.my.id/guides/arm64-v8a-vs-armeabi-v7a-android-compatibility'
  );
});

test('resolveRouteSeoMetadata returns Organization, WebSite, CollectionPage, and FAQPage schema on home route', () => {
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
  assert.ok(types.includes('FAQPage'));
});

test('resolveRouteSeoMetadata builds TechArticle schema and canonical URL for guide pages', () => {
  const guide = EDITORIAL_GUIDES[0];
  const meta = resolveRouteSeoMetadata(
    { view: 'guides', slug: guide.slug },
    { origin: 'https://apxeluz.my.id', activeGuide: guide }
  );
  assert.equal(meta.ogType, 'article');
  assert.equal(meta.canonicalUrl, `https://apxeluz.my.id/guides/${guide.slug}`);
  const article = meta.jsonLdGraph.find((node) => node['@type'] === 'TechArticle');
  assert.ok(article);
  assert.equal(article?.headline, guide.title);
});

test('resolveRouteSeoMetadata sets noindex for admin views', () => {
  const meta = resolveRouteSeoMetadata({ view: 'admin-login' });
  assert.equal(meta.robots, 'noindex, nofollow');
});

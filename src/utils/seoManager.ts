import { Game } from '../types/game';
import { WebsiteSettings } from '../types/admin';

const BRAND_NAME = 'APXELUZ';
const CURATOR_NAME = 'Axeluf';
const CURATOR_TITLE = 'Founder & Package Maintainer';

export interface RouteSeoState {
  view: 'home' | 'saved' | 'premium' | 'item-detail' | 'admin-login' | 'admin-dashboard';
  slug?: string;
  itemType?: 'game' | 'app' | 'mod';
}

export interface ResolvedSeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'article';
  robots: string;
  jsonLdGraph: Record<string, unknown>[];
}

export const DEFAULT_CANONICAL_ORIGIN = 'https://apxeluz.my.id';
export const DEFAULT_OG_IMAGE =
  'https://cdn.phototourl.com/anon/2026-11-15-95ccde76-958a-450f-91b0-60424cee492b.jpg';

export function buildCanonicalUrl(origin: string, pathname: string): string {
  const cleanOrigin = (origin || DEFAULT_CANONICAL_ORIGIN).replace(/\/+$/, '');
  const rawPath = (pathname || '/').split('?')[0].split('#')[0];
  if (!rawPath || rawPath === '/') {
    return `${cleanOrigin}/`;
  }
  const normalizedPath = `/${rawPath.replace(/^\/+|\/+$/g, '')}`;
  return `${cleanOrigin}${normalizedPath}`;
}

export function buildBaseOrganizationSchema(origin: string): Record<string, unknown> {
  const base = (origin || DEFAULT_CANONICAL_ORIGIN).replace(/\/+$/, '');
  return {
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: BRAND_NAME,
    alternateName: 'Channel Axeluf',
    url: `${base}/`,
    logo: {
      '@type': 'ImageObject',
      url: DEFAULT_OG_IMAGE,
    },
    founder: {
      '@type': 'Person',
      name: CURATOR_NAME,
      jobTitle: CURATOR_TITLE,
    },
    description:
      'Independent Android APK, mod menu, and utility repository curated by Axeluf with SHA-256 package fingerprints, VirusTotal checks, and ABI compatibility tags.',
    knowsAbout: [
      'Android APK verification',
      'SHA-256 package checksums',
      'ARM64-v8a and armeabi-v7a compatibility',
      'Android game mods and utility ports',
    ],
  };
}

export function buildWebSiteSchema(origin: string): Record<string, unknown> {
  const base = (origin || DEFAULT_CANONICAL_ORIGIN).replace(/\/+$/, '');
  return {
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: 'APXELUZ — App & Mod Repository',
    url: `${base}/`,
    publisher: {
      '@id': `${base}/#organization`,
    },
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function resolveRouteSeoMetadata(
  route: RouteSeoState,
  options: {
    origin?: string;
    pathname?: string;
    activeItem?: Game;
    websiteSettings?: WebsiteSettings | null;
  } = {}
): ResolvedSeoMetadata {
  const origin = options.origin || DEFAULT_CANONICAL_ORIGIN;
  const pathname =
    options.pathname ||
    (route.view === 'premium'
      ? route.slug
        ? `/premium/${route.slug}`
        : '/premium'
      : route.view === 'saved'
      ? '/saved'
      : route.view === 'item-detail' && route.slug
      ? `/${route.itemType || 'mod'}/${route.slug}`
      : route.view === 'admin-login'
      ? '/admin/login'
      : route.view === 'admin-dashboard'
      ? '/admin'
      : '/');

  const canonicalUrl = buildCanonicalUrl(origin, pathname);
  const orgSchema = buildBaseOrganizationSchema(origin);
  const websiteSchema = buildWebSiteSchema(origin);

  if (route.view === 'admin-login' || route.view === 'admin-dashboard') {
    return {
      title: 'APXELUZ Admin Console',
      description: 'Authorized package maintainer workspace for APXELUZ repository releases.',
      canonicalUrl,
      ogType: 'website',
      robots: 'noindex, nofollow',
      jsonLdGraph: [orgSchema, websiteSchema],
    };
  }

  if (route.view === 'premium') {
    return {
      title: 'APXELUZ Premium Games — HD Ports & 30-Day / Lifetime Builds',
      description:
        'Browse APXELUZ Premium Android ports, remastered editions, and VIP mod packages with transparent 30-day or lifetime plans and bundled direct downloads.',
      canonicalUrl,
      ogType: 'website',
      robots: 'index, follow',
      jsonLdGraph: [
        orgSchema,
        websiteSchema,
        {
          '@type': 'CollectionPage',
          name: 'APXELUZ Premium Catalog',
          url: canonicalUrl,
          isPartOf: { '@id': `${origin.replace(/\/+$/, '')}/#website` },
        },
      ],
    };
  }

  if (route.view === 'saved') {
    return {
      title: 'Saved Items & Bookmarks | APXELUZ',
      description:
        'Review your locally bookmarked Android apps, games, and verified mods saved in APXELUZ.',
      canonicalUrl,
      ogType: 'website',
      robots: 'noindex, follow',
      jsonLdGraph: [orgSchema, websiteSchema],
    };
  }

  if (route.view === 'item-detail' && options.activeItem) {
    const item = options.activeItem;
    return {
      title: `${item.title} ${item.version} (${item.architecture}) | APXELUZ`,
      description: `${item.title} ${item.version} for ${item.minAndroid} (${item.architecture}, ${item.fileSize}). Curated release with SHA-256 verification and changelog on APXELUZ.`,
      canonicalUrl,
      ogType: 'website',
      robots: 'index, follow',
      jsonLdGraph: [
        orgSchema,
        websiteSchema,
        {
          '@type': 'SoftwareApplication',
          name: item.title,
          softwareVersion: item.version,
          operatingSystem: item.minAndroid || 'Android',
          applicationCategory: item.category || 'UtilitiesApplication',
          fileSize: item.fileSize,
          author: {
            '@type': 'Person',
            name: item.developer || item.porter || CURATOR_NAME,
          },
          publisher: {
            '@id': `${origin.replace(/\/+$/, '')}/#organization`,
          },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        },
      ],
    };
  }

  const siteTitle = options.websiteSettings?.siteName || BRAND_NAME;
  const defaultDescription =
    'Curated Android APK, game mod, and utility repository maintained by Axeluf—featuring SHA-256 checksums, VirusTotal checks, and direct links.';

  return {
    title: `${siteTitle} — Curated Android APK, Game Mod & Utility Repository`,
    description: defaultDescription,
    canonicalUrl,
    ogType: 'website',
    robots: 'index, follow',
    jsonLdGraph: [
      orgSchema,
      websiteSchema,
      {
        '@type': 'CollectionPage',
        name: `${siteTitle} App & Mod Repository`,
        url: canonicalUrl,
        description: defaultDescription,
        isPartOf: { '@id': `${origin.replace(/\/+$/, '')}/#website` },
      },
    ],
  };
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applySeoMetadataToDocument(meta: ResolvedSeoMetadata): void {
  if (typeof document === 'undefined') return;

  document.title = meta.title;
  upsertMetaTag('name', 'description', meta.description);
  upsertMetaTag('name', 'robots', meta.robots);
  upsertMetaTag('property', 'og:type', meta.ogType);
  upsertMetaTag('property', 'og:title', meta.title);
  upsertMetaTag('property', 'og:description', meta.description);
  upsertMetaTag('property', 'og:url', meta.canonicalUrl);
  upsertMetaTag('name', 'twitter:title', meta.title);
  upsertMetaTag('name', 'twitter:description', meta.description);

  let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', meta.canonicalUrl);

  const scriptId = 'apxeluz-route-jsonld';
  let jsonLdScript = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.id = scriptId;
    jsonLdScript.type = 'application/ld+json';
    document.head.appendChild(jsonLdScript);
  }
  jsonLdScript.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': meta.jsonLdGraph,
  });
}

import { PremiumGame } from '../types/premium';
import { normalizePremiumGameRecord } from './premiumPlans';

export const PREMIUM_CACHE_KEY = 'apxeluz_cached_premium_games';

export function isSupabaseMissingTableError(
  error: { code?: string; message?: string; details?: string } | string | null | undefined
): boolean {
  if (!error) return false;
  const code = typeof error === 'string' ? '' : (error.code || '');
  const message = typeof error === 'string' ? error : `${error.message || ''} ${error.details || ''}`;
  const lower = message.toLowerCase();

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    lower.includes('could not find the table') ||
    lower.includes('schema cache') ||
    (lower.includes('premium_games') && lower.includes('does not exist'))
  );
}

export function upsertPremiumGameInList(
  list: PremiumGame[],
  incoming: PremiumGame
): PremiumGame[] {
  const normalized = normalizePremiumGameRecord(incoming);
  const existingIdx = list.findIndex(
    (item) => item.id === normalized.id || (normalized.slug && item.slug === normalized.slug)
  );

  if (existingIdx !== -1) {
    const next = [...list];
    next[existingIdx] = normalized;
    return next;
  }

  return [normalized, ...list];
}

export function removePremiumGameFromList(list: PremiumGame[], id: string): PremiumGame[] {
  return list.filter((item) => item.id !== id);
}

export function mergePremiumGameLists(
  primary: PremiumGame[],
  secondary: PremiumGame[]
): PremiumGame[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const merged: PremiumGame[] = [];

  for (const item of [...primary, ...secondary]) {
    if (!item) continue;
    const normalized = normalizePremiumGameRecord(item);
    const slugKey = (normalized.slug || '').toLowerCase();
    if (seenIds.has(normalized.id) || (slugKey && seenSlugs.has(slugKey))) {
      continue;
    }
    seenIds.add(normalized.id);
    if (slugKey) seenSlugs.add(slugKey);
    merged.push(normalized);
  }

  return merged;
}

export function filterPublicPremiumGames(list: PremiumGame[]): PremiumGame[] {
  return list
    .filter((game) => game && game.isActive !== false && game.visibility !== 'draft')
    .map((game) => normalizePremiumGameRecord(game));
}

export function shouldAbortOnRestError(apiRes: {
  ok: boolean;
  status: number;
  error?: string;
  isHtml?: boolean;
}): boolean {
  if (apiRes.ok) return false;
  if (apiRes.isHtml) return false;
  if (apiRes.status === 404 || apiRes.status === 405 || apiRes.status === 0) return false;
  if (apiRes.error && apiRes.error.includes('non-JSON response')) return false;
  return apiRes.status >= 400 && apiRes.status < 500 && Boolean(apiRes.error);
}

import { PremiumGame, PremiumPaymentPlan } from '../types/premium';
import { isValidHttpUrl } from './urlValidation';

export const DEFAULT_PLAN_PRESETS: Array<{
  id: string;
  label: string;
  durationDays: number | null;
  price: number;
}> = [
  { id: 'plan-30d', label: '30 Hari', durationDays: 30, price: 20000 },
  { id: 'plan-lifetime', label: 'Lifetime', durationDays: null, price: 30000 },
];

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(safe);
}

export function formatPlanDuration(plan: Pick<PremiumPaymentPlan, 'label' | 'durationDays'>): string {
  const trimmed = (plan.label || '').trim();
  if (trimmed) return trimmed;
  if (plan.durationDays === null || plan.durationDays === undefined) {
    return 'Lifetime';
  }
  return `${plan.durationDays} Hari`;
}

export function buildDefaultPlansForGame(
  fallbackPrice?: number,
  fallbackUrl?: string
): PremiumPaymentPlan[] {
  const validFallbackUrl =
    fallbackUrl && isValidHttpUrl(fallbackUrl)
      ? fallbackUrl.trim()
      : 'https://apxeluz.my.id/premium-checkout';

  const thirtyDayPrice =
    typeof fallbackPrice === 'number' && Number.isFinite(fallbackPrice) && fallbackPrice > 0
      ? fallbackPrice
      : 20000;

  const lifetimePrice =
    thirtyDayPrice === 20000 ? 30000 : Math.round(thirtyDayPrice * 1.5);

  return [
    {
      id: 'plan-30d',
      label: '30 Hari',
      durationDays: 30,
      price: thirtyDayPrice,
      paymentUrl: validFallbackUrl,
    },
    {
      id: 'plan-lifetime',
      label: 'Lifetime',
      durationDays: null,
      price: lifetimePrice,
      paymentUrl: validFallbackUrl,
    },
  ];
}

export function normalizePaymentPlans(
  plans: Partial<PremiumPaymentPlan>[] | undefined | null,
  fallbackPrice?: number,
  fallbackUrl?: string
): PremiumPaymentPlan[] {
  if (!Array.isArray(plans) || plans.length === 0) {
    return buildDefaultPlansForGame(fallbackPrice, fallbackUrl);
  }

  const normalized: PremiumPaymentPlan[] = [];
  for (let i = 0; i < plans.length; i++) {
    const raw = plans[i];
    if (!raw) continue;

    const rawPrice = Number(raw.price);
    const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
    const durationDays =
      raw.durationDays === null || raw.durationDays === undefined || raw.durationDays === ('' as any)
        ? null
        : Number.isFinite(Number(raw.durationDays)) && Number(raw.durationDays) > 0
        ? Math.round(Number(raw.durationDays))
        : null;

    const label = formatPlanDuration({
      label: typeof raw.label === 'string' ? raw.label : '',
      durationDays,
    });

    const rawUrl = typeof raw.paymentUrl === 'string' ? raw.paymentUrl.trim() : '';
    const paymentUrl =
      rawUrl ||
      (fallbackUrl && isValidHttpUrl(fallbackUrl) ? fallbackUrl.trim() : '');

    normalized.push({
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `plan-${i + 1}`,
      label,
      durationDays,
      price,
      paymentUrl,
    });
  }

  return normalized.length > 0
    ? normalized
    : buildDefaultPlansForGame(fallbackPrice, fallbackUrl);
}

export function validatePaymentPlans(
  plans: Partial<PremiumPaymentPlan>[]
): { valid: boolean; error?: string } {
  if (!Array.isArray(plans) || plans.length === 0) {
    return { valid: false, error: 'Minimal 1 paket durasi & link pembayaran wajib diisi.' };
  }

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const indexLabel = `Paket #${i + 1}`;
    const label = (plan.label || '').trim();
    if (!label) {
      return { valid: false, error: `${indexLabel}: Label durasi (mis. 30 Hari / Lifetime) wajib diisi.` };
    }

    const price = Number(plan.price);
    if (!Number.isFinite(price) || price < 0) {
      return { valid: false, error: `${indexLabel} (${label}): Harga harus berupa angka >= 0.` };
    }

    if (plan.durationDays !== null && plan.durationDays !== undefined) {
      const days = Number(plan.durationDays);
      if (!Number.isFinite(days) || days <= 0) {
        return { valid: false, error: `${indexLabel} (${label}): Jumlah hari harus > 0 atau pilih Lifetime.` };
      }
    }

    if (!plan.paymentUrl || !isValidHttpUrl(plan.paymentUrl)) {
      return {
        valid: false,
        error: `${indexLabel} (${label}): Link pembayaran harus berupa URL http:// atau https:// yang valid.`,
      };
    }
  }

  return { valid: true };
}

export function getStartingPrice(game: Pick<PremiumGame, 'price' | 'paymentPlans'>): number {
  if (Array.isArray(game.paymentPlans) && game.paymentPlans.length > 0) {
    const prices = game.paymentPlans
      .map((p) => Number(p.price))
      .filter((p) => Number.isFinite(p) && p >= 0);
    if (prices.length > 0) {
      return Math.min(...prices);
    }
  }
  return Number.isFinite(Number(game.price)) ? Number(game.price) : 0;
}

export function normalizePremiumGameRecord(game: PremiumGame): PremiumGame {
  const paymentPlans = normalizePaymentPlans(game.paymentPlans, game.price, game.downloadUrl);
  const startingPrice = getStartingPrice({ price: game.price, paymentPlans });
  return {
    ...game,
    price: startingPrice,
    paymentPlans,
    downloadUrl: game.downloadUrl || paymentPlans[0]?.paymentUrl || '',
  };
}

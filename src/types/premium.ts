export interface PremiumPaymentPlan {
  id: string;
  label: string; // e.g. "30 Hari", "7 Hari", "Lifetime"
  durationDays: number | null; // null = Lifetime
  price: number; // in IDR (Rupiah), e.g. 20000, 30000
  paymentUrl: string; // Admin-provided payment + download redirect link
}

export interface PremiumGame {
  id: string;
  title: string;
  slug: string;
  price: number; // Starting/display price in IDR (derived from lowest plan if paymentPlans exists)
  originalPrice?: number;
  shortDescription: string;
  description: string;
  iconUrl: string;
  coverUrl: string;
  bannerUrl: string;
  screenshots: string[];
  downloadUrl?: string; // Optional legacy field; paymentUrl already includes download access
  paymentPlans: PremiumPaymentPlan[];
  version: string;
  fileSize: string;
  features?: string[];
  category?: string;
  developer?: string;
  isActive: boolean;
  visibility?: 'published' | 'draft';
  createdAt?: string;
  updatedAt?: string;
}

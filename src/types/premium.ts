export interface PremiumGame {
  id: string;
  title: string;
  slug: string;
  price: number; // in IDR (Rupiah)
  originalPrice?: number;
  shortDescription: string;
  description: string;
  iconUrl: string;
  coverUrl: string;
  bannerUrl: string;
  screenshots: string[];
  downloadUrl: string;
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

export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export interface Order {
  id: string; // e.g. ORD-1730000000-abcd
  gameId: string;
  gameTitle: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: OrderStatus;
  qiospayInvoiceId?: string;
  qiospayPaymentUrl?: string;
  qiospayQrString?: string;
  paymentMethod?: string;
  downloadToken?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface PaymentLog {
  id: string;
  orderId: string;
  invoiceId?: string;
  eventType: string;
  status: string;
  amount?: number;
  ipAddress?: string;
  signatureValid: boolean;
  createdAt: string;
}

export interface ProductAccess {
  id: string;
  orderId: string;
  gameId: string;
  customerEmail: string;
  downloadToken: string;
  downloadCount: number;
  expiresAt: string;
  createdAt: string;
}

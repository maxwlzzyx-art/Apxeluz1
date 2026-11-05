import crypto from 'crypto';

export interface QiosPayConfig {
  baseUrl: string;
  apiKey: string;
  privateKey: string;
  merchantCode: string;
  isSandbox: boolean;
}

export function getQiosPayConfig(): QiosPayConfig {
  const baseUrl = process.env.QIOSPAY_BASE_URL || 'https://my.qiospay.com';
  const apiKey = process.env.QIOSPAY_API_KEY || '';
  const privateKey = process.env.QIOSPAY_PRIVATE_KEY || '';
  const merchantCode = process.env.QIOSPAY_MERCHANT_CODE || '';
  // Sandbox mode is active if live keys aren't provided or explicit SANDBOX flag
  const isSandbox = !apiKey || !privateKey || process.env.QIOSPAY_SANDBOX === 'true';

  return {
    baseUrl,
    apiKey,
    privateKey: privateKey || 'sandbox_private_key_default_2026',
    merchantCode,
    isSandbox,
  };
}

export interface CreateInvoiceParams {
  refId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  productName: string;
  returnUrl?: string;
  callbackUrl?: string;
}

export interface InvoiceResult {
  success: boolean;
  invoiceId: string;
  paymentUrl: string;
  qrString?: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  error?: string;
  isSandbox?: boolean;
}

/**
 * Verify HMAC-SHA256 signature for QiosPay webhook.
 * Formula: HMAC-SHA256(PRIVATE_KEY, timestamp + "." + raw_body)
 * Uses crypto.timingSafeEqual() to prevent timing attacks.
 */
export function verifyQiosPaySignature(params: {
  rawBody: string | Buffer;
  timestamp: string | number;
  signature: string;
  privateKey?: string;
}): { isValid: boolean; reason?: string } {
  const { rawBody, timestamp, signature } = params;
  const privateKey = params.privateKey || getQiosPayConfig().privateKey;

  if (!signature || !timestamp) {
    return { isValid: false, reason: 'Missing signature or timestamp' };
  }

  // 1. Timestamp tolerance verification (max 10 minutes = 600,000 ms)
  const now = Date.now();
  const tsNumber = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

  // Handle both second and millisecond timestamps
  const tsMs = tsNumber < 1e11 ? tsNumber * 1000 : tsNumber;
  const toleranceMs = 10 * 60 * 1000;

  if (isNaN(tsMs) || Math.abs(now - tsMs) > toleranceMs) {
    return {
      isValid: false,
      reason: `Timestamp tolerance exceeded (diff: ${Math.round(Math.abs(now - tsMs) / 1000)}s, max: 600s)`,
    };
  }

  // 2. Compute expected HMAC-SHA256
  const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const payloadToSign = `${timestamp}.${bodyString}`;

  const expectedSignatureHex = crypto
    .createHmac('sha256', privateKey)
    .update(payloadToSign)
    .digest('hex');

  // Compare buffers with timingSafeEqual
  const sigBuffer = Buffer.from(signature.toLowerCase(), 'hex');
  const expectedBuffer = Buffer.from(expectedSignatureHex.toLowerCase(), 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return { isValid: false, reason: 'Signature buffer length mismatch' };
  }

  const matches = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  if (!matches) {
    return { isValid: false, reason: 'Cryptographic HMAC mismatch' };
  }

  return { isValid: true };
}

/**
 * Generate a signature for webhook testing / simulation
 */
export function generateQiosPaySignature(
  rawBody: string,
  timestamp: string | number,
  privateKey?: string
): string {
  const key = privateKey || getQiosPayConfig().privateKey;
  return crypto.createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest('hex');
}

/**
 * Create invoice via QiosPay API or simulated sandbox.
 */
export async function createQiosPayInvoice(params: CreateInvoiceParams): Promise<InvoiceResult> {
  const config = getQiosPayConfig();

  // If live credentials are provided and sandbox is false, call real QiosPay API
  if (!config.isSandbox && config.apiKey) {
    try {
      const response = await fetch(`${config.baseUrl}/api/v1/invoice/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify({
          ref_id: params.refId,
          merchant_code: config.merchantCode,
          amount: params.amount,
          customer_name: params.customerName,
          customer_email: params.customerEmail,
          product_name: params.productName,
          return_url: params.returnUrl,
          callback_url: params.callbackUrl,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return {
          success: true,
          invoiceId: data.data?.invoice_id || `INV-${Date.now()}`,
          paymentUrl: data.data?.payment_url || `${config.baseUrl}/pay/${data.data?.invoice_id}`,
          qrString: data.data?.qr_string,
          amount: params.amount,
          status: 'PENDING',
          isSandbox: false,
        };
      } else {
        return {
          success: false,
          invoiceId: '',
          paymentUrl: '',
          amount: params.amount,
          status: 'FAILED',
          error: data.message || 'QiosPay invoice creation rejected',
          isSandbox: false,
        };
      }
    } catch (err: any) {
      console.warn('Live QiosPay invoice call error, falling back to sandbox simulation:', err);
    }
  }

  // Sandbox simulation mode (requirement 5: Implementasikan terlebih dahulu dalam mode sandbox)
  const invoiceId = `QP-SANDBOX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const simulatedPaymentUrl = `${config.baseUrl}/sandbox/checkout?inv=${invoiceId}&ref=${params.refId}&amt=${params.amount}`;
  // Simulated QRIS payload
  const qrString = `00020101021226680016ID.CO.QIOSPAY.WWW01189360099900000000010215${invoiceId}520458125303360540${params.amount}5802ID5911APXELUZ6007JAKARTA6304`;

  return {
    success: true,
    invoiceId,
    paymentUrl: simulatedPaymentUrl,
    qrString,
    amount: params.amount,
    status: 'PENDING',
    isSandbox: true,
  };
}

/**
 * Generate a secure, time-limited cryptographic download token for purchased games.
 */
export function generateDownloadAccessToken(params: {
  orderId: string;
  gameId: string;
  customerEmail: string;
  expiresInHours?: number;
}): { token: string; expiresAt: string } {
  const expiresInHours = params.expiresInHours || 24;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
  const secret = process.env.TOKEN_SECRET || 'apxeluz_download_security_token_salt_2026';

  const payload = `${params.orderId}|${params.gameId}|${params.customerEmail}|${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 32);
  const token = Buffer.from(`${payload}|${signature}`).toString('base64url');

  return { token, expiresAt };
}

/**
 * Verify a cryptographic download access token.
 */
export function verifyDownloadAccessToken(token: string): {
  valid: boolean;
  orderId?: string;
  gameId?: string;
  customerEmail?: string;
  expired?: boolean;
  reason?: string;
} {
  try {
    const secret = process.env.TOKEN_SECRET || 'apxeluz_download_security_token_salt_2026';
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('|');

    if (parts.length !== 5) {
      return { valid: false, reason: 'Invalid token structure' };
    }

    const [orderId, gameId, customerEmail, expiresAt, providedSignature] = parts;

    // Check expiration
    if (new Date(expiresAt).getTime() < Date.now()) {
      return { valid: false, expired: true, reason: 'Download token has expired' };
    }

    // Verify signature
    const payload = `${orderId}|${gameId}|${customerEmail}|${expiresAt}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 32);

    const sigBuf = Buffer.from(providedSignature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, reason: 'Invalid token cryptographic signature' };
    }

    return {
      valid: true,
      orderId,
      gameId,
      customerEmail,
    };
  } catch (err) {
    return { valid: false, reason: 'Token parsing failure' };
  }
}

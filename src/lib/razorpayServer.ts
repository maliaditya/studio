import Razorpay from 'razorpay';

let cachedRazorpayClient: Razorpay | null = null;
let cachedKeyId = '';
let cachedKeySecret = '';

export const getRazorpayKeyId = (): string => (process.env.RAZORPAY_KEY_ID || '').trim();
export const getRazorpayKeySecret = (): string => (process.env.RAZORPAY_KEY_SECRET || '').trim();

export const isRazorpayConfigured = (): boolean => Boolean(getRazorpayKeyId() && getRazorpayKeySecret());

export const getRazorpayClient = (): Razorpay => {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment.');
  }

  if (!cachedRazorpayClient || cachedKeyId !== keyId || cachedKeySecret !== keySecret) {
    cachedRazorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
    cachedKeyId = keyId;
    cachedKeySecret = keySecret;
  }

  return cachedRazorpayClient;
};

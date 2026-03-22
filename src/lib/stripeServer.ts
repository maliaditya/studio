import Stripe from 'stripe';

let cachedStripeClient: Stripe | null = null;
let cachedStripeKey = '';

export const getStripeSecretKey = (): string => (process.env.STRIPE_SECRET_KEY || '').trim();

export const isStripeConfigured = (): boolean => Boolean(getStripeSecretKey());

export const getStripeClient = (): Stripe => {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.');
  }

  if (!cachedStripeClient || cachedStripeKey !== secretKey) {
    cachedStripeClient = new Stripe(secretKey);
    cachedStripeKey = secretKey;
  }

  return cachedStripeClient;
};

import Stripe from 'stripe';

export function getStripeClient() {
  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    const error = new Error('Stripe configuration missing');
    error.status = 500;
    error.code = 'STRIPE_CONFIG_MISSING';
    throw error;
  }
  return new Stripe(secretKey);
}

export function getStripePriceId() {
  const priceId = (process.env.STRIPE_PRICE_ID || '').trim();
  if (!priceId) {
    const error = new Error('Stripe price configuration missing');
    error.status = 500;
    error.code = 'STRIPE_PRICE_CONFIG_MISSING';
    throw error;
  }
  return priceId;
}

import Stripe from 'stripe';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const packages = JSON.parse(readFileSync(new URL('../shared/coin-packages.json', import.meta.url), 'utf8'));

function packageById(id) {
  return packages.find(pkg => pkg.id === id) || null;
}

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const error = new Error('Stripe is not configured. Add a restricted key as STRIPE_SECRET_KEY.');
    error.status = 503;
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }
  return new Stripe(key, { apiVersion: '2026-09-30.endive' });
}

function integrationLabel() {
  const suffix = randomBytes(6).toString('hex').slice(0, 8);
  return `ggslots_coin_store_${suffix}`;
}

export function publicOrigin(headers, fallback = 'http://127.0.0.1:3000') {
  const host = String(headers['x-forwarded-host'] || headers.host || '').split(',')[0].trim();
  if (!host) return fallback;
  const forwarded = headers['x-forwarded-proto'];
  const local = host.includes('localhost') || host.startsWith('127.') || host.startsWith('0.0.0.0');
  const proto = forwarded ? String(forwarded).split(',')[0].trim() : (local ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function createCheckoutSession({ packageId, userId, origin }) {
  const pkg = packageById(packageId);
  if (!pkg) {
    const error = new Error('Unknown coin package.');
    error.status = 400;
    throw error;
  }
  if (!userId) {
    const error = new Error('Sign in before buying coins.');
    error.status = 401;
    throw error;
  }

  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: String(userId),
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancel`,
    metadata: {
      packageId: pkg.id,
      userId: String(userId),
      gcAmount: String(pkg.gcAmount),
      scAmount: String(pkg.scAmount),
      price: String(pkg.price)
    },
    integration_identifier: integrationLabel(),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(pkg.price * 100),
          product_data: {
            name: `${Number(pkg.gcAmount).toLocaleString('en-US')} Gold Coins`,
            description: 'Entertainment Gold Coins. Any Sweeps Cash listed with this package is a free promotional entry, not the item being sold.'
          }
        }
      }
    ]
  });

  return { url: session.url, payment_id: session.id };
}

async function paymentIntentOf(stripe, session) {
  const intent = session.payment_intent;
  if (!intent) return null;
  if (typeof intent === 'string') return stripe.paymentIntents.retrieve(intent);
  return intent;
}

export async function readCheckoutSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    const error = new Error('Missing checkout session.');
    error.status = 400;
    throw error;
  }
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paid = session.payment_status === 'paid';
  const intent = paid ? await paymentIntentOf(stripe, session) : null;
  const alreadyFulfilled = intent?.metadata?.gg_credited === '1';

  if (paid && intent && !alreadyFulfilled) {
    await stripe.paymentIntents.update(intent.id, {
      metadata: { ...intent.metadata, gg_credited: '1' }
    });
  }

  return {
    paid,
    pending: !paid,
    credit: paid && !alreadyFulfilled,
    alreadyFulfilled: paid && alreadyFulfilled,
    packageId: session.metadata?.packageId || '',
    userId: session.metadata?.userId || session.client_reference_id || '',
    gcAmount: Number(session.metadata?.gcAmount || 0),
    scAmount: Number(session.metadata?.scAmount || 0),
    price: Number(session.metadata?.price || 0)
  };
}

export async function handleStripeWebhook(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    const error = new Error('STRIPE_WEBHOOK_SECRET is not set.');
    error.status = 503;
    throw error;
  }
  const stripe = stripeClient();
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return { received: true, ignored: event.type };
  }
  const session = event.data.object;
  if (session.payment_status !== 'paid') {
    return { received: true, pending: true };
  }
  await readCheckoutSession(session.id);
  return { received: true };
}

export function errorPayload(error) {
  return {
    status: error.status || 400,
    body: { error: error.message || 'Payment failed', code: error.code || 'PAYMENT_ERROR' }
  };
}

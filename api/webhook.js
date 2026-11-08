import { errorPayload, handleStripeWebhook } from '../server/stripe.mjs';

async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const result = await handleStripeWebhook(await rawBody(req), req.headers['stripe-signature']);
    res.status(200).json(result);
  } catch (error) {
    const payload = errorPayload(error);
    res.status(payload.status).json(payload.body);
  }
}

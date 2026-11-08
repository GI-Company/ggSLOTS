import { createCheckoutSession, errorPayload, publicOrigin } from '../server/stripe.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const result = await createCheckoutSession({
      packageId: body.packageId,
      userId: body.userId,
      origin: publicOrigin(req.headers)
    });
    res.status(200).json(result);
  } catch (error) {
    const payload = errorPayload(error);
    res.status(payload.status).json(payload.body);
  }
}

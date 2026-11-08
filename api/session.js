import { errorPayload, readCheckoutSession } from '../server/stripe.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    const result = await readCheckoutSession(url.searchParams.get('session_id'));
    res.status(200).json(result);
  } catch (error) {
    const payload = errorPayload(error);
    res.status(payload.status).json(payload.body);
  }
}

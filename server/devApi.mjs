import { createCheckoutSession, errorPayload, handleStripeWebhook, publicOrigin, readCheckoutSession } from './stripe.mjs';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function read(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function stripeDevMiddleware() {
  return async (req, res, next) => {
    const url = req.url || '';
    if (!url.startsWith('/api/')) return next();
    try {
      if (url.startsWith('/api/checkout') && req.method === 'POST') {
        const body = JSON.parse((await read(req)).toString() || '{}');
        const result = await createCheckoutSession({
          packageId: body.packageId,
          userId: body.userId,
          origin: publicOrigin(req.headers)
        });
        return send(res, 200, result);
      }
      if (url.startsWith('/api/session') && req.method === 'GET') {
        const sessionId = new URL(url, 'http://localhost').searchParams.get('session_id');
        return send(res, 200, await readCheckoutSession(sessionId));
      }
      if (url.startsWith('/api/webhook') && req.method === 'POST') {
        const raw = await read(req);
        return send(res, 200, await handleStripeWebhook(raw, req.headers['stripe-signature']));
      }
      return send(res, 404, { error: 'Not found' });
    } catch (error) {
      const payload = errorPayload(error);
      return send(res, payload.status, payload.body);
    }
  };
}

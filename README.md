# GGSlots

**Status: free-play preview — not a production casino, sweepstakes, or payment system.**

React 18 + TypeScript + Vite with Gold Coin demonstration games. The playable games
branch adds Slots, Plinko, Blackjack, Video Poker, Scratch, Bingo, Nebula Mines,
Orbit Crash, and Solar Roulette.

## What works

- The frontend renders in Vercel with a responsive game lobby.
- Gold Coin demo rounds settle in the current browser using local storage.
- Guest play requires no account or personal information.
- Automated smoke tests cover game mathematics and free-play settlement.
- A single GitHub pull request tracks changes before any production rollout.

**All Gold Coin balances are simulation data with no monetary value.** Browser
storage can be cleared, modified, or lost. The demo pool is **not** a shared
cross-device prize pool. It must never be used for real-money games.

## Disabled intentionally

- Checkout and payment session confirmation (server returns `503 COMMERCE_DISABLED`).
- Stripe webhook fulfillment and browser-side payment crediting.
- Sweeps Cash game mode, cash prizes, and redemptions.
- Browser-local password accounts and mock KYC document collection.
- All server-side game/wallet RPCs until a reviewed backend is implemented.

Connecting a production Stripe key, Supabase key, or custom domain does not
turn these features back on.

## Development

```bash
npm ci
npm test
npm run build
npm run dev
```

A local `.env` may provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`,
but they are not needed for the free-play demo. Never commit secrets.

## Release gates — required before offering paid coins or prizes

1. **Legal/payment review:** Obtain jurisdiction-specific legal advice for the
   proposed sweepstakes model and documented, explicit payment processor approval.
2. **Account security:** Use verified server-side authentication, securely
   maintained sessions, age verification, self-exclusion and other safeguards.
   Do not store passwords, government IDs, or financial data in local storage.
3. **Authoritative wallet:** Implement an append-only ledger, transactional
   balance accounting, uniqueness/idempotency constraints, RLS review,
   server-side random outcome generation, and concurrency tests.
4. **Settlement:** Verify signatures for payment callbacks, bind purchases to
   an authenticated user, verify amount/currency/package on the server, and
   commit fulfillment atomically. Do not use Stripe metadata as a ledger.
5. **Abuse controls:** Add server-enforced limits, jurisdiction checks,
   monitored fraud controls, audit trails and privacy/security review.
6. **Quality:** Add unit, integration, E2E and accessibility tests; audit
   mobile layouts and document recovery/rollback procedures.

The repository previously described its architecture as "ACID compliant",
"server authoritative", and "production ready". Those claims do **not** reflect
the current implementation. The `supabase/schema.sql` file and migration
are placeholders; they do not provide the claimed wallet or RPC functions.

See the changes on the existing PR before promoting any build to production.

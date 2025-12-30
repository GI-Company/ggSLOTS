# GGSlots - Enterprise Social Casino Platform

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Security](https://img.shields.io/badge/Security-ACID%20Compliant-blue)
![Stack](https://img.shields.io/badge/Tech-React%20%7C%20Supabase%20%7C%20PostgreSQL-purple)

**GGSlots** is a reference architecture for a high-concurrency, real-time Social Casino built on the **PERN** (Postgres, Express-replacement via Supabase, React, Node) stack. It demonstrates how to handle financial-grade transactions, inventory locking, and deterministic game logic in a serverless environment.

> **⚠️ Architectural Note:** This project strictly enforces a **Server-Authoritative / Client-Predictive** model. The frontend contains no business logic regarding balance calculations or game outcomes. All outcomes are calculated via PostgreSQL Stored Procedures.

---

## 📚 Table of Contents

- [System Architecture](#-system-architecture)
- [The "Iron Laws" of Consistency](#-the-iron-laws-of-consistency)
- [Features & Games](#-features--games)
- [Database & Schema](#-database--schema)
- [Getting Started (Local Development)](#-getting-started-local-development)
- [Security & Compliance](#-security--compliance)
- [Payments & Economy](#-payments--economy)
- [Project Structure](#-project-structure)

---

## 🏗 System Architecture

The application is architected to handle 1,000+ concurrent users without data inconsistency. It leverages PostgreSQL's locking mechanisms (`SELECT ... FOR UPDATE`) to ensure atomic balance updates.

```mermaid
graph TD
    User[User Client] -->|1. Auth JWT| Auth[Supabase Auth]
    User -->|2. Game Action (RPC)| API[Postgres RPC Interface]
    
    subgraph Core [Trusted Core - PostgreSQL 15]
        API -->|Lock Row| Wallets[(Profiles Table)]
        API -->|CSPRNG| Logic[PL/pgSQL Logic]
        Logic -->|Commit Tx| Ledger[(Game History)]
        Logic -->|Update Balance| Wallets
    end
    
    Wallets -->|3. Emit Event (WAL)| Realtime[Supabase Realtime]
    Realtime -->|4. Push Balance Update| User
    
    User -->|5. Crypto Payment| NOW[NOWPayments Widget]
    NOW -->|6. Webhook| Edge[Supabase Edge Function]
    Edge -->|7. Credit Account| API
```

---

## 🛡 The "Iron Laws" of Consistency

To maintain integrity in a distributed environment, the codebase adheres to these strict rules:

1.  **RPC-Only Mutation**: The frontend is strictly forbidden from calling `UPDATE` or `INSERT` on balance tables directly. All writes must go through Stored Procedures.
2.  **Atomic Transactions**: Every game spin uses `SELECT ... FOR UPDATE` to lock the user's wallet row. This prevents race conditions (e.g., a user spinning in two tabs simultaneously to double-spend).
3.  **Inventory Concurrency**: Limited items (like specific Scratch Card tiers) use `FOR UPDATE SKIP LOCKED` to ensure high-throughput without deadlocks.
4.  **Audit Trails**: Every balance change is accompanied by an immutable insert into the `game_history` ledger.

---

## 🎰 Features & Games

### Core Platform
*   **Dual Currency System**: 
    *   **Gold Coins (GC)**: For entertainment only.
    *   **Sweeps Cash (SC)**: Redeemable currency ($1.00 USD value).
*   **KYC Verification**: Multi-stage identity verification flow (ID Front/Back, Selfie) required before redemption.
*   **Geo-Blocking**: automatically restricts access from banned US states (WA, MI, NY, etc.) via IP analysis.

### Game Catalog
1.  **Slots (Cosmic Cash)**
    *   *Engine:* Server-side reel strip mapping.
    *   *Features:* Free Spins, Sticky Wilds, Expanding Multipliers.
    *   *Math:* 96% RTP (Return to Player) calculated via weighted strip generation.
    
2.  **Plinko (Physics Engine)**
    *   *Engine:* Custom 2D verlet integration physics on Canvas.
    *   *Sync:* Client simulates physics visuals, but the *bucket* is predetermined by the server RNG before the ball drops.
    
3.  **Blackjack (State Machine)**
    *   *Engine:* Full standard deck implementation.
    *   *Logic:* Supports Hit, Stand, Double Down, Split. Dealer hits on soft 17.
    
4.  **Bingo Blast (Multi-Agent)**
    *   *Engine:* Simulated bot competition.
    *   *Performance:* Handles card pattern matching for 4 player cards + 3 bot opponents simultaneously.

---

## 💾 Database & Schema

The backend relies on `supabase/schema.sql` to define the structure.

### Key Tables
| Table | Description | RLS Policy |
| :--- | :--- | :--- |
| `profiles` | Extends auth.users. Holds balances & KYC status. | Users view own. Only RPC can update. |
| `games` | Configuration for volatility, RTP, and assets. | Public Read. |
| `game_history` | Immutable ledger of every wager and payout. | Users view own. Insert via RPC only. |
| `payment_transactions` | Logs fiat/crypto ingress. | Private. |

### Critical RPC Functions
*   `execute_atomic_transaction`: The heart of the casino. Takes wager, verifies balance, locks row, calculates outcome, updates balance, and logs history in a SINGLE transaction block.
*   `purchase_package`: Handles the conversion of USD to GC/SC.
*   `redeem_sc`: Handles the safe debiting of Sweeps Cash for payout.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
*   Node.js 18+
*   NPM or Yarn
*   A Supabase Project (Free Tier works)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-org/ggslots.git
    cd ggslots
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Database**
    *   Log in to your Supabase Dashboard.
    *   Go to the **SQL Editor**.
    *   Copy the contents of `supabase/schema.sql`.
    *   Run the query to create tables and functions.

4.  **Environment Variables**
    Create a `.env` file in the root:
    ```env
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-public-anon-key
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 🔐 Security & Compliance

### CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
We do not use `Math.random()` for game logic. All outcomes are generated using `pgcrypto`'s `gen_random_bytes()` on the server or `window.crypto.getRandomValues()` for visual seeds.

### Row Level Security (RLS)
Every table has RLS enabled.
*   `anon` role: Can read game configs.
*   `authenticated` role: Can read own profile and history.
*   `service_role`: Used only by Edge Functions for webhooks.

---

## 💳 Payments & Economy

### Ingress (Deposits)
Integration with **NOWPayments** for crypto processing.
1.  User selects package.
2.  Frontend generates a unique Invoice ID.
3.  Widget processes payment.
4.  Webhook triggers `purchase_package` RPC.

### Egress (Redemptions)
*   Manual review process for all redemptions > $2,000.
*   Automated checking of `redeemable_sc` vs `sc_balance` to prevent laundering.

---

## 📂 Project Structure

```
/
├── components/          # React UI Components
│   ├── BlackjackGame.tsx
│   ├── PlinkoGame.tsx
│   ├── SlotGame.tsx
│   ├── Lobby.tsx
│   └── ...
├── services/           # API Layers
│   ├── supabaseService.ts  # RPC Wrappers
│   ├── complianceService.ts # Geo/RNG Utils
│   └── geoService.ts
├── supabase/
│   └── schema.sql      # Database Migrations
├── types/              # TypeScript Interfaces
├── constants.ts        # Game Configs (Paylines, RTP)
├── App.tsx             # Main Router
└── main.tsx            # Entry Point
```

---

**© 2023 GGSlots Architecture.**  
*This is a reference architecture for educational purposes. Ensure you comply with all local laws regarding social gaming and sweepstakes before deploying.*
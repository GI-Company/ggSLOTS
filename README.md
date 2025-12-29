
# GGSlots - Distributed Social Casino Architecture

**A high-concurrency, ACID-compliant gaming platform built on PostgreSQL and React.**

> **Architecture Status:** Production Ready (RPC-Only Write Pattern)
> **License:** MIT

---

## 🏗️ System Architecture

This application strictly follows a **"Zero-Trust Client"** architecture. No business logic regarding balances, game outcomes, or inventory management exists in the frontend JavaScript. The React client acts purely as a presentation layer and a Realtime WebSocket receiver.

```mermaid
graph TD
    User[User Client] -->|1. Auth (JWT)| Auth[Supabase Auth]
    User -->|2. Read Data (SELECT)| RLS[Row Level Security]
    User -->|3. Game Action (RPC)| API[Postgres Stored Procedures]
    
    subgraph "The Trusted Core (PostgreSQL)"
        API -->|Lock Row| Wallets[(Wallets Table)]
        API -->|Calculate Outcome| Logic[PL/pgSQL Logic]
        Logic -->|Commit Tx| Ledger[(Game History)]
        Logic -->|Update Balance| Wallets
    end
    
    Wallets -->|4. Emit Event (WAL)| Realtime[Supabase Realtime]
    Realtime -->|5. Push Balance Update| User
```

---

## 🔰 The "Iron Laws" (Development Rules)

1.  **RPC-Only Mutation**: The frontend is forbidden from calling `UPDATE` or `INSERT` on balance tables. All writes must go through Stored Procedures (Remote Procedure Calls).
2.  **Atomic Transactions**: Every game spin uses `SELECT ... FOR UPDATE` to lock the user's wallet row, preventing race conditions (e.g., double-spending via multi-tabbing).
3.  **Inventory Concurrency**: Limited items (Scratch Cards) use `FOR UPDATE SKIP LOCKED` to ensure two users never buy the same ticket, even under high load.
4.  **Defense-in-Depth**: All database tables have RLS policies enabled. `service_role` keys are never exposed.

---

## 💾 Database Schema (Blueprints)

The backend logic relies on this specific SQL schema structure:

### 1. `profiles` (Public View)
Extends the internal `auth.users` table.
- `id`: UUID (Primary Key)
- `gc_balance`: BigInt (Gold Coins - Social Currency)
- `sc_balance`: BigInt (Sweeps Cash - Redeemable Currency)
- `vip_level`: Enum

### 2. `game_history` (Immutable Ledger)
A write-only audit trail of every transaction.
- `id`: UUID (Idempotency Key)
- `user_id`: UUID
- `game_type`: Text
- `wager_amount`: BigInt
- `payout_amount`: BigInt
- `outcome_data`: JSONB (Reel positions, card hands, etc.)

### 3. `games` (Stateful Session Store)
Used for multi-step games like Blackjack.
- `stage`: 'active' | 'settled'
- `dealer_hand`: JSONB array
- `player_hand`: JSONB array
- `deck`: JSONB array (The remaining shoe)

---

## ⚡ Server-Side Logic (RPCs)

The "Brain" of the casino lives in `services/supabaseService.ts` mapping to these SQL functions:

### `execute_atomic_transaction` (Slots / Plinko)
*   **Inputs:** `wager`, `game_id`, `payout` (calculated server-side or verified).
*   **Logic:** 
    1. Locks `profiles` row.
    2. Verifies `balance >= wager`.
    3. Updates balance.
    4. Inserts `game_history`.
*   **Returns:** New Balance.

### `buy_ticket_dual_currency` (Scratch Cards)
*   **Logic:**
    1. Pops a pre-generated ticket from `ticket_pool`.
    2. Uses `SKIP LOCKED` to handle 1000+ concurrent buyers.
    3. If pool is empty, transaction aborts.

### `start_blackjack` / `hit` / `stand`
*   **Logic:** The shuffling and dealing happen inside the database. The client only receives the visible cards.

---

## 📡 Realtime Event Bus

The frontend uses **Optimistic UI** backed by **Realtime Confirmation**.

1.  **Balance Sync:** `useWallet` hook subscribes to `postgres_changes` on the `profiles` table.
    *   *Effect:* If you play on Desktop, your Mobile balance updates instantly.
2.  **Game Events:** (Optional) High-frequency updates (mouse cursors, chat) are sent via `supabase.channel().send()` using Ephemeral Broadcasts to save DB write costs.

---

## 🚀 Deployment & Setup

### 1. Environment Variables
Create a `.env` file:
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_public_anon_key
```

### 2. Database Migration
Run the SQL scripts provided in the `sql/` folder (conceptually) in your Supabase SQL Editor:
1.  **Schema Setup**: Tables & RLS Policies.
2.  **Functions**: The PL/pgSQL RPCs.
3.  **Seed Data**: Populate Scratch Card pools.

### 3. Run Client
```bash
npm install
npm run dev
```

### 4. Mock Mode (Fallback)
If no Supabase credentials are provided, the app falls back to `lib/supabaseClient.ts` -> `null`, triggering the local simulation mode in `services/supabaseService.ts`.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18, TypeScript, Vite
*   **UI System:** Tailwind CSS, Lucide React, Glassmorphism design
*   **State Management:** React Hooks + Supabase Realtime Subscription
*   **Backend:** Supabase (PostgreSQL 15)
*   **Animation:** CSS Transitions, Canvas API (Scratch Cards)


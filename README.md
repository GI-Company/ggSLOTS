# GGSlots - Cosmic Casino 🎰

A premium, responsive social casino web application built with React, TypeScript, and Tailwind CSS. Experience cosmic-themed slots with real-time mechanics, daily rewards, and a dual-currency economy (Gold Coins & Sweeps Cash).

## 🌟 Features

- **Immersive Slot Engine**: Custom-built slot machine logic with realistic reel spins, easing animations, and visual effects.
- **Multiple Game Themes**: 
  - *Cosmic Cash* (Space/Neon)
  - *Pyramid Riches* (Egyptian)
  - *Viking Victory* (Norse)
- **Dual Currency System**:
  - **Gold Coins (GC)**: Free-to-play currency for entertainment.
  - **Sweeps Cash (SC)**: Redeemable currency with sweepstakes mechanics.
- **Real-time Updates**: Powered by Supabase Realtime, user balances and transaction history update instantly across devices.
- **Authentication**: Full guest play support, email login/registration, and persistent sessions.
- **Daily Rewards**: Automatic daily login bonuses and streak tracking.
- **Responsive Design**: Mobile-first layout with a collapsible sidebar and touch-friendly controls.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime)
- **Icons/Assets**: Custom SVG symbols and Lucide React icons

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- A Supabase project (optional for local mock mode, required for full features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ggslots.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the root directory. If these are omitted, the app falls back to a strictly local **Mock Mode**.

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the App

```bash
npm run dev
```

## 🎲 Game Logic

The application uses a hybrid approach for game logic:
1. **Server-Side (RPC)**: When connected to Supabase, spins are processed via a PostgreSQL RPC function `execute_atomic_transaction` to ensure ACID compliance for balance updates and win calculations.
2. **Client-Side (Mock)**: In demo/guest mode, a deterministic PRNG (Pseudo-Random Number Generator) simulates server logic locally for a seamless experience.

### Symbols & Payouts
Each game loads specific assets defined in `constants.ts`. The engine checks for paylines (lines across reels) and Scatter symbols (bonus triggers).

## 📂 Project Structure

- `/components`: UI components (Lobby, SlotGame, Modals, etc.)
- `/services`: Supabase and Game Logic services.
- `/types`: TypeScript definitions for Users, Games, and History.
- `/constants`: Game configurations, assets, and math settings.
- `/lib`: Supabase client initialization.

## 🔒 Security

- **Row Level Security (RLS)**: Database policies ensure users can only access their own data.
- **Idempotency**: Spin requests generate unique keys to prevent double-spending or duplicate processing on network retries.

---

*Note: This project is a social casino simulation. No real money gambling is involved in the mock/demo environment.*
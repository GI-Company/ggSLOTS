
export enum CurrencyType {
  GC = 'GC',
  SC = 'SC'
}

export type ViewType = 'main' | 'promotions' | 'vip' | 'get-coins' | 'redeem' | 'game' | 'history' | 'sweeps-rules';

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  // Personal Details
  firstName?: string;
  lastName?: string;
  dob?: string; // YYYY-MM-DD
  
  // Location (Locked after registration)
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;

  // Security & Compliance
  kycStatus: KycStatus;
  isAddressLocked: boolean; // True after initial set

  // Balances & Status
  gcBalance: number;
  scBalance: number;
  vipLevel: string;
  hasUnlockedRedemption: boolean;
  redeemableSc: number;
  isGuest?: boolean; // Flag for demo accounts
  lastLogin?: number; // Timestamp
  consecutiveDays?: number; // For daily bonus tracking
  tenantId?: string; // Multi-tenancy scope
}

export interface GameConfig {
  id: string;
  title: string;
  image: string;
  tag?: string;
  category?: 'Slots' | 'Table' | 'Instant'; // Explicit Category for Lobby Filtering
  volatility: string;
  minWager: string;
  maxWager: string;
  maxMultiplier: string;
  isDemo?: boolean; // Controls if game is playable without login
  rules?: string; // Description for rules modal
  // New Visual Props for Scalability
  style?: {
      background?: string; // CSS gradient or Image URL
      accentColor?: string; // Hex code for borders/buttons
      symbolSet?: string; // 'base', 'egypt', 'neon', etc.
  }
}

export interface CoinPackage {
  id: string;
  price: number;
  gcAmount: number;
  scAmount: number;
  isBestValue: boolean;
}

export interface WinResult {
  totalWin: number;
  winningLines: { lineIndex: number; symbol: string; amount: number }[];
  isBigWin: boolean;
  freeSpinsWon: number;
  bonusText: string;
  stopIndices: number[]; // Critical for aligning visuals with math
  plinkoOutcome?: {
      path: number[]; // 0 (Left) or 1 (Right) direction for each row
      bucketIndex: number;
      multiplier: number;
      rows: number;
      risk: 'Low' | 'Medium' | 'High';
  };
  scratchOutcome?: ScratchTicket;
}

// Updated to match 'transaction_events' table in SQL
export interface GameHistoryEntry {
  id: string;
  activityId: string; // Was gameId
  timestamp: number;
  debit: number;    // Was wager
  credit: number;   // Was payout
  currency: CurrencyType;
  result: 'WIN' | 'LOSS' | 'SUCCESS'; // Outcome state
}

export interface SessionEntry {
  id: string;
  startTime: number;
  endTime?: number;
  device: string;
}

// --- BLACKJACK TYPES ---

export interface Card {
  suit: 'H' | 'D' | 'C' | 'S';
  rank: string;
  value: number;
}

export interface BlackjackState {
  id: string;
  deck: Card[];
  player_hand: Card[];
  dealer_hand: Card[];
  player_score: number;
  dealer_score: number;
  status: 'active' | 'player_bust' | 'dealer_bust' | 'player_win' | 'dealer_win' | 'push';
  wager: number;
  currency: CurrencyType;
  payout: number;
}

// --- POKER TYPES ---
export interface PokerState {
    id: string;
    deck: Card[];
    hand: Card[];
    stage: 'deal' | 'draw' | 'over';
    heldIndices: number[]; // Indices of cards held by player
    wager: number;
    currency: CurrencyType;
    winAmount: number;
    handName: string; // e.g., "Full House"
}

// --- SCRATCH TYPES ---
export interface ScratchTicket {
    grid: string[]; // 9 symbols
    prize: number;
    currency: CurrencyType;
    isWin: boolean;
    cost: number;
    tier: 'jackpot' | 'high' | 'mid' | 'low' | 'loser';
}

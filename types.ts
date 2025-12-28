
export enum CurrencyType {
  GC = 'GC',
  SC = 'SC'
}

export type ViewType = 'main' | 'promotions' | 'vip' | 'get-coins' | 'redeem' | 'game' | 'history';

export interface UserProfile {
  id: string;
  email: string;
  // Personal Details
  firstName?: string;
  lastName?: string;
  dob?: string; // YYYY-MM-DD
  
  // Location
  city?: string;
  state?: string;
  zip?: string;

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
  volatility: string;
  minWager: string;
  maxWager: string;
  maxMultiplier: string;
  isDemo?: boolean; // Controls if game is playable without login
}

export interface CoinPackage {
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

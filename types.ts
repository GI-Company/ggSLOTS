
export enum CurrencyType {
  GC = 'GC',
  SC = 'SC'
}

export type ViewType = 'main' | 'promotions' | 'vip' | 'get-coins' | 'redeem' | 'game' | 'history' | 'sweeps-rules';

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  kycStatus: KycStatus;
  isAddressLocked: boolean;
  gcBalance: number;
  scBalance: number;
  vipLevel: string;
  hasUnlockedRedemption: boolean;
  redeemableSc: number;
  isGuest?: boolean;
  lastLogin?: number;
  consecutiveDays?: number;
  tenantId?: string;
}

export interface GameConfig {
  id: string;
  title: string;
  image: string;
  tag?: string;
  category?: 'Slots' | 'Table' | 'Instant';
  volatility: string;
  minWager: string;
  maxWager: string;
  maxMultiplier: string;
  isDemo?: boolean;
  rules?: string;
  style?: {
      background?: string;
      accentColor?: string;
      symbolSet?: string;
  }
}

export interface CoinPackage {
  id: string;
  price: number;
  gcAmount: number;
  scAmount: number;
  isBestValue: boolean;
}

export interface CreatePaymentResponse {
  invoice_url: string;
  payment_id: string;
}

export interface WinResult {
  totalWin: number;
  winningLines: { lineIndex: number; symbol: string; amount: number }[];
  isBigWin: boolean;
  freeSpinsWon: number;
  bonusText: string;
  stopIndices: number[];
  plinkoOutcome?: {
      path: number[];
      bucketIndex: number;
      multiplier: number;
      rows: number;
      risk: 'Low' | 'Medium' | 'High';
  };
  scratchOutcome?: ScratchTicket;
  // Audit Trail Data
  rngSeed?: string; 
  serverHash?: string;
}

export interface GameHistoryEntry {
  id: string;
  activityId: string;
  timestamp: number;
  debit: number;
  credit: number;
  currency: CurrencyType;
  result: 'WIN' | 'LOSS' | 'SUCCESS';
  auditRef?: string; // Reference to the immutable ledger row
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
    heldIndices: number[]; 
    wager: number;
    currency: CurrencyType;
    winAmount: number;
    handName: string;
}

// --- SCRATCH TYPES ---
export interface ScratchTicket {
    grid: string[];
    prize: number;
    currency: CurrencyType;
    isWin: boolean;
    cost: number;
    tier: 'jackpot' | 'high' | 'mid' | 'low' | 'loser';
}

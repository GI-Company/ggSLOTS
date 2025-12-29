
import { UserProfile, CurrencyType, WinResult, GameHistoryEntry, Card, BlackjackState, ScratchTicket, KycStatus, PokerState } from '../types';
import { REDEMPTION_UNLOCK_PRICE, GAME_DATA, PAYLINES } from '../constants';
import { supabase } from '../lib/supabaseClient';

const MOCK_DELAY = 300;
const STORAGE_KEY = 'ggslots_user_session';
const GUEST_STORAGE_KEY = 'ggslots_guest_session';
const HISTORY_STORAGE_KEY = 'ggslots_history';

// Default Tenant ID from SQL Schema (Demo Tenant)
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

function generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Robust Pseudo-Random Number Generator (LFG)
 */
class FibonacciPRNG {
    private state: number[];
    private index: number;
    private j: number = 24;
    private k: number = 55;
    private m: number = 2 ** 32;

    constructor(seed: number = Date.now()) {
        this.state = new Array(55);
        this.index = 0;
        let x = seed;
        for (let i = 0; i < 55; i++) {
            x = (1664525 * x + 1013904223) % this.m;
            this.state[i] = x;
        }
    }

    public next(): number {
        const p1 = this.state[(this.index - this.k + 55) % 55];
        const p2 = this.state[(this.index - this.j + 55) % 55];
        const nextVal = (p1 + p2) % this.m;
        this.state[this.index] = nextVal;
        this.index = (this.index + 1) % 55;
        return Math.abs(nextVal / this.m);
    }
}

const prng = new FibonacciPRNG(Date.now());

// Helper: Generate Clean Casino Multipliers for Plinko
// Uses inverse binomial probability but snaps to nice "Human" numbers.
const getPlinkoMultipliers = (rows: number, risk: 'Low' | 'Medium' | 'High'): number[] => {
    const center = rows / 2;
    const probabilities = [];
    const pascal: number[] = [1];
    
    // Generate Pascal's Triangle Row
    for (let i = 0; i < rows; i++) {
        for (let j = i; j > 0; j--) {
            pascal[j] = pascal[j] + pascal[j - 1];
        }
        pascal.push(1);
    }
    const totalCombinations = Math.pow(2, rows);
    
    for(let i=0; i <= rows; i++) {
        probabilities.push(pascal[i] / totalCombinations);
    }

    // Risk factors affect the "steepness" of the curve
    let exponent = 1.0;
    if (risk === 'High') exponent = 1.8;
    else if (risk === 'Medium') exponent = 1.2;
    else exponent = 0.8;

    const rawMultipliers = probabilities.map((p, i) => {
        // Inverse probability * risk factor
        let val = 1 / (p * 100);
        val = Math.pow(val, exponent);
        
        // Manual Tuning for High Risk Edge Cases
        const distFromCenter = Math.abs(i - center);
        if (risk === 'High') {
             // Force extremely low center for High Risk to pay for the edges
             if (distFromCenter < rows * 0.3) val = 0.2; 
        } else if (risk === 'Medium') {
             if (distFromCenter < rows * 0.2) val = 0.4;
        } else {
             // Low risk floor
             if (val < 0.5) val = 0.5;
        }
        return val;
    });

    // Normalize to target RTP (~96%)
    let currentRTP = 0;
    rawMultipliers.forEach((m, i) => {
        currentRTP += m * probabilities[i];
    });
    
    const targetRTP = 0.96;
    const normalizationFactor = targetRTP / currentRTP;
    
    const finalMultipliers = rawMultipliers.map(m => {
        let final = m * normalizationFactor;
        
        // Snap to "Nice" Casino Numbers
        if (final > 900) final = 1000;
        else if (final > 500) final = 620;
        else if (final > 100) final = 130;
        else if (final > 50) final = 76;
        else if (final > 25) final = 26;
        else if (final > 8) final = 9;
        else if (final > 3) final = 4;
        else if (final > 1.5) final = 2;
        else if (final > 1.2) final = 1.5;
        else if (final > 0.9) final = 1.1; // Slight profit
        else if (final > 0.6) final = 0.7; // Partial loss
        else if (final > 0.3) final = 0.4; // Loss
        else final = 0.2; // Heavy loss

        // Hard overrides for High Risk Edges (16 rows)
        if (risk === 'High' && rows === 16) {
            if (m > 500) final = 1000;
        }

        return final;
    });

    // CUSTOM LOGIC: 4th from left (index 3) and 4th from right (index length-4) must be 0
    if (finalMultipliers.length >= 8) {
        finalMultipliers[3] = 0;
        finalMultipliers[finalMultipliers.length - 4] = 0;
    }

    return finalMultipliers;
};

const calculatePlinkoResult = (wager: number, rows: number = 12, risk: 'Low' | 'Medium' | 'High' = 'Medium'): { result: WinResult } => {
    const path: number[] = [];
    for(let i=0; i < rows; i++) {
        // 50/50 Left/Right chance per peg
        path.push(prng.next() > 0.5 ? 1 : 0);
    }
    const bucketIndex = path.reduce((a, b) => a + b, 0);
    
    // Recalculate table to ensure fairness match
    const multipliers = getPlinkoMultipliers(rows, risk);
    const multiplier = multipliers[bucketIndex] || 0;
    const totalWin = wager * multiplier;
    
    return {
        result: {
            totalWin,
            winningLines: [],
            isBigWin: multiplier >= 10,
            freeSpinsWon: 0,
            bonusText: multiplier >= 10 ? `BIG DROP! x${multiplier}` : '',
            stopIndices: [],
            plinkoOutcome: { path, bucketIndex, multiplier, rows, risk }
        }
    };
};

// House Edge Implementation for Slots:
const calculateSpinResult = (wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean): { result: WinResult } => {
    const gameAssets = GAME_DATA[gameId] || GAME_DATA['default'];
    const strips = gameAssets.strips;
    const payouts = gameAssets.payouts;

    const generateOutcome = () => {
        const stopIndices: number[] = [];
        
        for(let reel=0; reel<3; reel++) {
            const strip = strips[reel];
            let idx = Math.floor(prng.next() * strip.length);
            
            // 20% chance to nudge off a Scatter if it lands naturally to maintain house edge
            if (strip[idx] === 'SCATTER' && prng.next() > 0.2) {
                 idx = (idx + 1) % strip.length;
            }
            stopIndices.push(idx);
        }

        const grid: string[][] = [[], [], []];
        let scatterCount = 0;

        for (let reelIdx = 0; reelIdx < 3; reelIdx++) {
            const strip = strips[reelIdx];
            const stopIndex = stopIndices[reelIdx];
            for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
                const symIndex = (stopIndex + rowIdx) % strip.length;
                let symbol = strip[symIndex];
                
                // Extra check for Free Spin scatter logic
                const isScatter = symbol === 'SCATTER';
                if (isFreeSpin && isScatter) {
                    // Reduce retrigger chance in free spins to prevent infinite loops
                    if (prng.next() < 0.85) {
                        symbol = strip[(symIndex + 1) % strip.length];
                        if (symbol === 'SCATTER') symbol = strip[(symIndex + 2) % strip.length];
                    }
                }
                grid[rowIdx][reelIdx] = symbol;
                if (symbol === 'SCATTER') scatterCount++;
            }
        }

        let totalWin = 0;
        const winningLines = [];
        for (let i = 0; i < PAYLINES.length; i++) {
            const line = PAYLINES[i];
            const s1 = grid[line[0][0]][line[0][1]];
            const s2 = grid[line[1][0]][line[1][1]];
            const s3 = grid[line[2][0]][line[2][1]];

            if (s1 === s2 && s2 === s3) {
                const baseValue = payouts[s1] || 0;
                const lineWin = wager * baseValue;
                totalWin += lineWin;
                if (lineWin > 0) winningLines.push({ lineIndex: i, symbol: s1, amount: lineWin });
            }
        }

        return { totalWin, winningLines, stopIndices, scatterCount };
    };

    let finalOutcome = generateOutcome();
    let freeSpinsWon = 0;
    let bonusText = '';
    
    if (finalOutcome.scatterCount >= 3) {
        freeSpinsWon = 10;
        bonusText = "BONUS! 10 FREE SPINS";
    }

    return {
        result: {
            totalWin: finalOutcome.totalWin,
            winningLines: finalOutcome.winningLines,
            isBigWin: finalOutcome.totalWin >= wager * 10,
            freeSpinsWon: freeSpinsWon,
            bonusText: bonusText,
            stopIndices: finalOutcome.stopIndices
        }
    };
};

// --- CARD LOGIC ---
const generateDeck = (): Card[] => {
    const suits: ('H' | 'D' | 'C' | 'S')[] = ['H', 'D', 'C', 'S'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const deck: Card[] = [];
    for (const s of suits) {
        for (const r of ranks) {
            let val = parseInt(r);
            if (['J','Q','K'].includes(r)) val = 10;
            if (r === 'A') val = 11;
            deck.push({ suit: s, rank: r, value: val });
        }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

// --- BLACKJACK LOGIC ---
const calculateHandScore = (hand: Card[]): number => {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
        score += card.value;
        if (card.rank === 'A') aces++;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
};

const MOCK_GAMES_STORE: Record<string, BlackjackState> = {};
const MOCK_POKER_STORE: Record<string, PokerState> = {};

// Helper to map RPC result to BlackjackState
const mapDBGameToState = (data: any): BlackjackState => {
    return {
        id: data.id,
        deck: data.deck || [],
        player_hand: data.player_hand || [],
        dealer_hand: data.dealer_hand || [],
        player_score: data.player_score,
        dealer_score: data.dealer_score,
        status: data.stage === 'settled' ? 
            (data.player_score > 21 ? 'player_bust' : 
            data.dealer_score > 21 ? 'dealer_bust' : 
            data.player_score > data.dealer_score ? 'player_win' : 
            data.player_score < data.dealer_score ? 'dealer_win' : 'push') 
            : data.stage,
        wager: data.wager_amount,
        currency: data.currency as CurrencyType,
        payout: 0 
    };
};

// --- POKER EVALUATION LOGIC ---
const evaluatePokerHand = (hand: Card[]): { rank: number, name: string, multiplier: number } => {
    // 1. Sort by value for easier analysis (A=14 for sorting, but handle low A later)
    const sorted = [...hand].sort((a, b) => {
        const valA = a.rank === 'A' ? 14 : (['K','Q','J'].includes(a.rank) ? (a.rank==='K'?13:a.rank==='Q'?12:11) : parseInt(a.rank));
        const valB = b.rank === 'A' ? 14 : (['K','Q','J'].includes(b.rank) ? (b.rank==='K'?13:b.rank==='Q'?12:11) : parseInt(b.rank));
        return valA - valB;
    });

    const ranks = sorted.map(c => c.rank === 'A' ? 14 : (['K','Q','J'].includes(c.rank) ? (c.rank==='K'?13:c.rank==='Q'?12:11) : parseInt(c.rank)));
    const suits = sorted.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);
    
    // Check Straight
    let isStraight = true;
    for (let i = 0; i < 4; i++) {
        if (ranks[i+1] !== ranks[i] + 1) {
            isStraight = false; 
            break;
        }
    }
    // Special Ace Low Straight (A, 2, 3, 4, 5) -> Ranks: 2, 3, 4, 5, 14
    if (!isStraight && ranks[0]===2 && ranks[1]===3 && ranks[2]===4 && ranks[3]===5 && ranks[4]===14) {
        isStraight = true;
    }

    const rankCounts: Record<number, number> = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a,b) => b-a); // Sort counts descending (e.g. [4,1] is 4 of kind)

    // Evaluate
    if (isFlush && isStraight && ranks[4] === 14 && ranks[0] === 10) return { rank: 10, name: 'Royal Flush', multiplier: 800 };
    if (isFlush && isStraight) return { rank: 9, name: 'Straight Flush', multiplier: 50 };
    if (counts[0] === 4) return { rank: 8, name: 'Four of a Kind', multiplier: 25 };
    if (counts[0] === 3 && counts[1] === 2) return { rank: 7, name: 'Full House', multiplier: 9 };
    if (isFlush) return { rank: 6, name: 'Flush', multiplier: 6 };
    if (isStraight) return { rank: 5, name: 'Straight', multiplier: 4 };
    if (counts[0] === 3) return { rank: 4, name: 'Three of a Kind', multiplier: 3 };
    if (counts[0] === 2 && counts[1] === 2) return { rank: 3, name: 'Two Pair', multiplier: 2 };
    
    if (counts[0] === 2) {
        // Check Jacks or Better
        const pairRank = parseInt(Object.keys(rankCounts).find(key => rankCounts[parseInt(key)] === 2)!);
        if (pairRank >= 11) return { rank: 2, name: 'Jacks or Better', multiplier: 1 };
    }

    return { rank: 1, name: 'High Card', multiplier: 0 };
};


// --- SERVICE EXPORTS ---

export const supabaseService = {
  auth: {
      signInAsGuest: async (): Promise<{ user: UserProfile, message?: string }> => {
        // Real Guest Login (Anonymous Auth) if Supabase configured
        if (supabase) {
            try {
                const { data, error } = await supabase.auth.signInAnonymously();
                if (!error && data.session) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single();
                    if (profile) return { user: profile as UserProfile, message: "Welcome Guest!" };
                }
            } catch (e) {
                console.warn("Anon Auth failed, falling back to mock");
            }
        }
        
        // Mock Fallback
        await new Promise(resolve => setTimeout(resolve, 200));
        let guestUser: UserProfile;
        let message = undefined;
        const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
        if (storedGuest) {
            guestUser = JSON.parse(storedGuest);
            const now = Date.now();
            if (now - (guestUser.lastLogin || 0) > 24 * 60 * 60 * 1000) {
                guestUser.gcBalance = 50000; guestUser.lastLogin = now;
            }
        } else {
            // Guests get small balance, no SC
            guestUser = { 
                id: 'guest_' + Date.now(), 
                email: 'Guest Player', 
                gcBalance: 50000, 
                scBalance: 0, 
                vipLevel: 'Guest', 
                hasUnlockedRedemption: false, 
                redeemableSc: 0, 
                isGuest: true, 
                lastLogin: Date.now(), 
                tenantId: DEMO_TENANT_ID,
                kycStatus: 'unverified',
                isAddressLocked: false
            };
            message = "Welcome Guest! You have 50,000 GC.";
        }
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
        return { user: guestUser, message };
    },
    
    signIn: async (email: string, password?: string, profileData?: Partial<UserProfile>): Promise<{ data: UserProfile | null, error: string | null, message?: string }> => {
      // Supabase Implementation
      if (supabase) {
        try {
            if (profileData && password) {
                // REGISTER FLOW
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password: password,
                    options: {
                        data: profileData // Passes metadata to auth.users (useful for triggers)
                    }
                });
                if (error) throw error;
                
                if (data.user && !data.session) {
                    return { data: null, error: null, message: "Registration successful! Please check your email to verify account." };
                }

                if (data.user) {
                     // Wait slightly for the Postgres Trigger to create the profile
                     await new Promise(r => setTimeout(r, 1500)); 
                     let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                     
                     // Fallback retry if trigger is slow
                     if (!profile) {
                         await new Promise(r => setTimeout(r, 2000));
                         const retry = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                         profile = retry.data;
                     }

                     return { data: profile as UserProfile, error: null, message: "Welcome to GGSlots! +20 SC Bonus Applied!" };
                }
            } else if (password) {
                // LOGIN FLOW
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;

                if (data.user) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                    return { data: profile as UserProfile, error: null, message: "Welcome back!" };
                }
            }
        } catch (e: any) { 
            return { data: null, error: e.message || "Connection Error" }; 
        }
      }

      // Mock Fallback
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
      const stored = localStorage.getItem(STORAGE_KEY);
      let user: UserProfile;
      let message = undefined;
      
      const SIGN_UP_BONUS_SC = 20.00;
      const SIGN_UP_BONUS_GC = 50000;

      if (stored) {
          const parsedUser = JSON.parse(stored);
          if (parsedUser.email === email) user = parsedUser;
          else {
              if (profileData) { 
                  user = { 
                      id: 'user_' + Math.random(), 
                      email, 
                      gcBalance: SIGN_UP_BONUS_GC, 
                      scBalance: SIGN_UP_BONUS_SC, 
                      vipLevel: 'Bronze', 
                      hasUnlockedRedemption: false, 
                      redeemableSc: 0, 
                      isGuest: false, 
                      lastLogin: Date.now(), 
                      tenantId: DEMO_TENANT_ID, 
                      kycStatus: 'unverified',
                      isAddressLocked: true, 
                      ...profileData 
                  }; 
                  message = "Welcome! You received 20 SC & 50,000 GC Sign-up Bonus!"; 
              }
              else return { data: null, error: "User not found locally." };
          }
      } else {
          if (!profileData) return { data: null, error: "User not found." };
          user = { 
              id: 'user_' + Math.random(), 
              email, 
              gcBalance: SIGN_UP_BONUS_GC, 
              scBalance: SIGN_UP_BONUS_SC, 
              vipLevel: 'Bronze', 
              hasUnlockedRedemption: false, 
              redeemableSc: 0, 
              isGuest: false, 
              lastLogin: Date.now(), 
              tenantId: DEMO_TENANT_ID, 
              kycStatus: 'unverified',
              isAddressLocked: true,
              ...profileData 
          };
          message = "Welcome! You received 20 SC & 50,000 GC Sign-up Bonus!";
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { data: user, error: null, message };
    },

    resetPassword: async (email: string) => { if (supabase) { const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) return { success: false, message: error.message }; } return { success: true, message: "Reset link sent." }; },
    
    signOut: async () => { if (supabase) await supabase.auth.signOut(); localStorage.removeItem(STORAGE_KEY); },
    
    getSession: async () => { 
        if (supabase) { 
            try { 
                const { data: { session } } = await supabase.auth.getSession(); 
                if (session) { 
                    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); 
                    return data as UserProfile; 
                } 
            } catch (e) { return null; } 
        } 
        const stored = localStorage.getItem(STORAGE_KEY); 
        return stored ? JSON.parse(stored) : null; 
    },
    
    subscribeToUserChanges: (userId: string, callback: (payload: UserProfile) => void) => { 
        if (!supabase) return () => {}; 
        const channel = supabase.channel(`public:profiles:id=eq.${userId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (payload) => { 
            if (payload.new) callback(payload.new as UserProfile); 
        })
        .subscribe(); 
        return () => { supabase.removeChannel(channel); }; 
    },

    submitKyc: async (userId: string): Promise<{ success: boolean }> => {
        if (supabase) {
            await supabase.from('profiles').update({ kycStatus: 'pending' }).eq('id', userId);
            return { success: true };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const user = JSON.parse(stored);
            user.kycStatus = 'pending';
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        }
        return { success: true };
    }
  },

  game: {
    spin: async (user: UserProfile, wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean = false, plinkoConfig?: { rows: number, risk: 'Low' | 'Medium' | 'High' }): Promise<{ user: UserProfile, result: WinResult }> => {
        let math: { result: WinResult };
        if (gameId.includes('plinko')) {
             const rows = plinkoConfig?.rows || 12;
             const risk = plinkoConfig?.risk || 'Medium';
             math = calculatePlinkoResult(wager, rows, risk);
        } else {
             math = calculateSpinResult(wager, currency, gameId, isFreeSpin);
        }
        
        const winAmount = math.result.totalWin;

        if (supabase && !user.isGuest) {
             try {
                 const { data, error } = await supabase.rpc('execute_atomic_transaction', {
                     game_type: gameId.includes('plinko') ? 'plinko' : 'slot',
                     currency: currency,
                     wager_amount: isFreeSpin ? 0 : wager,
                     payout_amount: winAmount,
                     outcome_data: math.result
                 });
                 if (error) throw error;
                 const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                 return { user: updatedProfile as UserProfile, result: math.result };
             } catch (e) { throw new Error("Transaction failed."); }
        } 
        
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY)); 
        let updatedUser = { ...user };
        const balanceField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';

        if (!isFreeSpin) {
            if (updatedUser[balanceField] < wager) throw new Error("Insufficient Funds");
            updatedUser[balanceField] -= wager;
        }

        if (winAmount > 0) {
            updatedUser[balanceField] += winAmount;
            if (currency === CurrencyType.SC) updatedUser.redeemableSc += winAmount;
        }
        
        const idempotencyKey = generateIdempotencyKey();
        const historyEntry: GameHistoryEntry = {
            id: idempotencyKey,
            activityId: gameId,
            timestamp: Date.now(),
            debit: isFreeSpin ? 0 : wager,
            credit: winAmount,
            currency: currency,
            result: winAmount > 0 ? 'WIN' : 'LOSS'
        };

        const storageKey = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        if (!supabase || user.isGuest) localStorage.setItem(storageKey, JSON.stringify(updatedUser));
        
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY) || '[]';
        const history = JSON.parse(storedHistory);
        history.unshift(historyEntry);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));

        return { user: updatedUser, result: math.result };
    },

    // --- SCRATCH CARD LOGIC ---
    buyScratchTicket: async (user: UserProfile, currency: CurrencyType): Promise<{ user: UserProfile, result: WinResult }> => {
        const cost = currency === CurrencyType.GC ? 500 : 1.00;
        
        if (supabase && !user.isGuest) {
             try {
                 const { data, error } = await supabase.rpc('buy_ticket_dual_currency', { 
                     mode: currency 
                 });
                 if (error) throw error;

                 const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                 
                 const ticket: ScratchTicket = {
                     grid: data.grid,
                     prize: data.prize,
                     currency: currency,
                     isWin: data.win,
                     cost,
                     tier: data.prize > 0 ? (data.prize > cost * 10 ? 'high' : 'mid') : 'loser'
                 };

                 const result: WinResult = {
                     totalWin: ticket.prize,
                     winningLines: [],
                     isBigWin: ticket.prize >= cost * 10,
                     freeSpinsWon: 0,
                     bonusText: '',
                     stopIndices: [],
                     scratchOutcome: ticket
                 };

                 return { user: updatedProfile, result };
             } catch (e: any) { throw new Error(e.message || "Scratch transaction failed."); }
        }

        // 2. MOCK SIMULATION
        await new Promise(resolve => setTimeout(resolve, 500));
        let updatedUser = { ...user };
        const balanceField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';
        
        if (updatedUser[balanceField] < cost) throw new Error("Insufficient Funds");
        updatedUser[balanceField] -= cost;

        // Generate Ticket Data
        const rand = Math.random();
        let tier: 'jackpot' | 'high' | 'mid' | 'low' | 'loser' = 'loser';
        let prize = 0;
        let grid: string[] = [];

        // SC prizes
        const scPrizes = { jackpot: 500.00, high: 50.00, mid: 5.00, low: 1.00 };
        // GC prizes
        const gcPrizes = { jackpot: 1000000, high: 10000, mid: 1000, low: 200 };

        if (rand < 0.0005) tier = 'jackpot'; // Harder to hit
        else if (rand < 0.008) tier = 'high';
        else if (rand < 0.05) tier = 'mid';
        else if (rand < 0.20) tier = 'low';

        if (tier !== 'loser') {
            prize = currency === CurrencyType.SC ? scPrizes[tier] : gcPrizes[tier];
        }

        const winSymbol = tier === 'jackpot' ? '💰' : tier === 'high' ? '💎' : tier === 'mid' ? '🍀' : '🎩';
        const loseSymbols = ['🍒', '🍋', '🐴', '🎩', '💎', '💰', '🍀'];
        
        if (tier !== 'loser') {
             grid = [winSymbol, winSymbol, winSymbol];
             for(let i=0; i<6; i++) grid.push(loseSymbols[Math.floor(Math.random() * loseSymbols.length)]);
             for (let i = grid.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [grid[i], grid[j]] = [grid[j], grid[i]];
            }
        } else {
             grid = Array(9).fill(null).map(() => loseSymbols[Math.floor(Math.random() * loseSymbols.length)]);
        }

        if (prize > 0) {
            updatedUser[balanceField] += prize;
            if(currency === CurrencyType.SC) updatedUser.redeemableSc += prize;
        }

        const storageKey = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        localStorage.setItem(storageKey, JSON.stringify(updatedUser));

        const ticket: ScratchTicket = {
            grid, prize, currency, isWin: prize > 0, cost, tier
        };

        return { 
            user: updatedUser, 
            result: {
                totalWin: prize,
                winningLines: [],
                isBigWin: tier === 'jackpot' || tier === 'high',
                freeSpinsWon: 0,
                bonusText: '',
                stopIndices: [],
                scratchOutcome: ticket
            }
        };
    },

    getHistory: async (): Promise<GameHistoryEntry[]> => {
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase.from('game_history').select('*').order('created_at', { ascending: false }).limit(50);
                if (data) {
                    return data.map((row: any) => ({
                        id: row.id, 
                        activityId: row.game_type, 
                        timestamp: new Date(row.created_at).getTime(), 
                        debit: row.wager_amount, 
                        credit: row.payout_amount, 
                        currency: row.currency, 
                        result: row.payout_amount > 0 ? 'WIN' : 'LOSS'
                    }));
                }
            }
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        return storedHistory ? JSON.parse(storedHistory) : [];
    },

    subscribeToHistory: (callback: (entry: GameHistoryEntry) => void) => {
        if (!supabase) return () => {};
        const channel = supabase.channel('public:game_history').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_history' }, (payload) => {
             const row = payload.new;
             callback({ id: row.id, activityId: row.game_type, timestamp: new Date(row.created_at).getTime(), debit: row.wager_amount, credit: row.payout_amount, currency: row.currency, result: row.payout_amount > 0 ? 'WIN' : 'LOSS' });
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    },

    getPlinkoMultipliers
  },

  blackjack: {
    start: async (user: UserProfile, wager: number, currency: CurrencyType): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (supabase && !user.isGuest) {
             const { data, error } = await supabase.rpc('start_blackjack', { 
                 bet_amount: wager, 
                 currency_mode: currency 
             });
             if (error) throw error;
             const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
             return { game: mapDBGameToState(data[0]), user: updatedProfile as UserProfile };
        } 
        
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        let updatedUser = { ...user };
        const balanceField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';
        if (updatedUser[balanceField] < wager) throw new Error("Insufficient Funds");
        updatedUser[balanceField] -= wager; 

        const deck = generateDeck();
        const p_hand = [deck.shift()!, deck.shift()!];
        const d_hand = [deck.shift()!, deck.shift()!];
        
        const gameId = generateIdempotencyKey();
        const gameState: BlackjackState = {
            id: gameId,
            deck,
            player_hand: p_hand,
            dealer_hand: d_hand,
            player_score: calculateHandScore(p_hand),
            dealer_score: calculateHandScore(d_hand),
            status: 'active',
            wager,
            currency,
            payout: 0
        };

        if (gameState.player_score === 21) {
             if (gameState.dealer_score === 21) {
                 gameState.status = 'push';
                 gameState.payout = wager; 
             } else {
                 gameState.status = 'player_win';
                 gameState.payout = wager * 2.5; 
             }
             updatedUser[balanceField] += gameState.payout;
             if(currency === CurrencyType.SC) updatedUser.redeemableSc += gameState.payout;
        }

        MOCK_GAMES_STORE[gameId] = gameState;
        const storageKey = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        localStorage.setItem(storageKey, JSON.stringify(updatedUser));

        return { game: gameState, user: updatedUser };
    },

    hit: async (gameId: string, user: UserProfile): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (supabase && !user.isGuest) {
            const { data, error } = await supabase.rpc('hit_blackjack', { game_id: gameId });
            if (error) throw error;
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return { game: mapDBGameToState(data[0]), user: updatedProfile };
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        const game = MOCK_GAMES_STORE[gameId];
        if (!game || game.status !== 'active') throw new Error("Game invalid");

        const card = game.deck.shift()!;
        game.player_hand.push(card);
        game.player_score = calculateHandScore(game.player_hand);

        if (game.player_score > 21) {
            game.status = 'player_bust';
        }

        return { game: { ...game }, user };
    },

    stand: async (gameId: string, user: UserProfile): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (supabase && !user.isGuest) {
            const { data, error } = await supabase.rpc('stand_blackjack', { game_id: gameId });
            if (error) throw error;
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return { game: mapDBGameToState(data[0]), user: updatedProfile };
        }

        await new Promise(resolve => setTimeout(resolve, 500)); 
        const game = MOCK_GAMES_STORE[gameId];
        let updatedUser = { ...user };
        const balanceField = game.currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';

        while (game.dealer_score < 17) {
             const card = game.deck.shift()!;
             game.dealer_hand.push(card);
             game.dealer_score = calculateHandScore(game.dealer_hand);
        }

        if (game.dealer_score > 21) {
            game.status = 'dealer_bust';
            game.payout = game.wager * 2;
        } else if (game.player_score > game.dealer_score) {
            game.status = 'player_win';
            game.payout = game.wager * 2;
        } else if (game.player_score < game.dealer_score) {
            game.status = 'dealer_win';
            game.payout = 0;
        } else {
            game.status = 'push';
            game.payout = game.wager;
        }

        if (game.payout > 0) {
            updatedUser[balanceField] += game.payout;
            if(game.currency === CurrencyType.SC) updatedUser.redeemableSc += game.payout;
        }

        const storageKey = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        localStorage.setItem(storageKey, JSON.stringify(updatedUser));

        return { game: { ...game }, user: updatedUser };
    }
  },

  poker: {
      deal: async (user: UserProfile, wager: number, currency: CurrencyType): Promise<{ game: PokerState, user: UserProfile }> => {
          // RPC implementation (mocked)
          await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
          let updatedUser = { ...user };
          const balanceField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';
          if (updatedUser[balanceField] < wager) throw new Error("Insufficient Funds");
          updatedUser[balanceField] -= wager;
          
          const deck = generateDeck();
          const hand = [deck.shift()!, deck.shift()!, deck.shift()!, deck.shift()!, deck.shift()!];
          const gameId = generateIdempotencyKey();
          
          const gameState: PokerState = {
              id: gameId,
              deck,
              hand,
              stage: 'draw',
              heldIndices: [],
              wager,
              currency,
              winAmount: 0,
              handName: ''
          };
          
          MOCK_POKER_STORE[gameId] = gameState;
          const storageKey = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
          localStorage.setItem(storageKey, JSON.stringify(updatedUser));
          return { game: gameState, user: updatedUser };
      },

      draw: async (gameId: string, heldIndices: number[], user: UserProfile): Promise<{ game: PokerState, user: UserProfile }> => {
          await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
          const game = MOCK_POKER_STORE[gameId];
          if (!game || game.stage !== 'draw') throw new Error("Invalid game state");

          let updatedUser = { ...user };
          const balanceField = game.currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';

          // Replace unheld cards
          const newHand = game.hand.map((card, idx) => {
              if (heldIndices.includes(idx)) return card;
              return game.deck.shift()!;
          });

          game.hand = newHand;
          game.stage = 'over';
          
          const evalResult = evaluatePokerHand(newHand);
          game.handName = evalResult.name;
          game.winAmount = game.wager * evalResult.multiplier;

          if (game.winAmount > 0) {
              updatedUser[balanceField] += game.winAmount;
              if(game.currency === CurrencyType.SC) updatedUser.redeemableSc += game.winAmount;
          }
          
          const storageKey = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
          localStorage.setItem(storageKey, JSON.stringify(updatedUser));
          
          return { game: { ...game }, user: updatedUser };
      }
  },

  db: {
    purchasePackage: async (price: number, gcAmount: number, scAmount: number): Promise<UserProfile> => {
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        const stored = localStorage.getItem(STORAGE_KEY); if (!stored) throw new Error("No session"); const user = JSON.parse(stored) as UserProfile;
        user.gcBalance += gcAmount; user.scBalance += scAmount; if (price >= REDEMPTION_UNLOCK_PRICE) user.hasUnlockedRedemption = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); return user;
    },
    redeem: async (amount: number): Promise<UserProfile> => {
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        const stored = localStorage.getItem(STORAGE_KEY); if (!stored) throw new Error("No session"); const user = JSON.parse(stored) as UserProfile;
        if (user.redeemableSc >= amount) { user.scBalance -= amount; user.redeemableSc -= amount; }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); return user;
    }
  }
};

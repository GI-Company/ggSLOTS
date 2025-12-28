
import { UserProfile, CurrencyType, WinResult, GameHistoryEntry } from '../types';
import { REDEMPTION_UNLOCK_PRICE, GAME_DATA, PAYLINES } from '../constants';
import { supabase } from '../lib/supabaseClient';

const MOCK_DELAY = 300;
const STORAGE_KEY = 'ggslots_user_session';
const GUEST_STORAGE_KEY = 'ggslots_guest_session';
const HISTORY_STORAGE_KEY = 'ggslots_history';

// Default Tenant ID from SQL Schema (Demo Tenant)
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Utility: Generate UUID v4 for Idempotency Keys
 */
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

// Helper: Generate Multipliers based on Binomial Distribution Inverse
// This creates a "Risk" profile curve dynamically for any row count.
const getPlinkoMultipliers = (rows: number, risk: 'Low' | 'Medium' | 'High'): number[] => {
    const multipliers = [];
    const center = rows / 2;
    
    // Calculate Binomial Probabilities for each bucket to ensure House Edge is consistent
    // P(k) = C(n, k) * 0.5^n
    const probabilities = [];
    
    // Generate Pascal Triangle Row n for Combinations
    const pascal: number[] = [1];
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

    // Assign raw multipliers inversely proportional to probability, then shape by Risk
    const rawMultipliers = probabilities.map((p, i) => {
        const distFromCenter = Math.abs(i - center);
        
        // Base inverse: Lower probability = Higher Multiplier
        let val = 1 / (p * 100); // Scaling factor
        
        // Shape curve based on Risk
        if (risk === 'High') {
             val = Math.pow(val, 1.4); // Steeper curve (higher highs, lower lows)
             if (distFromCenter < rows * 0.2) val = 0.2; // Dead zone in center
        } else if (risk === 'Medium') {
             val = Math.pow(val, 1.1);
             if (distFromCenter < rows * 0.15) val = 0.4;
        } else {
             // Low Risk: Flatter curve
             val = Math.pow(val, 0.8);
             if (val < 0.5) val = 0.5;
        }
        
        return val;
    });

    // Normalize to ensure RTP (Return to Player) is ~98%
    let currentRTP = 0;
    rawMultipliers.forEach((m, i) => {
        currentRTP += m * probabilities[i];
    });
    
    const normalizationFactor = 0.98 / currentRTP;
    
    return rawMultipliers.map(m => {
        let final = m * normalizationFactor;
        
        // Beautify numbers
        if (final > 1000) final = Math.round(final); // x1000
        else if (final > 100) final = Math.round(final); // x100
        else if (final > 10) final = Math.round(final * 10) / 10; // x10.5
        else final = Math.round(final * 10) / 10; // x1.5
        
        // Hard clamps for visual consistency
        if (risk === 'High' && Math.abs(rows/2 - rows) === 0 && final > 0.5) final = 0.2;

        return final;
    });
};

const calculatePlinkoResult = (wager: number, rows: number = 12, risk: 'Low' | 'Medium' | 'High' = 'Medium'): { result: WinResult } => {
    const path: number[] = [];
    
    // Generate path for the specific number of rows
    for(let i=0; i < rows; i++) {
        path.push(prng.next() > 0.5 ? 1 : 0);
    }
    
    // Determine Bucket Index
    const bucketIndex = path.reduce((a, b) => a + b, 0);
    
    // Get Multipliers for this specific config
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
            plinkoOutcome: {
                path,
                bucketIndex,
                multiplier,
                rows,
                risk
            }
        }
    };
};

const calculateSpinResult = (wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean): { result: WinResult } => {
    // ... (Existing slot logic preserved)
    const gameAssets = GAME_DATA[gameId] || GAME_DATA['default'];
    const strips = gameAssets.strips;
    const payouts = gameAssets.payouts;

    const generateOutcome = () => {
        const stopIndices = [
            Math.floor(prng.next() * strips[0].length),
            Math.floor(prng.next() * strips[1].length),
            Math.floor(prng.next() * strips[2].length)
        ];

        const grid: string[][] = [[], [], []];
        let scatterCount = 0;

        for (let reelIdx = 0; reelIdx < 3; reelIdx++) {
            const strip = strips[reelIdx];
            const stopIndex = stopIndices[reelIdx];
            for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
                const symIndex = (stopIndex + rowIdx) % strip.length;
                let symbol = strip[symIndex];
                const isScatter = symbol === 'SCATTER';
                if (isFreeSpin && isScatter) {
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

export const supabaseService = {
  auth: {
      signInAsGuest: async (): Promise<{ user: UserProfile, message?: string }> => {
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
            guestUser = { id: 'guest_' + Date.now(), email: 'Guest Player', gcBalance: 50000, scBalance: 0, vipLevel: 'Guest', hasUnlockedRedemption: false, redeemableSc: 0, isGuest: true, lastLogin: Date.now(), tenantId: DEMO_TENANT_ID };
            message = "Welcome Guest! You have 50,000 GC.";
        }
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
        return { user: guestUser, message };
    },
    signIn: async (email: string, profileData?: Partial<UserProfile>): Promise<{ data: UserProfile | null, error: string | null, message?: string }> => {
      if (supabase) {
        try {
            const { data: existingUser } = await supabase.from('profiles').select('*').eq('email', email).single();
            if (existingUser) return { data: existingUser as UserProfile, error: null };
            else if (profileData) {
                const { data: newUser, error } = await supabase.from('profiles').insert([{ email, ...profileData }]).select().single();
                if (error) throw error;
                return { data: newUser as UserProfile, error: null, message: "Registration successful!" };
            }
        } catch (e: any) { return { data: null, error: e.message || "Connection Error" }; }
      }
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
      const stored = localStorage.getItem(STORAGE_KEY);
      let user: UserProfile;
      let message = undefined;
      if (stored) {
          const parsedUser = JSON.parse(stored);
          if (parsedUser.email === email) user = parsedUser;
          else {
              if (profileData) { user = { id: 'user_' + Math.random(), email, gcBalance: 100000, scBalance: 2.00, vipLevel: 'Bronze', hasUnlockedRedemption: false, redeemableSc: 0, isGuest: false, lastLogin: Date.now(), tenantId: DEMO_TENANT_ID, ...profileData }; message = "Welcome!"; }
              else return { data: null, error: "User not found locally." };
          }
      } else {
          if (!profileData) return { data: null, error: "User not found." };
          user = { id: 'user_' + Math.random(), email, gcBalance: 100000, scBalance: 2.00, vipLevel: 'Bronze', hasUnlockedRedemption: false, redeemableSc: 0, isGuest: false, lastLogin: Date.now(), tenantId: DEMO_TENANT_ID, ...profileData };
          message = "Welcome!";
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { data: user, error: null, message };
    },
    resetPassword: async (email: string) => { if (supabase) { const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) return { success: false, message: error.message }; } return { success: true, message: "Reset link sent." }; },
    signOut: async () => { if (supabase) await supabase.auth.signOut(); localStorage.removeItem(STORAGE_KEY); },
    getSession: async () => { if (supabase) { try { const { data: { session } } = await supabase.auth.getSession(); if (session) { const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); return data as UserProfile; } } catch (e) { return null; } } const stored = localStorage.getItem(STORAGE_KEY); return stored ? JSON.parse(stored) : null; },
    subscribeToUserChanges: (userId: string, callback: (payload: UserProfile) => void) => { if (!supabase) return () => {}; const channel = supabase.channel(`public:profiles:id=eq.${userId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (payload) => { if (payload.new) callback(payload.new as UserProfile); }).subscribe(); return () => { supabase.removeChannel(channel); }; }
  },

  game: {
    // UPDATED SPIN SIGNATURE: accept plinkoConfig
    spin: async (user: UserProfile, wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean = false, plinkoConfig?: { rows: number, risk: 'Low' | 'Medium' | 'High' }): Promise<{ user: UserProfile, result: WinResult }> => {
        let math: { result: WinResult };
        if (gameId === 'plinko') {
             // Default to 12 / Medium if not provided
             const rows = plinkoConfig?.rows || 12;
             const risk = plinkoConfig?.risk || 'Medium';
             math = calculatePlinkoResult(wager, rows, risk);
        } else {
             math = calculateSpinResult(wager, currency, gameId, isFreeSpin);
        }
        
        const winAmount = math.result.totalWin;
        const idempotencyKey = generateIdempotencyKey();
        const tenantId = user.tenantId || DEMO_TENANT_ID;

        if (supabase && !user.isGuest) {
             try {
                 const { error } = await supabase.rpc('execute_atomic_transaction', {
                     p_user_id: user.id,
                     p_tenant_id: tenantId,
                     p_activity_id: gameId,
                     p_debit: isFreeSpin ? 0 : wager,
                     p_credit: winAmount,
                     p_currency: currency,
                     p_idempotency_key: idempotencyKey
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

    getHistory: async (): Promise<GameHistoryEntry[]> => {
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase.from('transaction_events').select('id, activity_id, debit_amount, credit_amount, currency, result, created_at').order('created_at', { ascending: false }).limit(50);
                if (data) {
                    return data.map((row: any) => ({
                        id: row.id, activityId: row.activity_id, timestamp: new Date(row.created_at).getTime(), debit: row.debit_amount, credit: row.credit_amount, currency: row.currency, result: row.result === 'WIN' ? 'WIN' : 'LOSS'
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
        const channel = supabase.channel('public:transaction_events').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transaction_events' }, (payload) => {
             const row = payload.new;
             callback({ id: row.id, activityId: row.activity_id, timestamp: new Date(row.created_at).getTime(), debit: row.debit_amount, credit: row.credit_amount, currency: row.currency, result: row.result === 'WIN' ? 'WIN' : 'LOSS' });
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    },
    
    // Explicit export for UI consumption
    getPlinkoMultipliers
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

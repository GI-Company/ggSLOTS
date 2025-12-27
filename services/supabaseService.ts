
import { UserProfile, CurrencyType, WinResult, GameHistoryEntry } from '../types';
import { REDEMPTION_UNLOCK_PRICE, REEL_STRIPS, PAYLINES, PAYOUTS } from '../constants';
import { supabase } from '../lib/supabaseClient';

const MOCK_DELAY = 300;
const STORAGE_KEY = 'ggslots_user_session';
const GUEST_STORAGE_KEY = 'ggslots_guest_session';
const HISTORY_STORAGE_KEY = 'ggslots_history';

// Default Tenant ID from SQL Schema (Demo Tenant)
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Utility: Generate UUID v4 for Idempotency Keys
 * This ensures every transaction is unique and safe to retry.
 */
function generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Robust Pseudo-Random Number Generator using Lagged Fibonacci Generator (LFG).
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

const calculateSpinResult = (wager: number, currency: CurrencyType): { result: WinResult } => {
    const generateOutcome = () => {
        const stopIndices = [
            Math.floor(prng.next() * REEL_STRIPS[0].length),
            Math.floor(prng.next() * REEL_STRIPS[1].length),
            Math.floor(prng.next() * REEL_STRIPS[2].length)
        ];

        const grid: string[][] = [[], [], []];
        for (let reelIdx = 0; reelIdx < 3; reelIdx++) {
            const strip = REEL_STRIPS[reelIdx];
            const stopIndex = stopIndices[reelIdx];
            for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
                const symIndex = (stopIndex + rowIdx) % strip.length;
                grid[rowIdx][reelIdx] = strip[symIndex];
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
                const baseValue = PAYOUTS[s1] || 0;
                const lineWin = wager * baseValue;
                totalWin += lineWin;
                winningLines.push({ lineIndex: i, symbol: s1, amount: lineWin });
            }
        }

        return { totalWin, winningLines, stopIndices };
    };

    let finalOutcome;

    if (currency === CurrencyType.GC) {
        const targetIsWin = prng.next() < 0.25; // 25% Win Rate
        let attempts = 0;
        do {
            finalOutcome = generateOutcome();
            const actualIsWin = finalOutcome.totalWin > 0;
            if (actualIsWin === targetIsWin) break;
            attempts++;
        } while (attempts < 50); 
    } else {
        finalOutcome = generateOutcome();
    }

    return {
        result: {
            totalWin: finalOutcome.totalWin,
            winningLines: finalOutcome.winningLines,
            isBigWin: finalOutcome.totalWin >= wager * 10,
            freeSpinsWon: 0,
            bonusText: '',
            stopIndices: finalOutcome.stopIndices
        }
    };
};

// --- SYSTEM LEDGER (MOCK) ---
const MOCK_SYSTEM_LEDGER = {
    tenantId: DEMO_TENANT_ID,
    gcBalance: 9000000000000000000,
    scBalance: 1000000000
};

const applyDailyBonus = (user: UserProfile): { user: UserProfile, message?: string } => {
    const now = Date.now();
    const lastLogin = user.lastLogin || 0;
    const diffHours = (now - lastLogin) / (1000 * 60 * 60);

    let updatedUser = { ...user, lastLogin: now };
    let message = undefined;

    if (diffHours > 48) {
        updatedUser.consecutiveDays = 1;
        const bonus = 10000;
        updatedUser.gcBalance += bonus;
        message = `Welcome Back! You missed a day. Daily Bonus: ${bonus.toLocaleString()} GC`;
    } 
    else if (diffHours > 20) {
        updatedUser.consecutiveDays = (updatedUser.consecutiveDays || 0) + 1;
        let bonus = 10000 + ((updatedUser.consecutiveDays - 1) * 10000);
        let extraMsg = "";
        if (updatedUser.consecutiveDays % 7 === 0) {
            bonus += 100000;
            extraMsg = " + 100k 7-Day Streak Bonus!";
        }
        updatedUser.gcBalance += bonus;
        message = `Day ${updatedUser.consecutiveDays} Streak! Bonus: ${bonus.toLocaleString()} GC${extraMsg}`;
    }
    else {
        return { user: user }; 
    }

    return { user: updatedUser, message };
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
                guestUser.gcBalance = 50000;
                guestUser.lastLogin = now;
                message = "Guest Session Expired. Balance reset to 50,000 GC.";
            }
        } else {
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
                tenantId: DEMO_TENANT_ID
            };
            message = "Welcome Guest! You have 50,000 GC.";
        }
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
        return { user: guestUser, message };
    },

    /**
     * Handles both Login and Registration in the mock environment.
     * If `profileData` is provided, it updates/creates the user with that data.
     */
    signIn: async (email: string, profileData?: Partial<UserProfile>): Promise<{ data: UserProfile | null, error: string | null, message?: string }> => {
      // 1. Supabase Path
      if (supabase) {
        try {
            // Check if user exists
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();
            
            if (existingUser) {
                // Return existing user
                return { data: existingUser as UserProfile, error: null };
            } else if (profileData) {
                // If no user but we have profile data, it's a registration attempt via Supabase
                // Note: Real Supabase auth requires signUp() -> then insert to profiles.
                // This block is simplified for the prompt's context of mostly-frontend logic.
                const { data: newUser, error } = await supabase
                    .from('profiles')
                    .insert([{ email, ...profileData }])
                    .select()
                    .single();
                return { data: newUser as UserProfile, error: error?.message || null, message: "Registration successful!" };
            }
        } catch (e) {
            console.warn("Supabase connection failed, falling back to local.");
        }
      }

      // 2. Mock / Local Storage Path
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
      const stored = localStorage.getItem(STORAGE_KEY);
      
      let user: UserProfile;
      let message = undefined;

      if (stored) {
          const parsedUser = JSON.parse(stored);
          if (parsedUser.email === email) {
              const bonusResult = applyDailyBonus(parsedUser);
              user = bonusResult.user;
              message = bonusResult.message;
          } else {
              // Overwriting session for demo purposes if emails mismatch in single-user mock
              // If profileData is present, it's a new register replacing the old mock
              if (profileData) {
                  user = {
                    id: 'user_' + Math.random().toString(36).substr(2, 9),
                    email: email,
                    gcBalance: 100000,
                    scBalance: 2.00,
                    vipLevel: 'Bronze',
                    hasUnlockedRedemption: false,
                    redeemableSc: 0,
                    isGuest: false,
                    lastLogin: Date.now(),
                    consecutiveDays: 1,
                    tenantId: DEMO_TENANT_ID,
                    ...profileData // Merge new registration fields
                  };
                  message = "Welcome! You received 100,000 GC Signup Bonus!";
              } else {
                  return { data: null, error: "User not found locally. Please Register." };
              }
          }
      } else {
          // New User
          if (!profileData) {
              return { data: null, error: "User not found. Please Register." };
          }
          user = {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            email: email,
            gcBalance: 100000,
            scBalance: 2.00,
            vipLevel: 'Bronze',
            hasUnlockedRedemption: false,
            redeemableSc: 0,
            isGuest: false,
            lastLogin: Date.now(),
            consecutiveDays: 1,
            tenantId: DEMO_TENANT_ID,
            ...profileData // Merge new registration fields
          };
          message = "Welcome! You received 100,000 GC Signup Bonus!";
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { data: user, error: null, message };
    },

    resetPassword: async (email: string): Promise<{ success: boolean, message: string }> => {
        if (supabase) {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) return { success: false, message: error.message };
            return { success: true, message: "Password reset link sent to your email." };
        }
        // Mock
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        return { success: true, message: `(Mock) Reset link sent to ${email}` };
    },

    signOut: async (): Promise<void> => {
      if (supabase) await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY);
    },

    getSession: async (): Promise<UserProfile | null> => {
      if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
               const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
               return data as UserProfile;
          }
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      return null;
    }
  },

  game: {
    spin: async (user: UserProfile, wager: number, currency: CurrencyType, gameId: string): Promise<{ user: UserProfile, result: WinResult }> => {
        const math = calculateSpinResult(wager, currency);
        const winAmount = math.result.totalWin;
        const idempotencyKey = generateIdempotencyKey();
        const tenantId = user.tenantId || DEMO_TENANT_ID;

        if (supabase) {
             try {
                 const { error } = await supabase.rpc('execute_atomic_transaction', {
                     p_user_id: user.id,
                     p_tenant_id: tenantId,
                     p_activity_id: gameId,
                     p_debit: wager,
                     p_credit: winAmount,
                     p_currency: currency,
                     p_idempotency_key: idempotencyKey
                 });

                 if (error) throw error;
                 
                 const { data: updatedProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                 
                 return { user: updatedProfile as UserProfile, result: math.result };

             } catch (e) {
                 console.error("Transaction Failed:", e);
                 throw new Error("Transaction failed. Please try again.");
             }
        } 
        
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY)); 
        let updatedUser = { ...user };
        
        const balanceField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';
        const ledgerField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';

        if (updatedUser[balanceField] < wager) throw new Error("Insufficient Funds");

        updatedUser[balanceField] -= wager;
        MOCK_SYSTEM_LEDGER[ledgerField] += wager;

        if (winAmount > 0) {
            updatedUser[balanceField] += winAmount;
            if (currency === CurrencyType.SC) updatedUser.redeemableSc += winAmount;
            MOCK_SYSTEM_LEDGER[ledgerField] -= winAmount;
        }
        
        const historyEntry: GameHistoryEntry = {
            id: idempotencyKey,
            activityId: gameId,
            timestamp: Date.now(),
            debit: wager,
            credit: winAmount,
            currency: currency,
            result: winAmount > 0 ? 'WIN' : 'LOSS'
        };

        const storageKey = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        localStorage.setItem(storageKey, JSON.stringify(updatedUser));
        
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY) || '[]';
        const history = JSON.parse(storedHistory);
        history.unshift(historyEntry);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));

        return { user: updatedUser, result: math.result };
    },

    getHistory: async (): Promise<GameHistoryEntry[]> => {
        if (supabase) {
            const { data } = await supabase
                .from('transaction_events')
                .select('id, activity_id, debit_amount, credit_amount, currency, result, created_at')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (data) {
                return data.map((row: any) => ({
                    id: row.id,
                    activityId: row.activity_id,
                    timestamp: new Date(row.created_at).getTime(),
                    debit: row.debit_amount,
                    credit: row.credit_amount,
                    currency: row.currency,
                    result: row.result === 'WIN' ? 'WIN' : 'LOSS'
                }));
            }
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        return storedHistory ? JSON.parse(storedHistory) : [];
    }
  },

  db: {
    purchasePackage: async (price: number, gcAmount: number, scAmount: number): Promise<UserProfile> => {
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) throw new Error("No session");
        const user = JSON.parse(stored) as UserProfile;

        user.gcBalance += gcAmount;
        user.scBalance += scAmount;
        
        if (price >= REDEMPTION_UNLOCK_PRICE) {
            user.hasUnlockedRedemption = true;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        return user;
    },

    redeem: async (amount: number): Promise<UserProfile> => {
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) throw new Error("No session");
        const user = JSON.parse(stored) as UserProfile;

        if (user.redeemableSc >= amount) {
            user.scBalance -= amount;
            user.redeemableSc -= amount;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        return user;
    }
  }
};

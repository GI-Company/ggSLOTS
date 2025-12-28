
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

const calculateSpinResult = (wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean): { result: WinResult } => {
    
    // 1. Get Game Specific Assets
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

                // --- SCATTER DAMPENING LOGIC ---
                // If we are in a Free Spin, reduce the probability of Scatters appearing 
                // to prevent excessive re-triggers.
                if (isFreeSpin && symbol === 'SCATTER') {
                    // 85% chance to replace the Scatter with the next symbol in the strip
                    if (prng.next() < 0.85) {
                        symbol = strip[(symIndex + 1) % strip.length];
                        // Double check we didn't just swap to another scatter (rare but possible in design)
                        if (symbol === 'SCATTER') {
                             symbol = strip[(symIndex + 2) % strip.length];
                        }
                    }
                }

                grid[rowIdx][reelIdx] = symbol;
                if (symbol === 'SCATTER') scatterCount++;
            }
        }

        let totalWin = 0;
        const winningLines = [];
        
        // Check Paylines
        for (let i = 0; i < PAYLINES.length; i++) {
            const line = PAYLINES[i];
            const s1 = grid[line[0][0]][line[0][1]];
            const s2 = grid[line[1][0]][line[1][1]];
            const s3 = grid[line[2][0]][line[2][1]];

            if (s1 === s2 && s2 === s3) {
                const baseValue = payouts[s1] || 0;
                const lineWin = wager * baseValue;
                totalWin += lineWin;
                if (lineWin > 0) {
                    winningLines.push({ lineIndex: i, symbol: s1, amount: lineWin });
                }
            }
        }

        return { totalWin, winningLines, stopIndices, scatterCount };
    };

    let finalOutcome;

    // Simulate RNG Loop for mock consistency (not used in real server RNG)
    if (currency === CurrencyType.GC) {
        const targetIsWin = prng.next() < 0.25; 
        let attempts = 0;
        do {
            finalOutcome = generateOutcome();
            const actualIsWin = finalOutcome.totalWin > 0 || finalOutcome.scatterCount >= 3;
            if (actualIsWin === targetIsWin) break;
            attempts++;
        } while (attempts < 50); 
    } else {
        finalOutcome = generateOutcome();
    }
    
    // BONUS CHECK
    let freeSpinsWon = 0;
    let bonusText = '';
    
    if (finalOutcome.scatterCount >= 3) {
        freeSpinsWon = 10;
        bonusText = "BONUS! 10 FREE SPINS";
        // Bonus payout (optional, usually scatter pays wager multiplier)
        // finalOutcome.totalWin += wager * 5; 
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

    signIn: async (email: string, profileData?: Partial<UserProfile>): Promise<{ data: UserProfile | null, error: string | null, message?: string }> => {
      // 1. Supabase Path (Active if Env Vars are set)
      if (supabase) {
        try {
            // Check if user exists
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();
            
            if (existingUser) {
                return { data: existingUser as UserProfile, error: null };
            } else if (profileData) {
                // Registration Logic
                const { data: newUser, error } = await supabase
                    .from('profiles')
                    .insert([{ email, ...profileData }])
                    .select()
                    .single();
                    
                if (error) throw error;
                return { data: newUser as UserProfile, error: null, message: "Registration successful!" };
            }
        } catch (e: any) {
            return { data: null, error: e.message || "Connection Error" };
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
                    ...profileData
                  };
                  message = "Welcome! You received 100,000 GC Signup Bonus!";
              } else {
                  return { data: null, error: "User not found locally. Please Register." };
              }
          }
      } else {
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
            ...profileData
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
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        return { success: true, message: `(Mock) Reset link sent to ${email}` };
    },

    signOut: async (): Promise<void> => {
      if (supabase) await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY);
    },

    getSession: async (): Promise<UserProfile | null> => {
      if (supabase) {
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                   const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                   return data as UserProfile;
              }
              return null;
          } catch (e) {
              return null;
          }
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      return null;
    },

    /**
     * Realtime: Subscribe to User Profile Changes
     */
    subscribeToUserChanges: (userId: string, callback: (payload: UserProfile) => void) => {
        if (!supabase) return () => {};
        
        const channel = supabase
            .channel(`public:profiles:id=eq.${userId}`)
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
                (payload) => {
                    if (payload.new) {
                        callback(payload.new as UserProfile);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
  },

  game: {
    spin: async (user: UserProfile, wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean = false): Promise<{ user: UserProfile, result: WinResult }> => {
        // Pass isFreeSpin to calculation logic
        const math = calculateSpinResult(wager, currency, gameId, isFreeSpin);
        const winAmount = math.result.totalWin;
        const idempotencyKey = generateIdempotencyKey();
        const tenantId = user.tenantId || DEMO_TENANT_ID;

        // CRITICAL: We only use Supabase RPC if the client exists AND the user is NOT a guest.
        if (supabase && !user.isGuest) {
             try {
                 const { error } = await supabase.rpc('execute_atomic_transaction', {
                     p_user_id: user.id,
                     p_tenant_id: tenantId,
                     p_activity_id: gameId,
                     p_debit: isFreeSpin ? 0 : wager, // 0 debit for free spins
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
        
        // Mock / Guest Logic
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY)); 
        let updatedUser = { ...user };
        
        const balanceField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';

        // Check funds only if not free spin
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
        if (!supabase || user.isGuest) {
             localStorage.setItem(storageKey, JSON.stringify(updatedUser));
        }
        
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY) || '[]';
        const history = JSON.parse(storedHistory);
        history.unshift(historyEntry);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));

        return { user: updatedUser, result: math.result };
    },

    getHistory: async (): Promise<GameHistoryEntry[]> => {
        if (supabase) {
            // Guests don't have DB history
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
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
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        return storedHistory ? JSON.parse(storedHistory) : [];
    },

    /**
     * Realtime: Subscribe to Transaction History
     */
    subscribeToHistory: (callback: (entry: GameHistoryEntry) => void) => {
        if (!supabase) return () => {};

        const channel = supabase
            .channel('public:transaction_events')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'transaction_events' }, 
                (payload) => {
                    const row = payload.new;
                    // Filter logic is usually handled by RLS on Supabase side, 
                    // ensuring we only receive our own rows.
                    const entry: GameHistoryEntry = {
                         id: row.id,
                         activityId: row.activity_id,
                         timestamp: new Date(row.created_at).getTime(),
                         debit: row.debit_amount,
                         credit: row.credit_amount,
                         currency: row.currency,
                         result: row.result === 'WIN' ? 'WIN' : 'LOSS'
                    };
                    callback(entry);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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

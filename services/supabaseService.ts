
import { UserProfile, CurrencyType, WinResult, GameHistoryEntry, Card, BlackjackState, ScratchTicket, KycStatus, PokerState } from '../types';
import { REDEMPTION_UNLOCK_PRICE, GAME_DATA, PAYLINES } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { complianceService } from './complianceService';
import { z } from 'zod';

// --- ZOD SCHEMAS (Runtime Validation) ---

const UserProfileSchema = z.object({
    id: z.string(),
    // Email is required in UserProfile interface, so we enforce it here.
    email: z.string().or(z.literal('Guest Player')),
    gcBalance: z.number().min(0),
    scBalance: z.number().min(0),
    vipLevel: z.string(),
    hasUnlockedRedemption: z.boolean(),
    redeemableSc: z.number().min(0),
    isGuest: z.boolean().optional(),
    kycStatus: z.enum(['unverified', 'pending', 'verified', 'rejected']),
    isAddressLocked: z.boolean()
}).passthrough(); 

const WinResultSchema = z.object({
    totalWin: z.number(),
    isBigWin: z.boolean(),
    freeSpinsWon: z.number(),
    bonusText: z.string().optional().nullable(),
    stopIndices: z.array(z.number()),
    plinkoOutcome: z.any().optional(),
    scratchOutcome: z.any().optional()
});

const validateData = <T>(schema: z.ZodSchema<T>, data: any, context: string): T => {
    try {
        return schema.parse(data);
    } catch (e) {
        console.error(`Validation Failed [${context}]:`, e);
        throw new Error(`Data Integrity Error: ${context}`);
    }
};

// --- CLIENT-SIDE PREDICTION HELPERS ---
// Used to generate optimistic UI state or payload for the server
// NOTE: In a strict server-authoritative model, these might move entirely to PL/pgSQL.
// For this architecture, we send the "proposed" outcome to the server for validation/logging (Audit Trail).

const getPlinkoMultipliers = (rows: number, risk: 'Low' | 'Medium' | 'High'): number[] => {
    const multipliers: number[] = [];
    const center = rows / 2;
    for (let i = 0; i <= rows; i++) {
        const dist = Math.abs(i - center);
        let mult = 0.5 + (dist * dist * 0.2); 
        if (risk === 'High') mult = 0.2 + (dist * dist * dist * 0.05); 
        if (risk === 'Low') mult = 0.8 + (dist * 0.1); 

        if (mult < 1) mult = Math.floor(mult * 10) / 10;
        else mult = Math.floor(mult);
        
        if (i === 0 || i === rows) mult *= (risk === 'High' ? 20 : 5);
        if (risk === 'High' && (i === 1 || i === rows - 1)) mult *= 5;

        multipliers.push(parseFloat(mult.toFixed(1)));
    }
    return multipliers;
};

const calculatePlinkoResult = (wager: number, rows: number, risk: 'Low' | 'Medium' | 'High'): { result: WinResult } => {
    const multipliers = getPlinkoMultipliers(rows, risk);
    let bucket = 0;
    const path: number[] = [];
    
    for(let i=0; i<rows; i++) {
        const dir = complianceService.getRandom() > 0.5 ? 1 : 0;
        path.push(dir);
        bucket += dir;
    }
    
    const multiplier = multipliers[bucket];
    const win = wager * multiplier;
    
    return {
        result: {
            totalWin: win,
            winningLines: [],
            isBigWin: multiplier >= 10,
            freeSpinsWon: 0,
            bonusText: multiplier >= 10 ? `${multiplier}x!` : '',
            stopIndices: [],
            plinkoOutcome: { path, bucketIndex: bucket, multiplier, rows, risk },
            rngSeed: complianceService.generateGameSeed()
        }
    };
};

const calculateSpinResult = (wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean): { result: WinResult } => {
    const data = GAME_DATA[gameId] || GAME_DATA['default'];
    const strips = data.strips;
    const stopIndices = strips.map(s => complianceService.getRandomInt(0, s.length - 1));
    const grid: string[][] = [[], [], []];
    for(let r=0; r<3; r++) {
        for(let c=0; c<3; c++) {
            const strip = strips[c];
            const idx = (stopIndices[c] + r) % strip.length;
            grid[r].push(strip[idx]);
        }
    }
    let totalWin = 0;
    const winningLines: any[] = [];
    PAYLINES.forEach((line, lineIdx) => {
        const s1 = grid[line[0][0]][line[0][1]];
        const s2 = grid[line[1][0]][line[1][1]];
        const s3 = grid[line[2][0]][line[2][1]];
        if (s1 === s2 && s2 === s3 && s1 !== 'SCATTER') {
            const payoutMult = data.payouts[s1] || 0;
            const lineWin = (payoutMult * wager) / 5;
            totalWin += lineWin;
            winningLines.push({ lineIndex: lineIdx, symbol: s1, amount: lineWin });
        }
    });
    let scatterCount = 0;
    grid.flat().forEach(s => { if(s === 'SCATTER') scatterCount++; });
    let freeSpins = 0;
    if (scatterCount >= 3) freeSpins = 10;
    return {
        result: {
            totalWin,
            winningLines,
            isBigWin: totalWin > wager * 10,
            freeSpinsWon: freeSpins,
            bonusText: freeSpins > 0 ? "FREE SPINS" : "",
            stopIndices,
            rngSeed: complianceService.generateGameSeed()
        }
    };
};

export const supabaseService = {
  auth: {
      signInAsGuest: async (): Promise<{ user: UserProfile, message?: string }> => {
        if (!supabase) throw new Error("Supabase Client not initialized.");
        
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        
        if (data.session) {
            // Slight delay to allow trigger to run if needed, but optimally trigger runs BEFORE this returns
            await new Promise(r => setTimeout(r, 500));
            const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single();
            
            if (profileError) throw profileError;
            if (profile) return { user: validateData(UserProfileSchema, { ...profile, isGuest: true }, 'AuthGuest') as UserProfile, message: "Welcome Guest!" };
        }
        throw new Error("Failed to create guest session.");
    },
    signIn: async (email: string, password?: string, profileData?: Partial<UserProfile>): Promise<{ data: UserProfile | null, error: string | null, message?: string }> => {
      if (!supabase) return { data: null, error: "Supabase client not initialized" };

      try {
        if (profileData && password) {
            // REGISTER
            // We strip any fields that might cause trigger issues if sent raw, though specific handling is in the trigger.
            const { data, error } = await supabase.auth.signUp({ email, password, options: { data: profileData } });
            
            if (error) {
                console.error("Signup Error:", error);
                return { data: null, error: error.message };
            }
            
            if (data.user) {
                 // Wait for database trigger to create profile
                 let retries = 3;
                 while (retries > 0) {
                     await new Promise(r => setTimeout(r, 1000)); 
                     let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                     if (profile) return { data: validateData(UserProfileSchema, profile, 'AuthRegister') as UserProfile, error: null, message: "Welcome!" };
                     retries--;
                 }
                 // If profile creation fails, it's likely a DB trigger error that didn't roll back the auth user creation, 
                 // or the fetch failed.
                 return { data: null, error: "Profile creation timed out. Please check database logs." };
            }
        } else if (password) {
            // LOGIN
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { data: null, error: error.message };
            
            if (data.user) {
                const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                if (profileError) return { data: null, error: "Failed to load user profile." };
                return { data: validateData(UserProfileSchema, profile, 'AuthLogin') as UserProfile, error: null, message: "Welcome back!" };
            }
        }
        return { data: null, error: "Authentication failed" };
      } catch (e: any) { 
          // Catch unexpected errors (like network issues) and return them as string
          console.error("Auth Exception:", e);
          return { data: null, error: e.message || "An unexpected error occurred." };
      }
    },
    resetPassword: async (email: string) => { 
        if (!supabase) throw new Error("No client");
        await supabase.auth.resetPasswordForEmail(email); 
        return { success: true, message: "Reset link sent." }; 
    },
    signOut: async () => { 
        if (supabase) await supabase.auth.signOut(); 
    },
    getSession: async () => { 
        if (!supabase) return null;
        try { 
            const { data: { session } } = await supabase.auth.getSession(); 
            if (session) { 
                const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); 
                if (data) return validateData(UserProfileSchema, data, 'SessionCheck') as UserProfile; 
            } 
        } catch (e) { return null; }
        return null;
    },
    subscribeToUserChanges: (userId: string, callback: (payload: UserProfile) => void) => { 
        if (!supabase) return () => {}; 
        const channel = supabase.channel(`public:profiles:id=eq.${userId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (payload) => { 
            if (payload.new) {
                callback(validateData(UserProfileSchema, payload.new, 'RealtimeProfile') as UserProfile);
            }
        }).subscribe(); 
        return () => { supabase.removeChannel(channel); }; 
    },
    submitKyc: async (userId: string): Promise<{ success: boolean }> => {
        if (!supabase) throw new Error("No client");
        const { error } = await supabase.from('profiles').update({ kycStatus: 'pending' }).eq('id', userId);
        if (error) throw error;
        return { success: true };
    }
  },
  game: {
    spin: async (user: UserProfile, wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean = false, plinkoConfig?: any): Promise<{ user: UserProfile, result: WinResult }> => {
        if (!supabase) throw new Error("Network Error: Supabase client missing");

        // Geo-check is mandatory
        if (!isFreeSpin && currency === CurrencyType.SC) { const geoCheck = await complianceService.verifyLocation(); if (!geoCheck.allowed) throw new Error(`Location Blocked: ${geoCheck.reason}`); }
        
        // 1. Calculate result structure locally (Client-Predictive / Outcome Proposal)
        // In this architecture, we send the outcome to the server to be verified and logged.
        let math: { result: WinResult };
        if (gameId.includes('plinko')) math = calculatePlinkoResult(wager, plinkoConfig?.rows || 12, plinkoConfig?.risk || 'Medium');
        else math = calculateSpinResult(wager, currency, gameId, isFreeSpin);
        
        // 2. Server-Authoritative Transaction (RPC)
        const { data, error } = await supabase.rpc('execute_atomic_transaction', { 
            game_type: gameId, 
            currency: currency, 
            wager_amount: isFreeSpin ? 0 : wager, 
            payout_amount: math.result.totalWin, 
            outcome_data: math.result 
        });

        if (error) {
            console.error("RPC Error:", error);
            throw new Error(error.message || "Transaction Failed");
        }

        // 3. Fetch latest balance to ensure sync
        const { data: updatedProfile, error: fetchError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (fetchError) throw fetchError;

        return { user: validateData(UserProfileSchema, updatedProfile, 'SpinUpdate') as UserProfile, result: validateData(WinResultSchema, math.result, 'SpinResult') };
    },
    buyScratchTicket: async (user: UserProfile, currency: CurrencyType): Promise<{ user: UserProfile, result: WinResult }> => {
        if (!supabase) throw new Error("No client");
        if (currency === CurrencyType.SC) { const geoCheck = await complianceService.verifyLocation(); if (!geoCheck.allowed) throw new Error(`Location Blocked: ${geoCheck.reason}`); }
        
        const cost = currency === 'GC' ? 500 : 1.00;
        
        // Generate ticket locally for visual (Outcome Proposal)
        const rand = Math.random(); 
        let prize = 0; 
        let grid = ['🍒','🍋','🍊','🍒','🍋','🍊','🍒','🍋','🍊'];
        if(rand < 0.2) { prize = cost * 2; grid=['💰','💰','💰','🍒','🍋','🍊','🍒','🍋','🍊']; }
        
        const ticket: ScratchTicket = { grid, prize, currency, isWin: prize > 0, cost, tier: prize > 0 ? 'mid' : 'loser' };

        const { error } = await supabase.rpc('execute_atomic_transaction', {
            game_type: 'scratch',
            currency: currency,
            wager_amount: cost,
            payout_amount: prize,
            outcome_data: ticket
        });

        if (error) throw error;

        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        return { user: validateData(UserProfileSchema, updatedProfile, 'ScratchUpdate') as UserProfile, result: { totalWin: prize, winningLines: [], isBigWin: false, freeSpinsWon: 0, bonusText: '', stopIndices: [], scratchOutcome: ticket } };
    },
    getHistory: async (): Promise<GameHistoryEntry[]> => { 
        if (!supabase) return [];
        const { data, error } = await supabase.from('game_history').select('*').order('timestamp', { ascending: false }).limit(50);
        if (error) throw error;
        return data as GameHistoryEntry[];
    },
    subscribeToHistory: (callback: (entry: GameHistoryEntry) => void) => { 
        if (!supabase) return () => {}; 
        const channel = supabase.channel('public:game_history').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_history' }, (payload) => callback(payload.new as GameHistoryEntry)).subscribe();
        return () => { supabase.removeChannel(channel); }; 
    },
    getPlinkoMultipliers: getPlinkoMultipliers
  },
  blackjack: {
    start: async (user: UserProfile, wager: number, currency: CurrencyType): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (!supabase) throw new Error("No client");
        // Attempt to call backend RPC. If missing, it will throw, satisfying "Error if backend fails".
        const { data, error } = await supabase.rpc('blackjack_start', { wager, currency });
        if (error) throw error; // Will throw if RPC doesn't exist
        
        // Assuming RPC returns { game: ..., profile: ... }
        return { game: data.game, user: data.profile };
    },
    hit: async (gameId: string, user: UserProfile): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (!supabase) throw new Error("No client");
        const { data, error } = await supabase.rpc('blackjack_hit', { game_id: gameId });
        if (error) throw error;
        return { game: data.game, user: data.profile };
    },
    stand: async (gameId: string, user: UserProfile): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (!supabase) throw new Error("No client");
        const { data, error } = await supabase.rpc('blackjack_stand', { game_id: gameId });
        if (error) throw error;
        return { game: data.game, user: data.profile };
    },
    doubleDown: async (gameId: string, user: UserProfile): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (!supabase) throw new Error("No client");
        const { data, error } = await supabase.rpc('blackjack_double', { game_id: gameId });
        if (error) throw error;
        return { game: data.game, user: data.profile };
    }
  },
  poker: {
      deal: async (user: UserProfile, wager: number, currency: CurrencyType) => { 
          if (!supabase) throw new Error("No client");
          const { data, error } = await supabase.rpc('poker_deal', { wager, currency });
          if (error) throw error;
          return { game: data.game, user: data.profile };
      },
      draw: async (gameId: string, held: number[], user: UserProfile) => { 
          if (!supabase) throw new Error("No client");
          const { data, error } = await supabase.rpc('poker_draw', { game_id: gameId, held_indices: held });
          if (error) throw error;
          return { game: data.game, user: data.profile };
      }
  },
  db: {
    checkPaymentStatus: async (packageId: string): Promise<{ status: 'completed' | 'pending' | 'failed', txHash?: string, explorerUrl?: string }> => {
        if (!supabase) throw new Error("No client");
        const { data, error } = await supabase.rpc('check_transaction_status', { package_id: packageId });
        if (error) throw error;
        
        return { 
            status: data?.status || 'pending',
            txHash: data?.tx_hash,
            explorerUrl: data?.explorer_url
        };
    },
    purchasePackage: async (price: number, gcAmount: number, scAmount: number): Promise<UserProfile> => {
        if (!supabase) throw new Error("No client");
        const { data, error } = await supabase.rpc('purchase_package', { price, gc_amount: gcAmount, sc_amount: scAmount });
        if (error) throw error;
        
        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
        return validateData(UserProfileSchema, updatedProfile, 'Purchase') as UserProfile;
    },
    redeem: async (amount: number): Promise<UserProfile> => {
        if (!supabase) throw new Error("No client");
        const { data, error } = await supabase.rpc('redeem_sc', { amount });
        if (error) throw error;
        
        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
        return validateData(UserProfileSchema, updatedProfile, 'Redeem') as UserProfile;
    }
  }
};

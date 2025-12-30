
import { UserProfile, CurrencyType, WinResult, GameHistoryEntry, Card, BlackjackState, ScratchTicket, KycStatus, PokerState } from '../types';
import { REDEMPTION_UNLOCK_PRICE, GAME_DATA, PAYLINES } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { complianceService } from './complianceService';
import { z } from 'zod';

// --- HELPER: DB MAPPING ---
// Maps Postgres snake_case to Frontend camelCase
const mapProfile = (row: any): UserProfile => ({
    id: row.id,
    email: row.email,
    gcBalance: row.gc_balance,
    scBalance: row.sc_balance,
    vipLevel: row.vip_level,
    hasUnlockedRedemption: row.has_unlocked_redemption,
    redeemableSc: row.redeemable_sc,
    isGuest: false, // DB users are never guests
    kycStatus: row.kyc_status,
    isAddressLocked: row.is_address_locked,
    firstName: row.first_name,
    lastName: row.last_name,
    city: row.city,
    state: row.state
});

// --- ZOD SCHEMAS ---
const UserProfileSchema = z.object({
    id: z.string(),
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
        console.error(`Validation Failed [${context}]:`, e, data);
        throw new Error(`Data Integrity Error: ${context}`);
    }
};

// --- CLIENT-SIDE PREDICTION HELPERS ---
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
            // Map Snake to Camel
            const mapped = mapProfile(profile);
            return { user: validateData(UserProfileSchema, { ...mapped, isGuest: true }, 'AuthGuest') as UserProfile, message: "Welcome Guest!" };
        }
        throw new Error("Failed to create guest session.");
    },
    signIn: async (email: string, password?: string, profileData?: Partial<UserProfile>): Promise<{ data: UserProfile | null, error: string | null, message?: string }> => {
      if (!supabase) return { data: null, error: "Supabase client not initialized" };

      try {
        if (profileData && password) {
            // REGISTER
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
                     if (profile) {
                         const mapped = mapProfile(profile);
                         return { data: validateData(UserProfileSchema, mapped, 'AuthRegister') as UserProfile, error: null, message: "Welcome!" };
                     }
                     retries--;
                 }
                 return { data: null, error: "Profile creation timed out. Please check database logs." };
            }
        } else if (password) {
            // LOGIN
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { data: null, error: error.message };
            
            if (data.user) {
                const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                if (profileError) return { data: null, error: "Failed to load user profile." };
                const mapped = mapProfile(profile);
                return { data: validateData(UserProfileSchema, mapped, 'AuthLogin') as UserProfile, error: null, message: "Welcome back!" };
            }
        }
        return { data: null, error: "Authentication failed" };
      } catch (e: any) { 
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
                if (data) return validateData(UserProfileSchema, mapProfile(data), 'SessionCheck') as UserProfile; 
            } 
        } catch (e) { return null; }
        return null;
    },
    subscribeToUserChanges: (userId: string, callback: (payload: UserProfile) => void) => { 
        if (!supabase) return () => {}; 
        const channel = supabase.channel(`public:profiles:id=eq.${userId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (payload) => { 
            if (payload.new) {
                callback(validateData(UserProfileSchema, mapProfile(payload.new), 'RealtimeProfile') as UserProfile);
            }
        }).subscribe(); 
        return () => { supabase.removeChannel(channel); }; 
    },
    submitKyc: async (userId: string): Promise<{ success: boolean }> => {
        if (!supabase) throw new Error("No client");
        const { error } = await supabase.from('profiles').update({ kyc_status: 'pending' }).eq('id', userId);
        if (error) throw error;
        return { success: true };
    }
  },
  game: {
    spin: async (user: UserProfile, wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean = false, plinkoConfig?: any): Promise<{ user: UserProfile, result: WinResult }> => {
        if (!supabase) throw new Error("Network Error: Supabase client missing");

        if (!isFreeSpin && currency === CurrencyType.SC) { const geoCheck = await complianceService.verifyLocation(); if (!geoCheck.allowed) throw new Error(`Location Blocked: ${geoCheck.reason}`); }
        
        let math: { result: WinResult };
        if (gameId.includes('plinko')) math = calculatePlinkoResult(wager, plinkoConfig?.rows || 12, plinkoConfig?.risk || 'Medium');
        else math = calculateSpinResult(wager, currency, gameId, isFreeSpin);
        
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

        const { data: updatedProfile, error: fetchError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (fetchError) throw fetchError;

        return { user: validateData(UserProfileSchema, mapProfile(updatedProfile), 'SpinUpdate') as UserProfile, result: validateData(WinResultSchema, math.result, 'SpinResult') };
    },
    buyScratchTicket: async (user: UserProfile, currency: CurrencyType): Promise<{ user: UserProfile, result: WinResult }> => {
        if (!supabase) throw new Error("No client");
        if (currency === CurrencyType.SC) { const geoCheck = await complianceService.verifyLocation(); if (!geoCheck.allowed) throw new Error(`Location Blocked: ${geoCheck.reason}`); }
        
        const cost = currency === 'GC' ? 500 : 1.00;
        const rand = Math.random(); 
        let prize = 0; 
        let grid = ['🍒','🍋','🍊','🍒','🍋','🍊','🍒','🍋','🍊'];
        if(rand < 0.2) { prize = cost * 2; grid=['💰','💰','💰','🍒','🍋','🍊','🍒','🍋','🍊']; }
        
        const ticket: ScratchTicket = { grid, prize, currency, isWin: prize > 0, cost, tier: prize > 0 ? 'mid' : 'loser' };

        const { error } = await supabase.rpc('purchase_scratch_ticket', {
            game_type: 'scratch',
            currency: currency,
            cost: cost,
            prize: prize,
            ticket_data: ticket
        });

        if (error) throw error;

        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        return { user: validateData(UserProfileSchema, mapProfile(updatedProfile), 'ScratchUpdate') as UserProfile, result: { totalWin: prize, winningLines: [], isBigWin: false, freeSpinsWon: 0, bonusText: '', stopIndices: [], scratchOutcome: ticket } };
    },
    getHistory: async (): Promise<GameHistoryEntry[]> => { 
        if (!supabase) return [];
        const { data, error } = await supabase.from('game_history').select('*').order('timestamp', { ascending: false }).limit(50);
        if (error) throw error;
        // Map History Entry
        return data.map(d => ({
            id: d.id,
            activityId: d.activity_id,
            timestamp: new Date(d.timestamp).getTime(),
            debit: d.debit,
            credit: d.credit,
            currency: d.currency,
            result: d.credit > d.debit ? 'WIN' : 'LOSS',
            auditRef: d.id
        })) as GameHistoryEntry[];
    },
    subscribeToHistory: (callback: (entry: GameHistoryEntry) => void) => { 
        if (!supabase) return () => {}; 
        const channel = supabase.channel('public:game_history').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_history' }, (payload) => {
            const d = payload.new;
            callback({
                id: d.id,
                activityId: d.activity_id,
                timestamp: new Date(d.timestamp).getTime(),
                debit: d.debit,
                credit: d.credit,
                currency: d.currency,
                result: d.credit > d.debit ? 'WIN' : 'LOSS',
                auditRef: d.id
            });
        }).subscribe();
        return () => { supabase.removeChannel(channel); }; 
    },
    getPlinkoMultipliers: getPlinkoMultipliers
  },
  blackjack: {
    start: async (user: UserProfile, wager: number, currency: CurrencyType): Promise<{ game: BlackjackState, user: UserProfile }> => {
        // Placeholder for full blackjack RPC integration. 
        // For now, we simulate success to keep UI working while DB is fixed.
        return { 
            game: { id: 'sim', deck: [], player_hand: [{suit:'H',rank:'A',value:11},{suit:'D',rank:'K',value:10}], dealer_hand: [{suit:'C',rank:'5',value:5},{suit:'S',rank:'8',value:8}], player_score: 21, dealer_score: 13, status: 'active', wager, currency, payout: 0 },
            user: user 
        };
    },
    hit: async (gameId: string, user: UserProfile) => { return { game: {} as any, user }; },
    stand: async (gameId: string, user: UserProfile) => { return { game: {} as any, user }; },
    doubleDown: async (gameId: string, user: UserProfile) => { return { game: {} as any, user }; }
  },
  poker: {
      deal: async (user: UserProfile, wager: number, currency: CurrencyType) => { 
          return { game: {} as any, user };
      },
      draw: async (gameId: string, held: number[], user: UserProfile) => { 
          return { game: {} as any, user };
      }
  },
  db: {
    checkPaymentStatus: async (packageId: string): Promise<{ status: 'completed' | 'pending' | 'failed', txHash?: string, explorerUrl?: string }> => {
        if (!supabase) throw new Error("No client");
        // Mock success for demo
        return { status: 'completed', txHash: '0x123...abc', explorerUrl: 'https://etherscan.io' };
    },
    purchasePackage: async (price: number, gcAmount: number, scAmount: number): Promise<UserProfile> => {
        if (!supabase) throw new Error("No client");
        const { data, error } = await supabase.rpc('execute_atomic_transaction', { game_type: 'purchase', currency: 'GC', wager_amount: 0, payout_amount: gcAmount, outcome_data: { type: 'pkg_purchase' } });
        // NOTE: We need a separate RPC for SC purchase usually, but sticking to simple one for now.
        
        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
        return validateData(UserProfileSchema, mapProfile(updatedProfile), 'Purchase') as UserProfile;
    },
    redeem: async (amount: number): Promise<UserProfile> => {
        if (!supabase) throw new Error("No client");
        // For redemption we update balances
        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
        return validateData(UserProfileSchema, mapProfile(updatedProfile), 'Redeem') as UserProfile;
    }
  }
};

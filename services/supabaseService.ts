
import { UserProfile, CurrencyType, WinResult, GameHistoryEntry, Card, BlackjackState, ScratchTicket, KycStatus, PokerState } from '../types';
import { REDEMPTION_UNLOCK_PRICE, GAME_DATA, PAYLINES } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { complianceService } from './complianceService';
import { z } from 'zod';

const MOCK_DELAY = 300;
const STORAGE_KEY = 'ggslots_user_session';
const GUEST_STORAGE_KEY = 'ggslots_guest_session';
const HISTORY_STORAGE_KEY = 'ggslots_game_history';
const DEMO_TENANT_ID = 'demo_tenant_1';

// --- ZOD SCHEMAS (Runtime Validation) ---

const UserProfileSchema = z.object({
    id: z.string(),
    email: z.string().email().optional().or(z.literal('Guest Player')),
    gcBalance: z.number().min(0),
    scBalance: z.number().min(0),
    vipLevel: z.string(),
    hasUnlockedRedemption: z.boolean(),
    redeemableSc: z.number().min(0),
    isGuest: z.boolean().optional(),
    kycStatus: z.enum(['unverified', 'pending', 'verified', 'rejected']),
    isAddressLocked: z.boolean()
}).passthrough(); // Allow extra DB fields

const WinResultSchema = z.object({
    totalWin: z.number(),
    isBigWin: z.boolean(),
    freeSpinsWon: z.number(),
    bonusText: z.string().optional().nullable(),
    stopIndices: z.array(z.number()),
    plinkoOutcome: z.any().optional(), // Complex object
    scratchOutcome: z.any().optional()
});

const validateData = <T>(schema: z.ZodSchema<T>, data: any, context: string): T => {
    try {
        return schema.parse(data);
    } catch (e) {
        console.error(`Validation Failed [${context}]:`, e);
        // In production, log this to Sentry/Datadog. 
        // We throw to prevent corrupted state from rendering.
        throw new Error(`Data Integrity Error: ${context}`);
    }
};

// --- HELPER FUNCTIONS ---

const generateIdempotencyKey = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const getPlinkoMultipliers = (rows: number, risk: 'Low' | 'Medium' | 'High'): number[] => {
    const multipliers: number[] = [];
    const center = rows / 2;
    for (let i = 0; i <= rows; i++) {
        const dist = Math.abs(i - center);
        let mult = 0.5 + (dist * dist * 0.2); // parabolic base
        if (risk === 'High') mult = 0.2 + (dist * dist * dist * 0.05); // steeper
        if (risk === 'Low') mult = 0.8 + (dist * 0.1); // flatter

        if (mult < 1) mult = Math.floor(mult * 10) / 10;
        else mult = Math.floor(mult);
        
        // Edge cases
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
    
    // Use CSPRNG for every bounce
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
            plinkoOutcome: {
                path,
                bucketIndex: bucket,
                multiplier,
                rows,
                risk
            },
            rngSeed: complianceService.generateGameSeed()
        }
    };
};

const calculateSpinResult = (wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean): { result: WinResult } => {
    const data = GAME_DATA[gameId] || GAME_DATA['default'];
    const strips = data.strips;
    
    // Use CSPRNG for stop indices
    const stopIndices = strips.map(s => complianceService.getRandomInt(0, s.length - 1));
    
    // Create grid (3x3)
    const grid: string[][] = [[], [], []];
    for(let r=0; r<3; r++) {
        for(let c=0; c<3; c++) {
            const strip = strips[c];
            const idx = (stopIndices[c] + r) % strip.length;
            grid[r].push(strip[idx]);
        }
    }
    
    // Check wins on PAYLINES
    let totalWin = 0;
    const winningLines: any[] = [];
    
    PAYLINES.forEach((line, lineIdx) => {
        const s1 = grid[line[0][0]][line[0][1]];
        const s2 = grid[line[1][0]][line[1][1]];
        const s3 = grid[line[2][0]][line[2][1]];
        
        if (s1 === s2 && s2 === s3 && s1 !== 'SCATTER') {
            const payoutMult = data.payouts[s1] || 0;
            const lineWin = (payoutMult * wager) / 5; // Assuming 5 paylines, wager covers all
            totalWin += lineWin;
            winningLines.push({ lineIndex: lineIdx, symbol: s1, amount: lineWin });
        }
    });

    // Scatters
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

// Use CSPRNG for shuffling
const generateDeck = (): Card[] => {
    const suits: ('H' | 'D' | 'C' | 'S')[] = ['H', 'D', 'C', 'S'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const deck: Card[] = [];
    for(const s of suits) {
        for(const r of ranks) {
            let value = parseInt(r);
            if(['J','Q','K'].includes(r)) value = 10;
            if(r === 'A') value = 11;
            deck.push({ suit: s, rank: r, value });
        }
    }
    // Fisher-Yates Shuffle with CSPRNG
    for (let i = deck.length - 1; i > 0; i--) {
        const j = complianceService.getRandomInt(0, i);
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const calculateHandScore = (hand: Card[]): number => {
    let score = 0;
    let aces = 0;
    hand.forEach(c => {
        score += c.value;
        if(c.rank === 'A') aces++;
    });
    while(score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
};

const evaluatePokerHand = (hand: Card[]): { name: string, multiplier: number } => {
    const rankOrder = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const sorted = [...hand].sort((a,b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
    const isFlush = hand.every(c => c.suit === hand[0].suit);
    
    let isStraight = true;
    for(let i=0; i<4; i++) {
        if (rankOrder.indexOf(sorted[i+1].rank) !== rankOrder.indexOf(sorted[i].rank) + 1) {
            if (i===3 && sorted[4].rank==='A' && sorted[0].rank==='2') { /* Wheel */ } else { isStraight = false; }
        }
    }
    if (!isStraight && sorted[4].rank === 'A' && sorted[0].rank === '2' && sorted[1].rank === '3' && sorted[2].rank === '4' && sorted[3].rank === '5') isStraight = true;

    const counts: Record<string, number> = {};
    hand.forEach(c => { counts[c.rank] = (counts[c.rank] || 0) + 1; });
    const values = Object.values(counts);
    
    if (isFlush && isStraight) return sorted[0].rank === '10' && sorted[4].rank === 'A' ? { name: 'Royal Flush', multiplier: 800 } : { name: 'Straight Flush', multiplier: 50 };
    if (values.includes(4)) return { name: 'Four of a Kind', multiplier: 25 };
    if (values.includes(3) && values.includes(2)) return { name: 'Full House', multiplier: 9 };
    if (isFlush) return { name: 'Flush', multiplier: 6 };
    if (isStraight) return { name: 'Straight', multiplier: 4 };
    if (values.includes(3)) return { name: 'Three of a Kind', multiplier: 3 };
    if (values.filter(v => v === 2).length === 2) return { name: 'Two Pair', multiplier: 2 };
    if (values.includes(2)) {
        const pairRank = Object.keys(counts).find(r => counts[r] === 2);
        if (pairRank && ['J','Q','K','A'].includes(pairRank)) return { name: 'Jacks or Better', multiplier: 1 };
    }
    return { name: 'High Card', multiplier: 0 };
};

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

const MOCK_GAMES_STORE: Record<string, BlackjackState> = {};
const MOCK_POKER_STORE: Record<string, PokerState> = {};

export const supabaseService = {
  auth: {
      signInAsGuest: async (): Promise<{ user: UserProfile, message?: string }> => {
        // 1. Try Real
        if (supabase) {
            try {
                const { data, error } = await supabase.auth.signInAnonymously();
                if (!error && data.session) {
                    await new Promise(r => setTimeout(r, 1000));
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single();
                    if (profile) {
                        return { user: validateData(UserProfileSchema, { ...profile, isGuest: true }, 'AuthGuest'), message: "Welcome Guest!" };
                    }
                }
            } catch (e) {
                console.warn("Supabase Anon Auth failed, falling back to mock.");
            }
        }
        
        // 2. Mock Fallback
        await new Promise(resolve => setTimeout(resolve, 200));
        let guestUser: UserProfile;
        const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
        if (storedGuest) {
            guestUser = JSON.parse(storedGuest);
            const now = Date.now();
            if (now - (guestUser.lastLogin || 0) > 24 * 60 * 60 * 1000) {
                guestUser.gcBalance = 50000; guestUser.lastLogin = now;
            }
        } else {
            guestUser = { 
                id: 'guest_' + Date.now(), email: 'Guest Player', gcBalance: 50000, scBalance: 0, vipLevel: 'Guest', 
                hasUnlockedRedemption: false, redeemableSc: 0, isGuest: true, lastLogin: Date.now(), tenantId: DEMO_TENANT_ID, 
                kycStatus: 'unverified', isAddressLocked: false 
            };
        }
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
        return { user: validateData(UserProfileSchema, guestUser, 'MockAuthGuest'), message: "Welcome Guest! (Demo Mode)" };
    },
    
    signIn: async (email: string, password?: string, profileData?: Partial<UserProfile>): Promise<{ data: UserProfile | null, error: string | null, message?: string }> => {
      if (supabase) {
        try {
            if (profileData && password) {
                const { data, error } = await supabase.auth.signUp({ email, password, options: { data: profileData } });
                if (error) throw error;
                if (data.user && !data.session) return { data: null, error: null, message: "Registration successful!" };
                if (data.user) {
                     await new Promise(r => setTimeout(r, 1500)); 
                     let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                     return { data: validateData(UserProfileSchema, profile, 'AuthRegister'), error: null, message: "Welcome!" };
                }
            } else if (password) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.user) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                    return { data: validateData(UserProfileSchema, profile, 'AuthLogin'), error: null, message: "Welcome back!" };
                }
            }
        } catch (e: any) { 
            return { data: null, error: e.message || "Connection Error" }; 
        }
      }

      // Mock
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
      const stored = localStorage.getItem(STORAGE_KEY);
      let user: UserProfile;
      if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.email === email) user = parsed;
          else {
              if(!profileData) return { data: null, error: "User not found." };
              user = { id: 'user_'+Math.random(), email, gcBalance: 50000, scBalance: 20, vipLevel: 'Bronze', hasUnlockedRedemption: false, redeemableSc: 0, isGuest: false, kycStatus: 'unverified', isAddressLocked: true, ...profileData };
          }
      } else {
          if(!profileData) return { data: null, error: "User not found." };
          user = { id: 'user_'+Math.random(), email, gcBalance: 50000, scBalance: 20, vipLevel: 'Bronze', hasUnlockedRedemption: false, redeemableSc: 0, isGuest: false, kycStatus: 'unverified', isAddressLocked: true, ...profileData };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { data: validateData(UserProfileSchema, user, 'MockAuth'), error: null, message: "Welcome (Demo Mode)" };
    },

    resetPassword: async (email: string) => { 
        if (supabase) { const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) return { success: false, message: error.message }; }
        return { success: true, message: "Reset link sent." }; 
    },
    
    signOut: async () => { if (supabase) await supabase.auth.signOut(); localStorage.removeItem(STORAGE_KEY); },
    
    getSession: async () => { 
        if (supabase) { 
            try { 
                const { data: { session } } = await supabase.auth.getSession(); 
                if (session) { 
                    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); 
                    return validateData(UserProfileSchema, data, 'SessionCheck'); 
                } 
            } catch (e) { return null; } 
        } 
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    },
    
    subscribeToUserChanges: (userId: string, callback: (payload: UserProfile) => void) => { 
        if (!supabase) return () => {}; 
        const channel = supabase.channel(`public:profiles:id=eq.${userId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (payload) => { if (payload.new) callback(validateData(UserProfileSchema, payload.new, 'RealtimeProfile')); }).subscribe(); 
        return () => { supabase.removeChannel(channel); }; 
    },

    submitKyc: async (userId: string): Promise<{ success: boolean }> => {
        if (supabase) await supabase.from('profiles').update({ kycStatus: 'pending' }).eq('id', userId);
        return { success: true };
    }
  },

  game: {
    spin: async (user: UserProfile, wager: number, currency: CurrencyType, gameId: string, isFreeSpin: boolean = false, plinkoConfig?: { rows: number, risk: 'Low' | 'Medium' | 'High' }): Promise<{ user: UserProfile, result: WinResult }> => {
        
        // COMPLIANCE: Geo-Check before allowing spin
        if (!isFreeSpin && currency === CurrencyType.SC) {
            const geoCheck = await complianceService.verifyLocation();
            if (!geoCheck.allowed) throw new Error(`Location Blocked: ${geoCheck.reason}`);
        }

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
                 return { user: validateData(UserProfileSchema, updatedProfile, 'SpinUpdate'), result: validateData(WinResultSchema, math.result, 'SpinResult') };
             } catch (e) { throw new Error("Transaction failed."); }
        } 
        
        // Mock
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
        
        const key = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        if (!supabase || user.isGuest) localStorage.setItem(key, JSON.stringify(updatedUser));
        
        return { user: validateData(UserProfileSchema, updatedUser, 'MockSpinUpdate'), result: math.result };
    },

    buyScratchTicket: async (user: UserProfile, currency: CurrencyType): Promise<{ user: UserProfile, result: WinResult }> => {
        if (currency === CurrencyType.SC) {
            const geoCheck = await complianceService.verifyLocation();
            if (!geoCheck.allowed) throw new Error(`Location Blocked: ${geoCheck.reason}`);
        }

        if (supabase && !user.isGuest) {
             try {
                 const { data, error } = await supabase.rpc('buy_ticket_dual_currency', { mode: currency });
                 if (error) throw error;
                 const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                 const ticket: ScratchTicket = { grid: data.grid, prize: data.prize, currency: currency, isWin: data.win, cost: currency === 'GC' ? 500 : 1.00, tier: data.prize > 0 ? (data.prize > 10 ? 'high' : 'mid') : 'loser' };
                 const result: WinResult = { totalWin: ticket.prize, winningLines: [], isBigWin: ticket.prize >= 50, freeSpinsWon: 0, bonusText: '', stopIndices: [], scratchOutcome: ticket, rngSeed: complianceService.generateGameSeed() };
                 return { user: validateData(UserProfileSchema, updatedProfile, 'ScratchUpdate'), result };
             } catch (e: any) { throw new Error(e.message || "Scratch transaction failed."); }
        }

        // Mock
        await new Promise(resolve => setTimeout(resolve, 500));
        let updatedUser = { ...user };
        const cost = currency === 'GC' ? 500 : 1.00;
        const balanceField = currency === 'GC' ? 'gcBalance' : 'scBalance';
        if (updatedUser[balanceField] < cost) throw new Error("Insufficient Funds");
        updatedUser[balanceField] -= cost;

        const rand = Math.random();
        let prize = 0;
        let grid = ['🍒','🍋','🍊','🍒','🍋','🍊','🍒','🍋','🍊'];
        if(rand < 0.2) { prize = cost * 2; grid=['💰','💰','💰','🍒','🍋','🍊','🍒','🍋','🍊']; } // Win

        if (prize > 0) { updatedUser[balanceField] += prize; if(currency === 'SC') updatedUser.redeemableSc += prize; }
        
        const key = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(updatedUser));

        const ticket: ScratchTicket = { grid, prize, currency, isWin: prize > 0, cost, tier: prize > 0 ? 'mid' : 'loser' };
        return { user: updatedUser, result: { totalWin: prize, winningLines: [], isBigWin: false, freeSpinsWon: 0, bonusText: '', stopIndices: [], scratchOutcome: ticket, rngSeed: 'mock' } };
    },

    getHistory: async (): Promise<GameHistoryEntry[]> => {
        if (supabase) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data } = await supabase.from('game_history').select('*').order('created_at', { ascending: false }).limit(50);
                    if (data) return data.map((row: any) => ({ id: row.id, activityId: row.game_type, timestamp: new Date(row.created_at).getTime(), debit: row.wager_amount, credit: row.payout_amount, currency: row.currency, result: row.payout_amount > 0 ? 'WIN' : 'LOSS', auditRef: row.audit_hash }));
                }
            } catch(e) {}
        }
        return [];
    },

    subscribeToHistory: (callback: (entry: GameHistoryEntry) => void) => {
        if (!supabase) return () => {};
        const channel = supabase.channel('public:game_history').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_history' }, (payload) => {
             const row = payload.new;
             callback({ id: row.id, activityId: row.game_type, timestamp: new Date(row.created_at).getTime(), debit: row.wager_amount, credit: row.payout_amount, currency: row.currency, result: row.payout_amount > 0 ? 'WIN' : 'LOSS', auditRef: row.audit_hash });
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    },

    getPlinkoMultipliers: getPlinkoMultipliers
  },

  blackjack: {
    start: async (user: UserProfile, wager: number, currency: CurrencyType): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (currency === CurrencyType.SC) {
            const geoCheck = await complianceService.verifyLocation();
            if (!geoCheck.allowed) throw new Error(`Location Blocked: ${geoCheck.reason}`);
        }

        if (supabase && !user.isGuest) {
             const { data, error } = await supabase.rpc('start_blackjack', { bet_amount: wager, currency_mode: currency });
             if (error) throw error;
             const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
             return { game: mapDBGameToState(data[0]), user: validateData(UserProfileSchema, updatedProfile, 'BJStart') };
        } 
        
        // Mock
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        let updatedUser = { ...user };
        const balanceField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';
        if (updatedUser[balanceField] < wager) throw new Error("Insufficient Funds");
        updatedUser[balanceField] -= wager; 

        const deck = generateDeck();
        const p_hand = [deck.shift()!, deck.shift()!];
        const d_hand = [deck.shift()!, deck.shift()!];
        
        const gameId = generateIdempotencyKey();
        const gameState: BlackjackState = { id: gameId, deck, player_hand: p_hand, dealer_hand: d_hand, player_score: calculateHandScore(p_hand), dealer_score: calculateHandScore(d_hand), status: 'active', wager, currency, payout: 0 };

        if (gameState.player_score === 21) {
             if (gameState.dealer_score === 21) { gameState.status = 'push'; gameState.payout = wager; } 
             else { gameState.status = 'player_win'; gameState.payout = wager * 2.5; }
             updatedUser[balanceField] += gameState.payout;
             if(currency === CurrencyType.SC) updatedUser.redeemableSc += gameState.payout;
        }

        MOCK_GAMES_STORE[gameId] = gameState;
        const key = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(updatedUser));
        return { game: gameState, user: updatedUser };
    },

    hit: async (gameId: string, user: UserProfile): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (supabase && !user.isGuest) {
            const { data, error } = await supabase.rpc('hit_blackjack', { game_id: gameId });
            if (error) throw error;
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return { game: mapDBGameToState(data[0]), user: validateData(UserProfileSchema, updatedProfile, 'BJHit') };
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        const game = MOCK_GAMES_STORE[gameId];
        if (!game || game.status !== 'active') throw new Error("Game invalid");
        const card = game.deck.shift()!;
        game.player_hand.push(card);
        game.player_score = calculateHandScore(game.player_hand);
        if (game.player_score > 21) game.status = 'player_bust';
        return { game: { ...game }, user };
    },

    stand: async (gameId: string, user: UserProfile): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (supabase && !user.isGuest) {
            const { data, error } = await supabase.rpc('stand_blackjack', { game_id: gameId });
            if (error) throw error;
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return { game: mapDBGameToState(data[0]), user: validateData(UserProfileSchema, updatedProfile, 'BJStand') };
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

        if (game.dealer_score > 21) { game.status = 'dealer_bust'; game.payout = game.wager * 2; } 
        else if (game.player_score > game.dealer_score) { game.status = 'player_win'; game.payout = game.wager * 2; } 
        else if (game.player_score < game.dealer_score) { game.status = 'dealer_win'; game.payout = 0; } 
        else { game.status = 'push'; game.payout = game.wager; }

        if (game.payout > 0) {
            updatedUser[balanceField] += game.payout;
            if(game.currency === CurrencyType.SC) updatedUser.redeemableSc += game.payout;
        }
        const key = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(updatedUser));
        return { game: { ...game }, user: updatedUser };
    },

    doubleDown: async (gameId: string, user: UserProfile): Promise<{ game: BlackjackState, user: UserProfile }> => {
        if (supabase && !user.isGuest) {
            const { data, error } = await supabase.rpc('double_blackjack', { game_id: gameId });
            if (error) throw error;
            const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return { game: mapDBGameToState(data[0]), user: validateData(UserProfileSchema, updatedProfile, 'BJDouble') };
        }
        
        // Mock Double Down
        await new Promise(resolve => setTimeout(resolve, 500));
        const game = MOCK_GAMES_STORE[gameId];
        let updatedUser = { ...user };
        const balanceField = game.currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';
        
        if (updatedUser[balanceField] < game.wager) throw new Error("Insufficient Funds");
        updatedUser[balanceField] -= game.wager;
        game.wager *= 2;

        const card = game.deck.shift()!;
        game.player_hand.push(card);
        game.player_score = calculateHandScore(game.player_hand);

        if (game.player_score > 21) {
            game.status = 'player_bust';
        } else {
            while (game.dealer_score < 17) {
                const dCard = game.deck.shift()!;
                game.dealer_hand.push(dCard);
                game.dealer_score = calculateHandScore(game.dealer_hand);
            }
            if (game.dealer_score > 21) { game.status = 'dealer_bust'; game.payout = game.wager * 2; }
            else if (game.player_score > game.dealer_score) { game.status = 'player_win'; game.payout = game.wager * 2; }
            else if (game.player_score < game.dealer_score) { game.status = 'dealer_win'; game.payout = 0; }
            else { game.status = 'push'; game.payout = game.wager; }
        }

        if (game.payout > 0) {
            updatedUser[balanceField] += game.payout;
            if (game.currency === CurrencyType.SC) updatedUser.redeemableSc += game.payout;
        }
        const key = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(updatedUser));
        return { game: { ...game }, user: updatedUser };
    }
  },

  poker: {
      deal: async (user: UserProfile, wager: number, currency: CurrencyType): Promise<{ game: PokerState, user: UserProfile }> => {
          if (currency === CurrencyType.SC) {
              const geoCheck = await complianceService.verifyLocation();
              if (!geoCheck.allowed) throw new Error(`Location Blocked: ${geoCheck.reason}`);
          }

          if (supabase && !user.isGuest) {
              try {
                  const { data, error } = await supabase.rpc('deal_poker', { bet_amount: wager, currency_mode: currency });
                  if (error) throw error;
                  const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                  const gameState: PokerState = { id: data[0].id, deck: [], hand: data[0].hand, stage: 'draw', heldIndices: [], wager, currency, winAmount: 0, handName: '' };
                  MOCK_POKER_STORE[gameState.id] = gameState;
                  return { game: gameState, user: validateData(UserProfileSchema, updatedProfile, 'PokerDeal') };
              } catch (e) {
                  // Fallthrough to mock if RPC missing
              }
          }

          // Mock
          await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
          let updatedUser = { ...user };
          const balanceField = currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';
          if (updatedUser[balanceField] < wager) throw new Error("Insufficient Funds");
          updatedUser[balanceField] -= wager;
          
          const deck = generateDeck();
          const hand = [deck.shift()!, deck.shift()!, deck.shift()!, deck.shift()!, deck.shift()!];
          const gameId = generateIdempotencyKey();
          const gameState: PokerState = { id: gameId, deck, hand, stage: 'draw', heldIndices: [], wager, currency, winAmount: 0, handName: '' };
          
          MOCK_POKER_STORE[gameId] = gameState;
          const key = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
          localStorage.setItem(key, JSON.stringify(updatedUser));
          return { game: gameState, user: updatedUser };
      },

      draw: async (gameId: string, heldIndices: number[], user: UserProfile): Promise<{ game: PokerState, user: UserProfile }> => {
          if (supabase && !user.isGuest) {
              try {
                  const { data, error } = await supabase.rpc('draw_poker', { game_id: gameId, held_indices: heldIndices });
                  if (error) throw error;
                  const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                  const gameState: PokerState = { id: gameId, deck: [], hand: data[0].final_hand, stage: 'over', heldIndices, wager: data[0].wager, currency: data[0].currency, winAmount: data[0].payout, handName: data[0].hand_rank };
                  return { game: gameState, user: validateData(UserProfileSchema, updatedProfile, 'PokerDraw') };
              } catch (e) {
                  // Fallthrough
              }
          }

          // Mock
          await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
          const game = MOCK_POKER_STORE[gameId];
          let updatedUser = { ...user };
          const balanceField = game.currency === CurrencyType.GC ? 'gcBalance' : 'scBalance';

          const newHand = game.hand.map((card, idx) => heldIndices.includes(idx) ? card : game.deck.shift()!);
          game.hand = newHand;
          game.stage = 'over';
          
          const evalResult = evaluatePokerHand(newHand);
          game.handName = evalResult.name;
          game.winAmount = game.wager * evalResult.multiplier;

          if (game.winAmount > 0) {
              updatedUser[balanceField] += game.winAmount;
              if(game.currency === CurrencyType.SC) updatedUser.redeemableSc += game.winAmount;
          }
          
          const key = user.isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY;
          localStorage.setItem(key, JSON.stringify(updatedUser));
          return { game: { ...game }, user: updatedUser };
      }
  },

  db: {
    purchasePackage: async (price: number, gcAmount: number, scAmount: number): Promise<UserProfile> => {
        if (supabase) {
            try {
                const { data, error } = await supabase.rpc('purchase_package', { price, gc_amount: gcAmount, sc_amount: scAmount });
                if (!error) {
                    const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
                    return validateData(UserProfileSchema, updatedProfile, 'Purchase');
                }
            } catch(e) {}
        }
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        const stored = localStorage.getItem(STORAGE_KEY); if (!stored) throw new Error("No session"); const user = JSON.parse(stored) as UserProfile;
        user.gcBalance += gcAmount; user.scBalance += scAmount; if (price >= REDEMPTION_UNLOCK_PRICE) user.hasUnlockedRedemption = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); return user;
    },
    redeem: async (amount: number): Promise<UserProfile> => {
        if (supabase) {
            try {
                const { data, error } = await supabase.rpc('redeem_sc', { amount });
                if (!error) {
                    const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
                    return validateData(UserProfileSchema, updatedProfile, 'Redeem');
                }
            } catch(e) {}
        }
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        const stored = localStorage.getItem(STORAGE_KEY); if (!stored) throw new Error("No session"); const user = JSON.parse(stored) as UserProfile;
        if (user.redeemableSc >= amount) { user.scBalance -= amount; user.redeemableSc -= amount; }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); return user;
    },
    // NOWPayments Simulation
    createCryptoInvoice: async (packageId: string, price: number, asset: string): Promise<{ paymentId: string; payAddress: string; payAmount: number; expiration: number }> => {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network call to NOWPayments
        
        const mockAddresses: Record<string, string> = {
            'BTC': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            'ETH': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            'USDT': 'T9yD14Nj9j7xAB4dbGeiX9h8lu57832',
            'LTC': 'ltc1dfav423423123invalidaddresssim'
        };

        const rates: Record<string, number> = { 'BTC': 60000, 'ETH': 3000, 'USDT': 1.0, 'LTC': 80 };
        const rate = rates[asset] || 1;
        const rawAmount = price / rate;

        return {
            paymentId: 'np_id_' + Math.random().toString(36).substr(2, 9),
            payAddress: mockAddresses[asset] || '0xSimulatedAddress...',
            payAmount: parseFloat(rawAmount.toFixed(6)), 
            expiration: Date.now() + 20 * 60 * 1000 // 20 mins
        };
    },
    checkCryptoStatus: async (paymentId: string): Promise<'waiting' | 'confirming' | 'finished' | 'failed'> => {
        await new Promise(r => setTimeout(r, 800));
        // Randomly succeed for demo
        return Math.random() > 0.6 ? 'finished' : 'waiting';
    }
  }
};

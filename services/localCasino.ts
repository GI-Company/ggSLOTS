import { UserProfile, CurrencyType, WinResult, GameHistoryEntry, BlackjackState, Card, PokerState, MinesState, CrashState, RouletteBet } from '../types';
import { REDEMPTION_UNLOCK_PRICE } from '../constants';
import { complianceService } from './complianceService';
import {
    spinSlots, spinPlinko, getPlinkoMultipliers, shuffleShoe, drawCard, handScore,
    isBlackjack, isSoft17, playDealer, evaluatePoker, buildScratchTicket, roundMoney
} from '../lib/engine';
import { coverPayout, emptyHousePool, recordDeposit, recordRedemption, redemptionRoom, HousePool } from '../lib/housePool';
import {
    placeMines, minesMultiplier, crashPoint, crashMultiplierAt, spinWheel, rouletteCredit, rouletteStake, rouletteColor, MINES_TILES
} from '../lib/advancedGames';

type StoredUser = UserProfile & { passwordHash?: string; claimedSessions?: string[] };
type HistoryRow = GameHistoryEntry & { userId: string };
interface TableRow { state: BlackjackState | PokerState | MinesState | CrashState; deck: Card[] }
interface DB {
    users: StoredUser[];
    sessionId: string | null;
    history: HistoryRow[];
    tables: Record<string, TableRow>;
    pool: HousePool;
}

const KEY = 'ggslots.wallet.v1';
const listeners = new Map<string, Set<(user: UserProfile) => void>>();

const empty = (): DB => ({ users: [], sessionId: null, history: [], tables: {}, pool: emptyHousePool() });

function load(): DB {
    if (typeof localStorage === 'undefined') return empty();
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return empty();
        const parsed = JSON.parse(raw) as DB;
        return {
            ...empty(),
            ...parsed,
            tables: parsed.tables || {},
            history: parsed.history || [],
            users: parsed.users || [],
            pool: { ...emptyHousePool(), ...(parsed.pool || {}) }
        };
    } catch {
        return empty();
    }
}

function save(db: DB) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(db));
}

function visible(user: StoredUser): UserProfile {
    const { passwordHash, claimedSessions, ...profile } = user;
    profile.redeemableSc = Math.min(profile.redeemableSc, redemptionRoom(load().pool));
    return profile;
}

function emit(user: UserProfile) {
    listeners.get(user.id)?.forEach(callback => callback(user));
}

async function hashPassword(password: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function requireUser(db: DB, userId: string): StoredUser {
    const user = db.users.find(entry => entry.id === userId);
    if (!user) throw new Error('Player not found. Sign in again.');
    return user;
}

function pushHistory(db: DB, userId: string, activityId: string, currency: CurrencyType, debit: number, credit: number) {
    db.history.unshift({
        id: crypto.randomUUID(),
        userId,
        activityId,
        timestamp: Date.now(),
        debit,
        credit,
        currency,
        result: credit > debit ? 'WIN' : 'LOSS'
    });
    db.history = db.history.slice(0, 80);
}

function applyRound(db: DB, user: StoredUser, currency: CurrencyType, wager: number, payout: number): number {
    if (currency === CurrencyType.GC) {
        if (user.gcBalance < wager) throw new Error('Insufficient Balance');
    } else if (user.scBalance < wager) {
        throw new Error('Insufficient Balance');
    }
    const paid = coverPayout(db.pool, currency, wager, payout);
    if (currency === CurrencyType.GC) {
        user.gcBalance = roundMoney(currency, user.gcBalance - wager + paid);
        return paid;
    }
    const unredeemable = Math.max(0, user.scBalance - user.redeemableSc);
    const converted = Math.min(wager, unredeemable);
    user.scBalance = roundMoney(currency, user.scBalance - wager + paid);
    user.redeemableSc = roundMoney(currency, Math.min(user.scBalance, user.redeemableSc + converted + paid));
    return paid;
}

function withUser(userId: string, change: (user: StoredUser, db: DB) => void): UserProfile {
    const db = load();
    const user = requireUser(db, userId);
    change(user, db);
    save(db);
    const next = visible(user);
    emit(next);
    return next;
}

function freshProfile(partial: Partial<StoredUser> & Pick<StoredUser, 'id' | 'email'>): StoredUser {
    return {
        gcBalance: 0,
        scBalance: 0,
        vipLevel: 'Bronze',
        hasUnlockedRedemption: false,
        redeemableSc: 0,
        kycStatus: 'unverified',
        isAddressLocked: false,
        isGuest: false,
        lastLogin: Date.now(),
        consecutiveDays: 1,
        claimedSessions: [],
        ...partial
    };
}

function touchDaily(user: StoredUser) {
    const today = new Date().toDateString();
    const last = user.lastLogin ? new Date(user.lastLogin).toDateString() : '';
    if (last === today) return;
    if (!user.isGuest) {
        user.gcBalance = roundMoney(CurrencyType.GC, user.gcBalance + 10000);
        user.consecutiveDays = (user.consecutiveDays || 0) + 1;
    }
    user.lastLogin = Date.now();
}

function publicBlackjack(state: BlackjackState): BlackjackState {
    return { ...state, deck: [] };
}

function saveTable(id: string, row: TableRow) {
    const db = load();
    db.tables[id] = row;
    save(db);
}

function poolRoom(currency: CurrencyType) {
    const pool = load().pool;
    const raw = currency === CurrencyType.GC ? pool.wageredGc - pool.wonGc : pool.wageredSc - pool.wonSc;
    return Math.max(0, Math.round(raw * 100) / 100);
}

function publicMines(state: MinesState): MinesState {
    const payable = poolRoom(state.currency);
    if (state.status === 'active') {
        const { mineSet: _mineSet, ...visibleState } = state;
        return { ...visibleState, mineSet: [] as number[], payable };
    }
    return { ...state, payable };
}

function publicCrash(state: CrashState, multiplier = state.multiplier) {
    const shown: CrashState = { ...state, multiplier };
    if (state.status === 'active') return { ...shown, crashAt: 0 };
    return shown;
}

function handCredit(hand: Card[], dealer: Card[], bet: number): number {
    const player = handScore(hand);
    if (player > 21) return 0;
    const dealerScore = handScore(dealer);
    const playerNatural = isBlackjack(hand);
    const dealerNatural = isBlackjack(dealer);
    if (playerNatural && dealerNatural) return bet;
    if (playerNatural) return bet * 2.5;
    if (dealerScore > 21 || player > dealerScore) return bet * 2;
    if (player === dealerScore) return bet;
    return 0;
}

function outcomeStatus(credit: number, risked: number): BlackjackState['status'] {
    if (credit > risked) return 'player_win';
    if (credit === risked && credit > 0) return 'push';
    if (handScore([]) === 0 && credit === 0) return 'dealer_win';
    return credit === 0 ? 'dealer_win' : 'push';
}

function finishBlackjack(row: TableRow, user: StoredUser, db: DB): BlackjackState {
    const state = row.state as BlackjackState;
    if (state.status !== 'active') return state;
    const dealer = playDealer(row.deck, state.dealer_hand);
    const hands = state.hands && state.hands.length > 0 ? state.hands : [state.player_hand];
    const bets = state.handBets && state.handBets.length === hands.length ? state.handBets : hands.map(() => state.wager);
    let credit = 0;
    hands.forEach((hand, index) => { credit += handCredit(hand, dealer, bets[index]); });
    const risked = bets.reduce((sum, bet) => sum + bet, 0);
    const paid = applyRound(db, user, state.currency, 0, credit);
    const dealerScore = handScore(dealer);
    let status = outcomeStatus(paid, risked);
    if (hands.every(hand => handScore(hand) > 21)) status = 'player_bust';
    else if (dealerScore > 21 && paid > 0) status = 'dealer_bust';
    state.dealer_hand = dealer;
    state.dealer_score = dealerScore;
    state.player_hand = hands[state.activeHand || 0] || hands[0];
    state.player_score = handScore(state.player_hand);
    state.hands = hands;
    state.payout = paid;
    state.status = status;
    return state;
}

function syncActive(state: BlackjackState) {
    const hands = state.hands || [state.player_hand];
    const index = state.activeHand || 0;
    state.player_hand = hands[index];
    state.player_score = handScore(state.player_hand);
}

export const localCasino = {
    auth: {
        signInAsGuest: async (): Promise<{ user: UserProfile; message?: string }> => {
            const db = load();
            if (db.sessionId) {
                const existing = db.users.find(user => user.id === db.sessionId);
                if (existing) return { user: visible(existing) };
            }
            const guest = freshProfile({
                id: `guest_${crypto.randomUUID()}`,
                email: 'Guest Player',
                isGuest: true,
                gcBalance: 100000,
                vipLevel: 'Guest'
            });
            db.users.push(guest);
            db.sessionId = guest.id;
            save(db);
            return { user: visible(guest), message: 'Welcome Guest! 100,000 Gold Coins are ready.' };
        },
        signIn: async (email: string, password?: string, profileData?: Partial<UserProfile>) => {
            const db = load();
            try {
                if (!password) return { data: null, error: 'Password required' };
                const passwordHash = await hashPassword(password);
                if (profileData) {
                    if (db.users.some(user => user.email.toLowerCase() === email.toLowerCase() && !user.isGuest)) {
                        return { data: null, error: 'An account with that email already exists on this device.' };
                    }
                    const user = freshProfile({
                        id: crypto.randomUUID(),
                        email,
                        passwordHash,
                        gcBalance: 25000,
                        scBalance: 20,
                        ...profileData,
                        kycStatus: profileData.kycStatus || 'unverified',
                        isAddressLocked: true
                    });
                    db.users.push(user);
                    db.sessionId = user.id;
                    save(db);
                    return { data: visible(user), error: null, message: 'Welcome! 25,000 GC and 20.00 SC are in your account.' };
                }
                const user = db.users.find(entry => entry.email.toLowerCase() === email.toLowerCase() && !entry.isGuest);
                if (!user || user.passwordHash !== passwordHash) return { data: null, error: 'Email or password is incorrect.' };
                touchDaily(user);
                db.sessionId = user.id;
                save(db);
                return { data: visible(user), error: null, message: 'Welcome back!' };
            } catch (error: any) {
                return { data: null, error: error.message || 'Authentication failed' };
            }
        },
        resetPassword: async () => ({ success: false, message: 'Password reset email needs a connected account service. Use the password saved on this device.' }),
        signOut: async () => {
            const db = load();
            db.sessionId = null;
            save(db);
        },
        getSession: async () => {
            const db = load();
            if (!db.sessionId) return null;
            const user = db.users.find(entry => entry.id === db.sessionId);
            if (!user) return null;
            touchDaily(user);
            save(db);
            return visible(user);
        },
        subscribeToUserChanges: (userId: string, callback: (payload: UserProfile) => void) => {
            const set = listeners.get(userId) || new Set();
            set.add(callback);
            listeners.set(userId, set);
            return () => { set.delete(callback); };
        },
        submitKyc: async (userId: string) => {
            withUser(userId, user => { user.kycStatus = 'pending'; });
            return { success: true };
        }
    },
    game: {
        spin: async (user: UserProfile, wager: number, currency: CurrencyType, gameId: string, isFreeSpin = false, plinkoConfig?: { rows?: number; risk?: 'Low' | 'Medium' | 'High' }): Promise<{ user: UserProfile; result: WinResult }> => {
            if (!isFreeSpin && currency === CurrencyType.SC) {
                const geo = await complianceService.verifyLocation();
                if (!geo.allowed) throw new Error(`Location Blocked: ${geo.reason}`);
            }
            const stake = isFreeSpin ? 0 : wager;
            const result = gameId.includes('plinko')
                ? spinPlinko(wager, plinkoConfig?.rows || 12, plinkoConfig?.risk || 'Medium')
                : spinSlots(wager, gameId);
            let paid = result.totalWin;
            const updated = withUser(user.id, (stored, db) => {
                paid = applyRound(db, stored, currency, stake, result.totalWin);
                pushHistory(db, user.id, gameId, currency, stake, paid);
            });
            if (result.totalWin > 0 && paid !== result.totalWin) {
                const ratio = paid / result.totalWin;
                result.winningLines = result.winningLines.map(line => ({ ...line, amount: line.amount * ratio }));
                if (result.plinkoOutcome) {
                    result.plinkoOutcome = { ...result.plinkoOutcome, multiplier: wager > 0 ? paid / wager : 0 };
                }
            }
            result.totalWin = paid;
            result.isBigWin = wager > 0 && paid > wager * 10;
            return { user: updated, result };
        },
        buyScratchTicket: async (user: UserProfile, currency: CurrencyType, gameId = 'scratch-cosmic') => {
            if (currency === CurrencyType.SC) {
                const geo = await complianceService.verifyLocation();
                if (!geo.allowed) throw new Error(`Location Blocked: ${geo.reason}`);
            }
            const ticket = buildScratchTicket(gameId, currency);
            let paid = ticket.prize;
            const updated = withUser(user.id, (stored, db) => {
                paid = applyRound(db, stored, currency, ticket.cost, ticket.prize);
                pushHistory(db, user.id, gameId, currency, ticket.cost, paid);
            });
            ticket.prize = paid;
            ticket.isWin = paid > 0;
            if (!ticket.isWin) ticket.tier = 'loser';
            const result: WinResult = {
                totalWin: ticket.prize,
                winningLines: [],
                isBigWin: ticket.tier === 'jackpot',
                freeSpinsWon: 0,
                bonusText: ticket.isWin ? ticket.tier.toUpperCase() : '',
                stopIndices: [],
                scratchOutcome: ticket
            };
            return { user: updated, result };
        },
        settle: async (user: UserProfile, currency: CurrencyType, debit: number, credit: number, activityId: string) => {
            if (currency === CurrencyType.SC && debit > 0) {
                const geo = await complianceService.verifyLocation();
                if (!geo.allowed) throw new Error(`Location Blocked: ${geo.reason}`);
            }
            let credited = 0;
            const updated = withUser(user.id, (stored, db) => {
                credited = applyRound(db, stored, currency, debit, credit);
                if (debit > 0 || credited > 0) pushHistory(db, user.id, activityId, currency, debit, credited);
            });
            return { user: updated, credited };
        },
        getHistory: async (): Promise<GameHistoryEntry[]> => {
            const db = load();
            const userId = db.sessionId;
            return db.history.filter(row => row.userId === userId).map(({ userId: _userId, ...entry }) => entry);
        },
        subscribeToHistory: () => () => {},
        getPlinkoMultipliers
    },
    blackjack: {
        start: async (user: UserProfile, wager: number, currency: CurrencyType) => {
            if (currency === CurrencyType.SC) {
                const geo = await complianceService.verifyLocation();
                if (!geo.allowed) throw new Error(`Location Blocked: ${geo.reason}`);
            }
            const deck = shuffleShoe(6);
            const player = [drawCard(deck), drawCard(deck)];
            const dealer = [drawCard(deck), drawCard(deck)];
            const state: BlackjackState = {
                id: `bj_${crypto.randomUUID()}`,
                deck: [],
                player_hand: player,
                dealer_hand: dealer,
                player_score: handScore(player),
                dealer_score: handScore([dealer[0]]),
                status: 'active',
                wager,
                currency,
                payout: 0,
                hands: [player],
                handBets: [wager],
                activeHand: 0
            };
            let updated = withUser(user.id, (stored, db) => {
                applyRound(db, stored, currency, wager, 0);
                pushHistory(db, user.id, 'blackjack', currency, wager, 0);
            });
            if (isBlackjack(player) || isBlackjack(dealer)) {
                const row = { state, deck };
                updated = withUser(user.id, (stored, db) => { finishBlackjack(row, stored, db); });
            }
            const db = load();
            db.tables[state.id] = { state, deck };
            save(db);
            return { game: publicBlackjack(state), user: updated };
        },
        hit: async (gameId: string, user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Hand not found.');
            const state = row.state as BlackjackState;
            if (state.status !== 'active') return { game: publicBlackjack(state), user: visible(requireUser(db, user.id)) };
            const hands = state.hands || [state.player_hand];
            const index = state.activeHand || 0;
            hands[index].push(drawCard(row.deck));
            state.hands = hands;
            syncActive(state);
            let updated = visible(requireUser(db, user.id));
            if (handScore(hands[index]) >= 21) {
                const next = hands.findIndex((_, handIndex) => handIndex > index);
                if (next === -1) updated = withUser(user.id, (stored, db) => { finishBlackjack(row, stored, db); });
                else {
                    state.activeHand = next;
                    syncActive(state);
                }
            }
            saveTable(gameId, row);
            return { game: publicBlackjack(state), user: updated };
        },
        stand: async (gameId: string, user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Hand not found.');
            const state = row.state as BlackjackState;
            if (state.status !== 'active') return { game: publicBlackjack(state), user: visible(requireUser(db, user.id)) };
            const hands = state.hands || [state.player_hand];
            const index = state.activeHand || 0;
            const next = hands.findIndex((_, handIndex) => handIndex > index);
            let updated = visible(requireUser(db, user.id));
            if (next === -1) updated = withUser(user.id, (stored, db) => { finishBlackjack(row, stored, db); });
            else {
                state.activeHand = next;
                syncActive(state);
            }
            saveTable(gameId, row);
            return { game: publicBlackjack(state), user: updated };
        },
        doubleDown: async (gameId: string, user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Hand not found.');
            const state = row.state as BlackjackState;
            const hands = state.hands || [state.player_hand];
            const index = state.activeHand || 0;
            if (hands[index].length !== 2) throw new Error('Double is only available on the first two cards.');
            const bets = state.handBets || [state.wager];
            const extra = bets[index];
            let updated = withUser(user.id, (stored, book) => {
                applyRound(book, stored, state.currency, extra, 0);
                pushHistory(book, user.id, 'blackjack-double', state.currency, extra, 0);
            });
            bets[index] += extra;
            state.handBets = bets;
            state.wager += extra;
            hands[index].push(drawCard(row.deck));
            state.hands = hands;
            const next = hands.findIndex((_, handIndex) => handIndex > index);
            if (next === -1) updated = withUser(user.id, (stored, db) => { finishBlackjack(row, stored, db); });
            else {
                state.activeHand = next;
                syncActive(state);
            }
            saveTable(gameId, row);
            return { game: publicBlackjack(state), user: updated };
        },
        split: async (gameId: string, user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Hand not found.');
            const state = row.state as BlackjackState;
            const hands = state.hands || [state.player_hand];
            if (hands.length !== 1 || hands[0].length !== 2 || hands[0][0].rank !== hands[0][1].rank) {
                throw new Error('Split is only available on a pair.');
            }
            const bet = state.wager;
            let updated = withUser(user.id, (stored, book) => {
                applyRound(book, stored, state.currency, bet, 0);
                pushHistory(book, user.id, 'blackjack-split', state.currency, bet, 0);
            });
            const left: Card[] = [hands[0][0], drawCard(row.deck)];
            const right: Card[] = [hands[0][1], drawCard(row.deck)];
            state.hands = [left, right];
            state.handBets = [bet, bet];
            state.wager = bet * 2;
            state.activeHand = 0;
            syncActive(state);
            if (hands[0][0].rank === 'A') {
                updated = withUser(user.id, (stored, db) => { finishBlackjack(row, stored, db); });
            }
            saveTable(gameId, row);
            return { game: publicBlackjack(state), user: updated };
        }
    },
    poker: {
        deal: async (user: UserProfile, wager: number, currency: CurrencyType) => {
            if (currency === CurrencyType.SC) {
                const geo = await complianceService.verifyLocation();
                if (!geo.allowed) throw new Error(`Location Blocked: ${geo.reason}`);
            }
            const deck = shuffleShoe(1);
            const hand = [drawCard(deck), drawCard(deck), drawCard(deck), drawCard(deck), drawCard(deck)];
            const game: PokerState = {
                id: `pk_${crypto.randomUUID()}`,
                deck: [],
                hand,
                stage: 'draw',
                heldIndices: [],
                wager,
                currency,
                winAmount: 0,
                handName: ''
            };
            const updated = withUser(user.id, (stored, db) => {
                applyRound(db, stored, currency, wager, 0);
                pushHistory(db, user.id, 'video-poker', currency, wager, 0);
                db.tables[game.id] = { state: game, deck };
            });
            return { game, user: updated };
        },
        draw: async (gameId: string, held: number[], user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Hand not found.');
            const game = row.state as PokerState;
            if (game.stage !== 'draw') throw new Error('Hand is already complete.');
            game.hand = game.hand.map((card, index) => held.includes(index) ? card : drawCard(row.deck));
            const scored = evaluatePoker(game.hand);
            const win = roundMoney(game.currency, game.wager * scored.multiplier);
            let paid = win;
            const updated = withUser(user.id, (stored, book) => {
                paid = applyRound(book, stored, game.currency, 0, win);
                pushHistory(book, user.id, 'video-poker', game.currency, 0, paid);
            });
            game.stage = 'over';
            game.heldIndices = held;
            game.handName = paid > 0 ? scored.name : 'Nothing';
            game.winAmount = paid;
            saveTable(gameId, row);
            return { game, user: updated };
        }
    },
    mines: {
        start: async (user: UserProfile, wager: number, currency: CurrencyType, mines: number) => {
            if (currency === CurrencyType.SC) {
                const geo = await complianceService.verifyLocation();
                if (!geo.allowed) throw new Error(`Location Blocked: ${geo.reason}`);
            }
            if (wager <= 0) throw new Error('Choose a wager.');
            const state: MinesState = {
                id: `mn_${crypto.randomUUID()}`,
                wager,
                currency,
                mines,
                mineSet: placeMines(mines, () => complianceService.getRandom()),
                revealed: [],
                status: 'active',
                multiplier: 0,
                payout: 0
            };
            const updated = withUser(user.id, (stored, db) => {
                applyRound(db, stored, currency, wager, 0);
                pushHistory(db, user.id, 'mines', currency, wager, 0);
                db.tables[state.id] = { state, deck: [] };
            });
            return { game: publicMines(state), user: updated };
        },
        reveal: async (gameId: string, index: number, user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Round not found.');
            const state = row.state as MinesState;
            if (state.status !== 'active') return { game: publicMines(state), user: visible(requireUser(load(), user.id)) };
            if (index < 0 || index >= MINES_TILES) throw new Error('That tile is off the board.');
            if (state.revealed.includes(index)) return { game: publicMines(state), user: visible(requireUser(db, user.id)) };
            if (state.mineSet.includes(index)) {
                state.revealed = [...state.revealed, index];
                state.status = 'bust';
                state.multiplier = 0;
                state.payout = 0;
                saveTable(gameId, row);
                return { game: publicMines(state), user: visible(requireUser(load(), user.id)) };
            }
            state.revealed = [...state.revealed, index];
            state.multiplier = minesMultiplier(state.mines, state.revealed.length);
            saveTable(gameId, row);
            if (state.revealed.length >= MINES_TILES - state.mines) {
                return localCasino.mines.cashout(gameId, user);
            }
            return { game: publicMines(state), user: visible(requireUser(load(), user.id)) };
        },
        cashout: async (gameId: string, user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Round not found.');
            const state = row.state as MinesState;
            if (state.status !== 'active') return { game: publicMines(state), user: visible(requireUser(db, user.id)) };
            if (state.revealed.length === 0) throw new Error('Reveal a gem before cashing out.');
            const requested = roundMoney(state.currency, state.wager * state.multiplier);
            let paid = 0;
            const updated = withUser(user.id, (stored, book) => {
                paid = applyRound(book, stored, state.currency, 0, requested);
                pushHistory(book, user.id, 'mines', state.currency, 0, paid);
            });
            const fresh = load();
            const saved = fresh.tables[gameId];
            const next = saved.state as MinesState;
            next.status = 'cashed';
            next.payout = paid;
            next.multiplier = next.wager > 0 ? roundMoney(next.currency, paid / next.wager) : 0;
            save(fresh);
            return { game: publicMines(next), user: updated };
        }
    },
    crash: {
        start: async (user: UserProfile, wager: number, currency: CurrencyType) => {
            if (currency === CurrencyType.SC) {
                const geo = await complianceService.verifyLocation();
                if (!geo.allowed) throw new Error(`Location Blocked: ${geo.reason}`);
            }
            if (wager <= 0) throw new Error('Choose a wager.');
            const state: CrashState = {
                id: `cr_${crypto.randomUUID()}`,
                wager,
                currency,
                startedAt: Date.now(),
                crashAt: crashPoint(() => complianceService.getRandom()),
                status: 'active',
                multiplier: 1,
                payout: 0
            };
            const updated = withUser(user.id, (stored, db) => {
                applyRound(db, stored, currency, wager, 0);
                pushHistory(db, user.id, 'crash', currency, wager, 0);
                db.tables[state.id] = { state, deck: [] };
            });
            return { game: publicCrash(state, 1), user: updated };
        },
        peek: async (gameId: string, user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Round not found.');
            const state = row.state as CrashState;
            if (state.status !== 'active') return { game: publicCrash(state), user: visible(requireUser(db, user.id)) };
            const shown = crashMultiplierAt(Date.now() - state.startedAt);
            if (shown < state.crashAt) {
                return { game: publicCrash(state, shown), user: visible(requireUser(db, user.id)) };
            }
            state.status = 'bust';
            state.multiplier = state.crashAt;
            state.payout = 0;
            saveTable(gameId, row);
            return { game: publicCrash(state), user: visible(requireUser(load(), user.id)) };
        },
        cashout: async (gameId: string, user: UserProfile) => {
            const db = load();
            const row = db.tables[gameId];
            if (!row) throw new Error('Round not found.');
            const state = row.state as CrashState;
            if (state.status !== 'active') return { game: publicCrash(state), user: visible(requireUser(db, user.id)) };
            const shown = crashMultiplierAt(Date.now() - state.startedAt);
            if (shown >= state.crashAt) {
                state.status = 'bust';
                state.multiplier = state.crashAt;
                state.payout = 0;
                saveTable(gameId, row);
                return { game: publicCrash(state), user: visible(requireUser(load(), user.id)) };
            }
            if (shown < 1.01) throw new Error('Give the rocket a moment.');
            const requested = roundMoney(state.currency, state.wager * shown);
            let paid = 0;
            const updated = withUser(user.id, (stored, book) => {
                paid = applyRound(book, stored, state.currency, 0, requested);
                pushHistory(book, user.id, 'crash', state.currency, 0, paid);
            });
            const fresh = load();
            const next = fresh.tables[gameId].state as CrashState;
            next.status = 'cashed';
            next.payout = paid;
            next.multiplier = next.wager > 0 ? roundMoney(next.currency, paid / next.wager) : 0;
            save(fresh);
            return { game: publicCrash(next), user: updated };
        }
    },
    roulette: {
        spin: async (user: UserProfile, currency: CurrencyType, bets: RouletteBet[]) => {
            if (currency === CurrencyType.SC) {
                const geo = await complianceService.verifyLocation();
                if (!geo.allowed) throw new Error(`Location Blocked: ${geo.reason}`);
            }
            const stake = rouletteStake(bets);
            if (stake <= 0) throw new Error('Place a bet first.');
            const number = spinWheel(() => complianceService.getRandom());
            const credit = rouletteCredit(bets, number);
            let paid = 0;
            const updated = withUser(user.id, (stored, db) => {
                paid = applyRound(db, stored, currency, stake, credit);
                pushHistory(db, user.id, 'roulette', currency, stake, paid);
            });
            return {
                result: { number, color: rouletteColor(number), wager: stake, payout: paid, bets },
                user: updated
            };
        }
    },
    db: {
        purchasePackage: async (price: number, gcAmount: number, scAmount: number, sessionId?: string) => {
            const db = load();
            const user = requireUser(db, db.sessionId || '');
            if (sessionId && user.claimedSessions?.includes(sessionId)) return visible(user);
            user.gcBalance = roundMoney(CurrencyType.GC, user.gcBalance + gcAmount);
            user.scBalance = roundMoney(CurrencyType.SC, user.scBalance + scAmount);
            if (price >= REDEMPTION_UNLOCK_PRICE) user.hasUnlockedRedemption = true;
            recordDeposit(db.pool, price);
            user.claimedSessions = [...(user.claimedSessions || []), sessionId || crypto.randomUUID()];
            pushHistory(db, user.id, 'coin-purchase', CurrencyType.GC, price, gcAmount);
            save(db);
            const next = visible(user);
            emit(next);
            return next;
        },
        redeem: async (amount: number) => {
            const db = load();
            const user = requireUser(db, db.sessionId || '');
            if (user.kycStatus !== 'verified') throw new Error('Identity verification is required.');
            if (!user.hasUnlockedRedemption) throw new Error('Redemption is still locked.');
            if (amount > user.redeemableSc) throw new Error('Amount is above the redeemable balance.');
            recordRedemption(db.pool, amount);
            user.redeemableSc = roundMoney(CurrencyType.SC, user.redeemableSc - amount);
            user.scBalance = roundMoney(CurrencyType.SC, user.scBalance - amount);
            pushHistory(db, user.id, 'redemption', CurrencyType.SC, amount, 0);
            save(db);
            const next = visible(user);
            emit(next);
            return next;
        }
    }
};

import { CurrencyType, WinResult, Card, ScratchTicket } from '../types';
import { PAYLINES, GAME_DATA } from '../constants';
import { complianceService } from '../services/complianceService';

const SUITS: Card['suit'][] = ['H', 'D', 'C', 'S'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getPlinkoMultipliers(rows: number, risk: 'Low' | 'Medium' | 'High'): number[] {
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
}

function lineSymbol(cells: string[]): string | null {
    if (cells.includes('SCATTER')) return null;
    const concrete = cells.filter(symbol => symbol !== 'WILD');
    if (concrete.length === 0) return 'WILD';
    if (concrete.every(symbol => symbol === concrete[0])) return concrete[0];
    return null;
}

export function spinSlots(wager: number, gameId: string): WinResult {
    const data = GAME_DATA[gameId] || GAME_DATA['default'];
    const strips = data.strips;
    const stopIndices = strips.map(strip => complianceService.getRandomInt(0, strip.length - 1));
    const grid: string[][] = [[], [], []];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const strip = strips[col];
            const idx = (stopIndices[col] + row) % strip.length;
            grid[row].push(strip[idx]);
        }
    }

    let totalWin = 0;
    const winningLines: WinResult['winningLines'] = [];
    PAYLINES.forEach((line, lineIdx) => {
        const cells = line.map(([row, col]) => grid[row][col]);
        const symbol = lineSymbol(cells);
        if (!symbol) return;
        const payoutMult = data.payouts[symbol] || 0;
        const lineWin = (payoutMult * wager) / 5;
        if (lineWin <= 0) return;
        totalWin += lineWin;
        winningLines.push({ lineIndex: lineIdx, symbol, amount: lineWin });
    });

    const scatterCount = grid.flat().filter(symbol => symbol === 'SCATTER').length;
    const freeSpins = scatterCount >= 3 ? 10 : 0;

    return {
        totalWin,
        winningLines,
        isBigWin: totalWin > wager * 10,
        freeSpinsWon: freeSpins,
        bonusText: freeSpins > 0 ? 'FREE SPINS' : '',
        stopIndices,
        rngSeed: complianceService.generateGameSeed()
    };
}

export function spinPlinko(wager: number, rows: number, risk: 'Low' | 'Medium' | 'High'): WinResult {
    const multipliers = getPlinkoMultipliers(rows, risk);
    let bucket = 0;
    const path: number[] = [];
    for (let i = 0; i < rows; i++) {
        const dir = complianceService.getRandom() > 0.5 ? 1 : 0;
        path.push(dir);
        bucket += dir;
    }
    const multiplier = multipliers[bucket];
    const win = wager * multiplier;
    return {
        totalWin: win,
        winningLines: [],
        isBigWin: multiplier >= 10,
        freeSpinsWon: 0,
        bonusText: multiplier >= 10 ? `${multiplier}x` : '',
        stopIndices: [],
        plinkoOutcome: { path, bucketIndex: bucket, multiplier, rows, risk },
        rngSeed: complianceService.generateGameSeed()
    };
}

function rankValue(rank: string): number {
    if (rank === 'A') return 11;
    if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
    return parseInt(rank, 10);
}

export function handScore(hand: Card[]): number {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
        score += card.value;
        if (card.rank === 'A') aces += 1;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces -= 1;
    }
    return score;
}

export function isSoft17(hand: Card[]): boolean {
    const total = hand.reduce((sum, card) => sum + (card.rank === 'A' ? 1 : card.value), 0);
    const aces = hand.filter(card => card.rank === 'A').length;
    return aces > 0 && total + 10 === 17;
}

export function shuffleShoe(decks = 6): Card[] {
    const cards: Card[] = [];
    for (let deck = 0; deck < decks; deck++) {
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                cards.push({ suit, rank, value: rankValue(rank) });
            }
        }
    }
    for (let i = cards.length - 1; i > 0; i--) {
        const j = complianceService.getRandomInt(0, i);
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

export function drawCard(deck: Card[]): Card {
    const card = deck.pop();
    if (!card) throw new Error('Shoe empty');
    return card;
}

export function isBlackjack(hand: Card[]): boolean {
    return hand.length === 2 && handScore(hand) === 21;
}

export function playDealer(deck: Card[], dealer: Card[]): Card[] {
    const hand = [...dealer];
    while (handScore(hand) < 17 || isSoft17(hand)) {
        hand.push(drawCard(deck));
    }
    return hand;
}

const POKER_PAYOUT: Record<string, number> = {
    'Royal Flush': 800,
    'Straight Flush': 50,
    'Four of a Kind': 25,
    'Full House': 9,
    'Flush': 6,
    'Straight': 4,
    'Three of a Kind': 3,
    'Two Pair': 2,
    'Jacks or Better': 1
};

function pokerRank(rank: string): number {
    return RANKS.indexOf(rank);
}

export function evaluatePoker(hand: Card[]): { name: string; multiplier: number } {
    const ranks = hand.map(card => pokerRank(card.rank)).sort((a, b) => a - b);
    const flush = hand.every(card => card.suit === hand[0].suit);
    const unique = [...new Set(ranks)];
    const wheel = unique.join(',') === '0,1,2,3,12';
    const straight = unique.length === 5 && (unique[4] - unique[0] === 4 || wheel);
    const royal = flush && unique.join(',') === '0,9,10,11,12';
    const counts = new Map<number, number>();
    for (const rank of ranks) counts.set(rank, (counts.get(rank) || 0) + 1);
    const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    let name = 'Nothing';
    if (royal) name = 'Royal Flush';
    else if (flush && straight) name = 'Straight Flush';
    else if (groups[0][1] === 4) name = 'Four of a Kind';
    else if (groups[0][1] === 3 && groups[1]?.[1] === 2) name = 'Full House';
    else if (flush) name = 'Flush';
    else if (straight) name = 'Straight';
    else if (groups[0][1] === 3) name = 'Three of a Kind';
    else if (groups[0][1] === 2 && groups[1]?.[1] === 2) name = 'Two Pair';
    else if (groups[0][1] === 2) {
        const pairRank = groups[0][0];
        if (pairRank === 0 || pairRank >= 10) name = 'Jacks or Better';
    }
    return { name, multiplier: POKER_PAYOUT[name] || 0 };
}

export const SCRATCH_RULES: Record<string, { gc: number; sc: number }> = {
    'scratch-cosmic': { gc: 500, sc: 1 },
    'scratch-777': { gc: 1000, sc: 5 },
    'scratch-gold': { gc: 500, sc: 2 },
    'scratch-neon': { gc: 200, sc: 1 },
    'scratch-zombie': { gc: 500, sc: 2 },
    'scratch-diamond': { gc: 2000, sc: 10 }
};

const SCRATCH_SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎', '7️⃣'];

export function buildScratchTicket(gameId: string, currency: CurrencyType): ScratchTicket {
    const rules = SCRATCH_RULES[gameId] || SCRATCH_RULES['scratch-cosmic'];
    const cost = currency === CurrencyType.GC ? rules.gc : rules.sc;
    const roll = complianceService.getRandom();
    let multiplier = 0;
    let tier: ScratchTicket['tier'] = 'loser';
    if (roll < 0.01) { multiplier = 15; tier = 'jackpot'; }
    else if (roll < 0.05) { multiplier = 4; tier = 'high'; }
    else if (roll < 0.17) { multiplier = 2; tier = 'mid'; }
    else if (roll < 0.45) { multiplier = 1.2; tier = 'low'; }

    const prize = currency === CurrencyType.GC
        ? Math.round(cost * multiplier)
        : Math.round(cost * multiplier * 100) / 100;

    const grid = Array.from({ length: 9 }, () => SCRATCH_SYMBOLS[complianceService.getRandomInt(0, SCRATCH_SYMBOLS.length - 1)]);
    if (prize > 0) {
        const winSymbol = tier === 'jackpot' ? '💎' : tier === 'high' ? '7️⃣' : tier === 'mid' ? '⭐' : '🍒';
        const row = complianceService.getRandomInt(0, 2);
        grid[row * 3] = winSymbol;
        grid[row * 3 + 1] = winSymbol;
        grid[row * 3 + 2] = winSymbol;
    }

    return { grid, prize, currency, isWin: prize > 0, cost, tier };
}

export function roundMoney(currency: CurrencyType, amount: number): number {
    if (currency === CurrencyType.SC) return Math.round(amount * 100) / 100;
    return Math.round(amount * 100) / 100;
}

import { RouletteBet } from '../types';

export const MINES_TILES = 25;
export const MINES_EDGE = 0.97;
export const CRASH_EDGE = 0.04;

/** European wheel order, clockwise from the green zero. */
export const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function rouletteColor(number: number): 'red' | 'black' | 'green' {
    if (number === 0) return 'green';
    return ROULETTE_RED.has(number) ? 'red' : 'black';
}

function floorCents(amount: number): number {
    return Math.floor(amount * 100) / 100;
}

/** Fair-minus-edge multiplier after `gems` safe reveals. */
export function minesMultiplier(mines: number, gems: number, edge = MINES_EDGE): number {
    if (gems <= 0) return 0;
    if (mines < 1 || mines > MINES_TILES - 1) throw new Error('Choose between 1 and 24 mines.');
    if (gems > MINES_TILES - mines) throw new Error('No safe tiles left.');
    let chance = 1;
    for (let i = 0; i < gems; i++) {
        chance *= (MINES_TILES - mines - i) / (MINES_TILES - i);
    }
    return floorCents(edge / chance);
}

export function placeMines(mines: number, random: () => number): number[] {
    if (mines < 1 || mines > MINES_TILES - 1) throw new Error('Choose between 1 and 24 mines.');
    const spots = Array.from({ length: MINES_TILES }, (_, index) => index);
    for (let i = spots.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    return spots.slice(0, mines).sort((a, b) => a - b);
}

/**
 * Crash point. A roll inside the edge busts at 1.00x.
 * Otherwise the point is (1 - edge) / (1 - roll), floored to cents.
 */
export function crashPoint(random: () => number, edge = CRASH_EDGE): number {
    const roll = Math.min(0.999999, Math.max(0, random()));
    if (roll < edge) return 1;
    return Math.max(1, floorCents((1 - edge) / (1 - roll)));
}

/** Multiplier shown `elapsedMs` after liftoff. Starts at 1.00x. */
export function crashMultiplierAt(elapsedMs: number): number {
    const raw = Math.exp(0.00006 * Math.max(0, elapsedMs));
    return floorCents(raw);
}

export function spinWheel(random: () => number): number {
    return Math.floor(random() * 37);
}

function betWins(bet: RouletteBet, result: number): boolean {
    if (bet.kind === 'straight') return bet.number === result;
    if (result === 0) return false;
    if (bet.kind === 'color') return rouletteColor(result) === bet.color;
    if (bet.kind === 'parity') return (result % 2 === 0 ? 'even' : 'odd') === bet.parity;
    if (bet.kind === 'half') return (result <= 18 ? 'low' : 'high') === bet.half;
    if (bet.kind === 'dozen') return Math.ceil(result / 12) === bet.dozen;
    return ((result - 1) % 3) + 1 === bet.column;
}

function odds(bet: RouletteBet): number {
    if (bet.kind === 'straight') return 35;
    if (bet.kind === 'dozen' || bet.kind === 'column') return 2;
    return 1;
}

/** Credit returned to the player, including the stake on winning bets. */
export function rouletteCredit(bets: RouletteBet[], result: number): number {
    return floorCents(bets.reduce((sum, bet) => {
        if (bet.amount <= 0) return sum;
        return betWins(bet, result) ? sum + bet.amount * (odds(bet) + 1) : sum;
    }, 0));
}

export function rouletteStake(bets: RouletteBet[]): number {
    return floorCents(bets.reduce((sum, bet) => sum + Math.max(0, bet.amount), 0));
}

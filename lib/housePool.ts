import { CurrencyType } from '../types';

/** Shared across every account. One player can win more than they wagered only when other play has funded it. */
export interface HousePool {
    wageredGc: number;
    wonGc: number;
    wageredSc: number;
    wonSc: number;
    depositedUsd: number;
    redeemedUsd: number;
}

export const emptyHousePool = (): HousePool => ({
    wageredGc: 0,
    wonGc: 0,
    wageredSc: 0,
    wonSc: 0,
    depositedUsd: 0,
    redeemedUsd: 0
});

function money(amount: number): number {
    return Math.round(amount * 100) / 100;
}

/**
 * Record a wager, then pay as much of the requested prize as the pool can cover.
 * After this call, total prizes for the currency are never greater than total wagers.
 */
export function coverPayout(pool: HousePool, currency: CurrencyType, wager: number, requested: number): number {
    const stake = money(Math.max(0, wager));
    const ask = money(Math.max(0, requested));
    if (currency === CurrencyType.GC) {
        pool.wageredGc = money(pool.wageredGc + stake);
        const room = Math.max(0, money(pool.wageredGc - pool.wonGc));
        const paid = money(Math.min(ask, room));
        pool.wonGc = money(pool.wonGc + paid);
        return paid;
    }
    pool.wageredSc = money(pool.wageredSc + stake);
    const room = Math.max(0, money(pool.wageredSc - pool.wonSc));
    const paid = money(Math.min(ask, room));
    pool.wonSc = money(pool.wonSc + paid);
    return paid;
}

export function redemptionRoom(pool: HousePool): number {
    return money(Math.max(0, pool.depositedUsd - pool.redeemedUsd));
}

export function recordDeposit(pool: HousePool, usd: number) {
    pool.depositedUsd = money(pool.depositedUsd + Math.max(0, usd));
}

export function recordRedemption(pool: HousePool, amount: number) {
    const room = redemptionRoom(pool);
    if (amount > room + 0.001) {
        throw new Error(`Cash prizes cannot exceed player purchases. ${room.toFixed(2)} SC is available to redeem.`);
    }
    pool.redeemedUsd = money(pool.redeemedUsd + amount);
}

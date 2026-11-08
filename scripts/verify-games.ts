import { evaluatePoker, handScore, isSoft17, isBlackjack, buildScratchTicket, spinSlots, spinPlinko } from '../lib/engine';
import { minesMultiplier, placeMines, crashPoint, crashMultiplierAt, rouletteCredit, spinWheel } from '../lib/advancedGames';
import { coverPayout, emptyHousePool, recordDeposit, recordRedemption } from '../lib/housePool';
import { CurrencyType, Card } from '../types';

function card(rank: string, suit: Card['suit'] = 'S'): Card {
    const value = rank === 'A' ? 11 : (rank === 'J' || rank === 'Q' || rank === 'K' ? 10 : parseInt(rank, 10));
    return { rank, suit, value };
}

const royal = evaluatePoker([card('A'), card('K'), card('Q'), card('J'), card('10')]);
if (royal.name !== 'Royal Flush' || royal.multiplier !== 800) throw new Error(`Royal failed: ${royal.name}`);

const jacks = evaluatePoker([card('J', 'H'), card('J', 'D'), card('4'), card('7', 'H'), card('9')]);
if (jacks.name !== 'Jacks or Better' || jacks.multiplier !== 1) throw new Error(`Jacks failed: ${jacks.name}`);

const lows = evaluatePoker([card('2', 'H'), card('2', 'D'), card('4'), card('7', 'H'), card('9')]);
if (lows.multiplier !== 0) throw new Error('Low pair should not pay');

const wheel = evaluatePoker([card('A'), card('2', 'H'), card('3'), card('4'), card('5')]);
if (wheel.name !== 'Straight') throw new Error(`Wheel failed: ${wheel.name}`);

const soft = [card('A'), card('6')];
if (handScore(soft) !== 17 || !isSoft17(soft)) throw new Error('Soft 17 detection failed');
if (handScore([card('A'), card('6'), card('K')]) !== 17) throw new Error('Ace adjustment failed');
if (!isBlackjack([card('A'), card('K')])) throw new Error('Blackjack detection failed');

const firstGem = minesMultiplier(1, 1);
if (firstGem !== 1.01) throw new Error(`First gem multiplier ${firstGem}`);
if (minesMultiplier(5, 3) <= firstGem) throw new Error('Mines multiplier did not climb');
const buried = placeMines(5, () => 0.17);
if (new Set(buried).size !== 5 || buried.some(tile => tile < 0 || tile > 24)) throw new Error('Mine placement failed');
if (crashPoint(() => 0) !== 1) throw new Error('Crash edge should bust at 1.00x');
if (crashPoint(() => 0.5) !== 1.92) throw new Error(`Crash midpoint ${crashPoint(() => 0.5)}`);
if (crashMultiplierAt(0) !== 1 || crashMultiplierAt(8000) <= 1.2) throw new Error('Crash curve failed');
if (rouletteCredit([{ kind: 'color', color: 'red', amount: 10 }], 1) !== 20) throw new Error('Red bet should pay 1:1');
if (rouletteCredit([{ kind: 'color', color: 'red', amount: 10 }], 0) !== 0) throw new Error('Zero should take an outside bet');
if (rouletteCredit([{ kind: 'straight', number: 0, amount: 5 }], 0) !== 180) throw new Error('Straight zero should pay 35:1');
if (rouletteCredit([{ kind: 'dozen', dozen: 1, amount: 10 }], 12) !== 30) throw new Error('Dozen should pay 2:1');
if (spinWheel(() => 0) !== 0 || spinWheel(() => 0.999) !== 36) throw new Error('Wheel range failed');

const ticket = buildScratchTicket('scratch-diamond', CurrencyType.GC);
if (ticket.grid.length !== 9 || ticket.cost !== 2000) throw new Error('Scratch ticket shape failed');

const spin = spinSlots(100, 'cosmic-cash');
if (spin.stopIndices.length !== 3) throw new Error('Slot spin failed');

const plinko = spinPlinko(10, 12, 'High');
if (!plinko.plinkoOutcome || plinko.plinkoOutcome.path.length !== 12) throw new Error('Plinko path failed');

const pool = emptyHousePool();
const solo = coverPayout(pool, CurrencyType.GC, 100, 5000);
if (solo !== 100 || pool.wonGc !== 100 || pool.wageredGc !== 100) throw new Error('Solo player was paid more than the pool took in');
coverPayout(pool, CurrencyType.GC, 400, 0);
const lucky = coverPayout(pool, CurrencyType.GC, 50, 1000);
if (lucky !== 450) throw new Error(`Lucky player should collect the funded surplus, got ${lucky}`);
if (pool.wonGc > pool.wageredGc) throw new Error('House paid out more than it brought in');
const blocked = coverPayout(pool, CurrencyType.GC, 0, 25);
if (blocked !== 0) throw new Error('Empty pool still paid a prize');

recordDeposit(pool, 40);
recordRedemption(pool, 40);
let overRedeem = false;
try { recordRedemption(pool, 1); } catch { overRedeem = true; }
if (!overRedeem) throw new Error('Redemption exceeded purchases');
recordDeposit(pool, 25);
recordRedemption(pool, 25);
if (pool.redeemedUsd > pool.depositedUsd) throw new Error('Cash out exceeded purchases');

const memory = new Map<string, string>();
(globalThis as any).localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key)
};

const { localCasino } = await import('../services/localCasino.ts');
const guest = await localCasino.auth.signInAsGuest();
const before = guest.user.gcBalance;
const spun = await localCasino.game.spin(guest.user, 100, CurrencyType.GC, 'cosmic-cash');
if (Math.abs((before - 100 + spun.result.totalWin) - spun.user.gcBalance) > 0.01) {
    throw new Error(`Slot balance drift: ${before} -> ${spun.user.gcBalance} win ${spun.result.totalWin}`);
}
if (spun.user.gcBalance > before + 0.001) {
    throw new Error('First player was paid more than that account wagered while the pool had no surplus');
}

const dealt = await localCasino.poker.deal(spun.user, 100, CurrencyType.GC);
if (dealt.game.hand.length !== 5 || dealt.game.stage !== 'draw') throw new Error('Poker deal failed');
const drawn = await localCasino.poker.draw(dealt.game.id, [0, 1], dealt.user);
if (drawn.game.stage !== 'over' || drawn.game.hand.length !== 5) throw new Error('Poker draw failed');

const table = await localCasino.blackjack.start(drawn.user, 100, CurrencyType.GC);
if (table.game.player_hand.length !== 2 || table.game.dealer_hand.length !== 2) throw new Error('Blackjack deal failed');
let seated = table.user;
if (table.game.status === 'active') {
    const stood = await localCasino.blackjack.stand(table.game.id, table.user);
    if (stood.game.status === 'active') throw new Error('Blackjack did not settle');
    if (stood.user.gcBalance < 0) throw new Error('Blackjack balance went negative');
    seated = stood.user;
}

const mineRound = await localCasino.mines.start(seated, 100, CurrencyType.GC, 3);
if (Math.abs(seated.gcBalance - 100 - mineRound.user.gcBalance) > 0.01) throw new Error('Mines did not take the stake');
if (mineRound.game.mineSet.length !== 0) throw new Error('Active mine map was sent to the player');
let earlyCash = false;
try { await localCasino.mines.cashout(mineRound.game.id, mineRound.user); } catch { earlyCash = true; }
if (!earlyCash) throw new Error('Mines cashed out before a gem');
const opened = await localCasino.mines.reveal(mineRound.game.id, 0, mineRound.user);
if (opened.game.status === 'active') {
    const cashed = await localCasino.mines.cashout(opened.game.id, opened.user);
    if (cashed.game.payout - opened.game.wager * opened.game.multiplier > 0.05) throw new Error('Mines paid more than the gem multiplier');
} else if (opened.game.mineSet.length !== 3) {
    throw new Error('A bust should reveal the mine map');
}

await new Promise(resolve => setTimeout(resolve, 200));
const flight = await localCasino.crash.start(opened.user, 100, CurrencyType.GC);
const peek = await localCasino.crash.peek(flight.game.id, flight.user);
if (peek.game.status === 'active' && peek.game.crashAt !== 0) throw new Error('Crash point leaked while the rocket was flying');
await new Promise(resolve => setTimeout(resolve, 220));
const landed = await localCasino.crash.cashout(flight.game.id, peek.user);
if (landed.game.status === 'cashed' && landed.game.payout > landed.game.wager * landed.game.multiplier + 0.05) {
    throw new Error('Crash paid more than the cashed multiplier');
}

const spunWheel = await localCasino.roulette.spin(landed.user, CurrencyType.GC, [{ kind: 'straight', number: 17, amount: 100 }]);
if (spunWheel.result.number < 0 || spunWheel.result.number > 36) throw new Error('Roulette result out of range');
const fullCredit = rouletteCredit([{ kind: 'straight', number: 17, amount: 100 }], spunWheel.result.number);
if (spunWheel.result.payout - fullCredit > 0.05) throw new Error('Roulette paid more than the bet allows');

const ledger = JSON.parse((globalThis as any).localStorage.getItem('ggslots.wallet.v1'));
if (ledger.pool.wonGc - ledger.pool.wageredGc > 0.001 || ledger.pool.wonSc - ledger.pool.wageredSc > 0.001) {
    throw new Error('Shared pool paid out more than every player wagered');
}

// Commerce must remain fail-closed even if secrets are configured.
const { createCheckoutSession, readCheckoutSession, handleStripeWebhook } = await import('../server/stripe.mjs');
for (const operation of [
  () => createCheckoutSession({ packageId: 'pkg_5', userId: 'player', origin: 'https://gg-slots.vercel.app' }),
  () => readCheckoutSession('cs_test_placeholder'),
  () => handleStripeWebhook(Buffer.from('{}'), 'invalid')
]) {
  let blocked = false;
  try { await operation(); } catch (error: any) { blocked = error.code === 'COMMERCE_DISABLED' && error.status === 503; }
  if (!blocked) throw new Error('Commerce endpoint did not fail closed');
}
const demoSignIn = await localCasino.auth.signIn('no@example.invalid', 'unused-password');
if (demoSignIn.data || !demoSignIn.error) throw new Error('Local password registration must be disabled');
let localPurchaseBlocked = false;
try { await localCasino.db.purchasePackage(4.99, 5000, 5); } catch { localPurchaseBlocked = true; }
if (!localPurchaseBlocked) throw new Error('Demo wallet was credited by a purchase call');
let localRedeemBlocked = false;
try { await localCasino.db.redeem(5); } catch { localRedeemBlocked = true; }
if (!localRedeemBlocked) throw new Error('Demo wallet redemption was not blocked');

console.log('Free-play game and commerce safety checks passed.');

import React, { useState } from 'react';
import { GameConfig, CurrencyType, UserProfile, MinesState } from '../types';
import { WAGER_LEVELS } from '../constants';
import { minesMultiplier, MINES_TILES } from '../lib/advancedGames';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';

interface MinesGameProps {
    game: GameConfig;
    currency: CurrencyType;
    balance: number;
    user: UserProfile;
    onClose: () => void;
    onUpdateUser: (user: UserProfile) => void;
    isPaused: boolean;
}

const MINE_CHOICES = [3, 5, 10, 15, 20];

export const MinesGame: React.FC<MinesGameProps> = ({ game, currency, balance, user, onClose, onUpdateUser, isPaused }) => {
    const [wagerIndex, setWagerIndex] = useState(3);
    const [mines, setMines] = useState(5);
    const [round, setRound] = useState<MinesState | null>(null);
    const [busy, setBusy] = useState(false);
    const wager = WAGER_LEVELS[currency][wagerIndex];
    const gems = round?.revealed.length && round.status !== 'bust' ? round.revealed.length : 0;
    const nextMultiplier = minesMultiplier(mines, Math.min((round?.status === 'active' ? round.revealed.length : 0) + 1, MINES_TILES - mines));
    const active = round?.status === 'active';

    const start = async () => {
        setBusy(true);
        try {
            const next = await supabaseService.mines.start(user, wager, currency, mines);
            setRound(next.game);
            onUpdateUser(next.user);
        } catch (error: any) {
            toast.error(error.message || 'Could not start the round');
        } finally {
            setBusy(false);
        }
    };

    const reveal = async (index: number) => {
        if (!round || round.status !== 'active' || busy) return;
        setBusy(true);
        try {
            const next = await supabaseService.mines.reveal(round.id, index, user);
            setRound(next.game);
            onUpdateUser(next.user);
        } catch (error: any) {
            toast.error(error.message || 'Tile could not be opened');
        } finally {
            setBusy(false);
        }
    };

    const cashout = async () => {
        if (!round) return;
        setBusy(true);
        try {
            const next = await supabaseService.mines.cashout(round.id, user);
            setRound(next.game);
            onUpdateUser(next.user);
            if (next.game.payout > 0) toast.success(`Cashed ${next.game.payout.toLocaleString()} ${currency}`);
        } catch (error: any) {
            toast.error(error.message || 'Cash out failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-5xl bg-slate-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
                {isPaused && <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center"><h2 className="text-3xl font-black text-white">GAME PAUSED</h2></div>}
                <div className="bg-cyan-400 text-slate-950 text-[10px] sm:text-xs font-bold text-center py-1 uppercase tracking-widest">
                    {user.isGuest ? 'Guest mode · saved on this device' : 'Prizes come from the shared player pool'}
                </div>
                <div className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <button aria-label="Close game" onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-300">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h2 className="text-white font-black font-display tracking-wide">{game.title}</h2>
                            <p className="text-[11px] text-slate-400">Open gems. Leave before a mine. The pool pays what other play has funded.</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-slate-500">Balance</div>
                        <div className="text-white font-black tabular-nums">{currency === 'GC' ? Math.floor(balance).toLocaleString() : balance.toFixed(2)} {currency}</div>
                    </div>
                </div>

                <div className="grid md:grid-cols-[1fr_280px] gap-4 p-4 sm:p-6 overflow-y-auto">
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {Array.from({ length: MINES_TILES }, (_, index) => {
                            const opened = round?.revealed.includes(index);
                            const mined = !!round && round.status !== 'active' && round.mineSet.includes(index);
                            const hit = mined && opened;
                            return (
                                <button
                                    key={index}
                                    disabled={!active || busy || opened}
                                    onClick={() => reveal(index)}
                                    className={`aspect-square rounded-xl border text-2xl sm:text-3xl font-black transition-all ${
                                        hit ? 'bg-red-600 border-red-300 text-white scale-95' :
                                        mined ? 'bg-red-950/70 border-red-800 text-red-300' :
                                        opened ? 'bg-emerald-500 border-emerald-200 text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.45)]' :
                                        'bg-slate-900 border-slate-700 text-slate-600 hover:border-cyan-400 hover:text-cyan-200'
                                    }`}
                                >
                                    {hit || mined ? '✸' : opened ? '◆' : '·'}
                                </button>
                            );
                        })}
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Next gem</span>
                            <span className="text-cyan-300 font-black">{nextMultiplier.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">This round</span>
                            <span className="text-white font-black">{(round?.multiplier || 0).toFixed(2)}x</span>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Mines</div>
                            <div className="grid grid-cols-5 gap-1">
                                {MINE_CHOICES.map(count => (
                                    <button key={count} disabled={active} onClick={() => setMines(count)} className={`py-2 rounded-lg text-sm font-bold ${mines === count ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'} disabled:opacity-50`}>
                                        {count}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Wager</div>
                            <div className="flex items-center justify-between bg-slate-950 rounded-xl border border-slate-800 px-2 py-2">
                                <button disabled={active} onClick={() => setWagerIndex(value => Math.max(0, value - 1))} className="w-8 h-8 rounded-lg bg-slate-800 text-white disabled:opacity-40">−</button>
                                <span className="font-black text-white tabular-nums">{wager.toLocaleString()} {currency}</span>
                                <button disabled={active} onClick={() => setWagerIndex(value => Math.min(WAGER_LEVELS[currency].length - 1, value + 1))} className="w-8 h-8 rounded-lg bg-slate-800 text-white disabled:opacity-40">+</button>
                            </div>
                        </div>
                        {active ? (
                            <button onClick={cashout} disabled={busy || gems === 0} className="h-14 rounded-2xl bg-emerald-500 text-slate-950 font-black tracking-widest disabled:opacity-40">
                                {gems === 0 ? 'PICK A GEM' : `CASH OUT ${Math.min(round.wager * round.multiplier, round.payable ?? round.wager * round.multiplier).toLocaleString()}`}
                            </button>
                        ) : (
                            <button onClick={start} disabled={busy || wager > balance} className="h-14 rounded-2xl bg-cyan-400 text-slate-950 font-black tracking-widest disabled:opacity-40">
                                {round ? 'PLAY AGAIN' : 'START'}
                            </button>
                        )}
                        {round?.status === 'bust' && <p className="text-center text-red-300 font-bold">Mine. The stake stays in the pool.</p>}
                        {round?.status === 'cashed' && <p className="text-center text-emerald-300 font-bold">Paid {round.payout.toLocaleString()} {currency}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

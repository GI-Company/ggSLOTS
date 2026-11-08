import React, { useEffect, useState } from 'react';
import { GameConfig, CurrencyType, UserProfile, CrashState } from '../types';
import { WAGER_LEVELS } from '../constants';
import { crashMultiplierAt } from '../lib/advancedGames';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';

interface CrashGameProps {
    game: GameConfig;
    currency: CurrencyType;
    balance: number;
    user: UserProfile;
    onClose: () => void;
    onUpdateUser: (user: UserProfile) => void;
    isPaused: boolean;
}

export const CrashGame: React.FC<CrashGameProps> = ({ game, currency, balance, user, onClose, onUpdateUser, isPaused }) => {
    const [wagerIndex, setWagerIndex] = useState(3);
    const [round, setRound] = useState<CrashState | null>(null);
    const [live, setLive] = useState(1);
    const [history, setHistory] = useState<number[]>([]);
    const [busy, setBusy] = useState(false);
    const wager = WAGER_LEVELS[currency][wagerIndex];
    const flying = round?.status === 'active';

    useEffect(() => {
        if (!round || round.status !== 'active') return;
        let frame = 0;
        const draw = () => {
            setLive(crashMultiplierAt(Date.now() - round.startedAt));
            frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        const poll = window.setInterval(async () => {
            try {
                const next = await supabaseService.crash.peek(round.id, user);
                if (next.game.status !== 'active') {
                    setRound(next.game);
                    setLive(next.game.multiplier);
                    setHistory(list => [next.game.crashAt, ...list].slice(0, 8));
                    onUpdateUser(next.user);
                }
            } catch {
                /* The next tick retries. A closed round just stops the loop. */
            }
        }, 160);
        return () => {
            cancelAnimationFrame(frame);
            window.clearInterval(poll);
        };
    }, [round?.id, round?.status]);

    const start = async () => {
        setBusy(true);
        try {
            const next = await supabaseService.crash.start(user, wager, currency);
            setLive(1);
            setRound(next.game);
            onUpdateUser(next.user);
        } catch (error: any) {
            toast.error(error.message || 'Launch failed');
        } finally {
            setBusy(false);
        }
    };

    const cashout = async () => {
        if (!round) return;
        setBusy(true);
        try {
            const next = await supabaseService.crash.cashout(round.id, user);
            setRound(next.game);
            setLive(next.game.multiplier);
            if (next.game.status === 'bust') setHistory(list => [next.game.crashAt, ...list].slice(0, 8));
            onUpdateUser(next.user);
            if (next.game.payout > 0) toast.success(`Cashed ${next.game.payout.toLocaleString()} ${currency}`);
        } catch (error: any) {
            toast.error(error.message || 'Cash out failed');
        } finally {
            setBusy(false);
        }
    };

    const shown = flying ? live : (round?.multiplier || 1);
    const points = Array.from({ length: 28 }, (_, index) => {
        const step = (flying ? Date.now() - (round?.startedAt || Date.now()) : 4000) * (index / 27);
        const multiplier = crashMultiplierAt(Math.max(0, step));
        const cap = Math.max(2, shown);
        const x = 16 + (index / 27) * 520;
        const y = 250 - ((Math.min(multiplier, cap) - 1) / (cap - 1)) * 210;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-5xl bg-slate-950 rounded-3xl border border-fuchsia-500/40 shadow-2xl overflow-hidden">
                {isPaused && <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center"><h2 className="text-3xl font-black text-white">GAME PAUSED</h2></div>}
                <div className="bg-fuchsia-400 text-slate-950 text-[10px] sm:text-xs font-bold text-center py-1 uppercase tracking-widest">
                    {user.isGuest ? 'Guest mode · saved on this device' : 'Cash out before the rocket breaks'}
                </div>
                <div className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <button aria-label="Close game" onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-300">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h2 className="text-white font-black font-display tracking-wide">{game.title}</h2>
                            <p className="text-[11px] text-slate-400">The break point is hidden. A big cash-out needs the pool other players left behind.</p>
                        </div>
                    </div>
                    <div className="text-white font-black tabular-nums">{currency === 'GC' ? Math.floor(balance).toLocaleString() : balance.toFixed(2)} {currency}</div>
                </div>

                <div className="p-4 sm:p-6 grid lg:grid-cols-[1fr_260px] gap-4">
                    <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 to-black border border-slate-800 min-h-[280px] overflow-hidden">
                        <svg viewBox="0 0 560 280" className="w-full h-full">
                            <polyline fill="none" stroke={round?.status === 'bust' ? '#fb7185' : '#e879f9'} strokeWidth="4" points={points} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className={`text-6xl sm:text-7xl font-black font-display tabular-nums ${round?.status === 'bust' ? 'text-rose-400' : 'text-white'}`}>
                                {shown.toFixed(2)}x
                            </div>
                            <div className="text-slate-400 text-sm mt-2">
                                {round?.status === 'bust' ? `Broke at ${round.crashAt.toFixed(2)}x` : round?.status === 'cashed' ? `Paid ${round.payout.toLocaleString()} ${currency}` : flying ? 'Climbing' : 'Ready'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                            {history.map((point, index) => (
                                <span key={`${point}-${index}`} className={`text-xs font-bold px-2 py-1 rounded-full ${point < 2 ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-200'}`}>{point.toFixed(2)}x</span>
                            ))}
                        </div>
                        <div className="flex items-center justify-between bg-slate-900 rounded-xl border border-slate-800 px-2 py-2">
                            <button disabled={flying} onClick={() => setWagerIndex(value => Math.max(0, value - 1))} className="w-8 h-8 rounded-lg bg-slate-800 text-white disabled:opacity-40">−</button>
                            <span className="font-black text-white tabular-nums text-sm">{wager.toLocaleString()} {currency}</span>
                            <button disabled={flying} onClick={() => setWagerIndex(value => Math.min(WAGER_LEVELS[currency].length - 1, value + 1))} className="w-8 h-8 rounded-lg bg-slate-800 text-white disabled:opacity-40">+</button>
                        </div>
                        {flying ? (
                            <button onClick={cashout} disabled={busy || live < 1.01} className="h-16 rounded-2xl bg-fuchsia-400 text-slate-950 font-black tracking-widest disabled:opacity-40">
                                CASH OUT
                            </button>
                        ) : (
                            <button onClick={start} disabled={busy || wager > balance} className="h-16 rounded-2xl bg-white text-slate-950 font-black tracking-widest disabled:opacity-40">
                                {round ? 'LAUNCH AGAIN' : 'LAUNCH'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

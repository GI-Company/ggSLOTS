import React, { useMemo, useState } from 'react';
import { GameConfig, CurrencyType, UserProfile, RouletteBet, RouletteResult } from '../types';
import { WAGER_LEVELS } from '../constants';
import { rouletteColor, rouletteStake, WHEEL_ORDER } from '../lib/advancedGames';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';

interface RouletteGameProps {
    game: GameConfig;
    currency: CurrencyType;
    balance: number;
    user: UserProfile;
    onClose: () => void;
    onUpdateUser: (user: UserProfile) => void;
    isPaused: boolean;
}

const colorClass = (number: number) => {
    const color = rouletteColor(number);
    if (color === 'red') return 'bg-rose-600 text-white';
    if (color === 'black') return 'bg-slate-950 text-white';
    return 'bg-emerald-600 text-white';
};

function addBet(bets: RouletteBet[], next: RouletteBet): RouletteBet[] {
    const same = (bet: RouletteBet) => JSON.stringify({ ...bet, amount: 0 }) === JSON.stringify({ ...next, amount: 0 });
    const existing = bets.find(same);
    if (!existing) return [...bets, next];
    return bets.map(bet => same(bet) ? { ...bet, amount: bet.amount + next.amount } as RouletteBet : bet);
}

export const RouletteGame: React.FC<RouletteGameProps> = ({ game, currency, balance, user, onClose, onUpdateUser, isPaused }) => {
    const [wagerIndex, setWagerIndex] = useState(2);
    const [bets, setBets] = useState<RouletteBet[]>([]);
    const [result, setResult] = useState<RouletteResult | null>(null);
    const [spinning, setSpinning] = useState(false);
    const [angle, setAngle] = useState(0);
    const chip = WAGER_LEVELS[currency][wagerIndex];
    const stake = rouletteStake(bets);

    const segments = useMemo(() => WHEEL_ORDER.map((number, index) => {
        const color = number === 0 ? '#059669' : rouletteColor(number) === 'red' ? '#e11d48' : '#020617';
        const start = (index / WHEEL_ORDER.length) * 100;
        const end = ((index + 1) / WHEEL_ORDER.length) * 100;
        return `${color} ${start}% ${end}%`;
    }).join(', '), []);

    const place = (bet: RouletteBet) => {
        if (spinning) return;
        setResult(null);
        setBets(current => addBet(current, bet));
    };

    const spin = async () => {
        setSpinning(true);
        try {
            const next = await supabaseService.roulette.spin(user, currency, bets);
            const pocket = WHEEL_ORDER.indexOf(next.result.number);
            const turn = 360 * 6 - (pocket / WHEEL_ORDER.length) * 360;
            setAngle(value => value - (value % 360) + turn);
            setResult(next.result);
            onUpdateUser(next.user);
            window.setTimeout(() => setSpinning(false), 4200);
        } catch (error: any) {
            setSpinning(false);
            toast.error(error.message || 'The wheel did not spin');
        }
    };

    const outside = (label: string, bet: RouletteBet, wide = false) => (
        <button onClick={() => place(bet)} disabled={spinning} className={`${wide ? 'col-span-2' : ''} h-10 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-50`}>
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-6xl bg-slate-950 rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden max-h-[96vh] flex flex-col">
                {isPaused && <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center"><h2 className="text-3xl font-black text-white">GAME PAUSED</h2></div>}
                <div className="bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-bold text-center py-1 uppercase tracking-widest">
                    European wheel · 0–36 · shared player pool
                </div>
                <div className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <button aria-label="Close game" onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-300">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h2 className="text-white font-black font-display tracking-wide">{game.title}</h2>
                            <p className="text-[11px] text-slate-400">Straight pays 35:1. Outside bets pay 1:1. Dozens and columns pay 2:1.</p>
                        </div>
                    </div>
                    <div className="text-white font-black tabular-nums">{currency === 'GC' ? Math.floor(balance).toLocaleString() : balance.toFixed(2)} {currency}</div>
                </div>

                <div className="grid lg:grid-cols-[240px_1fr] gap-4 p-4 sm:p-6 overflow-y-auto">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-52 h-52">
                            <div className="absolute left-1/2 -top-1 z-10 -translate-x-1/2 text-amber-300 text-xl">▼</div>
                            <div
                                className="w-full h-full rounded-full border-8 border-amber-900/60 shadow-inner"
                                style={{ background: `conic-gradient(${segments})`, transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 4s cubic-bezier(0.12, 0.7, 0.05, 1)' : 'none' }}
                            />
                            <div className={`absolute inset-8 rounded-full flex items-center justify-center font-black text-3xl ${result ? colorClass(result.number) : 'bg-slate-900 text-slate-500'}`}>
                                {result ? result.number : '–'}
                            </div>
                        </div>
                        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <button onClick={() => setWagerIndex(value => Math.max(0, value - 1))} className="w-8 h-8 rounded-lg bg-slate-800 text-white">−</button>
                                <span className="text-white font-black text-sm tabular-nums">{chip.toLocaleString()} chip</span>
                                <button onClick={() => setWagerIndex(value => Math.min(WAGER_LEVELS[currency].length - 1, value + 1))} className="w-8 h-8 rounded-lg bg-slate-800 text-white">+</button>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400"><span>On the table</span><span className="text-white font-bold">{stake.toLocaleString()}</span></div>
                            <div className="flex justify-between text-xs text-slate-400"><span>{result ? 'Paid' : 'Bets'}</span><span className="text-amber-300 font-bold">{result ? result.payout.toLocaleString() : bets.length}</span></div>
                            <button onClick={() => { setBets([]); setResult(null); }} className="w-full text-xs text-slate-400 underline">Clear table</button>
                        </div>
                        <button onClick={spin} disabled={spinning || stake <= 0 || stake > balance} className="w-full h-14 rounded-2xl bg-amber-400 text-slate-950 font-black tracking-widest disabled:opacity-40">
                            {spinning ? 'SPINNING' : 'SPIN'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex gap-1">
                            <button onClick={() => place({ kind: 'straight', number: 0, amount: chip })} className="w-12 rounded-lg bg-emerald-600 text-white font-black">0</button>
                            <div className="grid grid-cols-3 gap-1 flex-1">
                                {Array.from({ length: 36 }, (_, index) => index + 1).map(number => (
                                    <button key={number} onClick={() => place({ kind: 'straight', number, amount: chip })} className={`h-8 rounded-md text-xs font-bold ${colorClass(number)} hover:brightness-125`}>
                                        {number}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {outside('1st 12', { kind: 'dozen', dozen: 1, amount: chip })}
                            {outside('2nd 12', { kind: 'dozen', dozen: 2, amount: chip })}
                            {outside('3rd 12', { kind: 'dozen', dozen: 3, amount: chip })}
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                            {outside('1–18', { kind: 'half', half: 'low', amount: chip })}
                            {outside('EVEN', { kind: 'parity', parity: 'even', amount: chip })}
                            {outside('RED', { kind: 'color', color: 'red', amount: chip })}
                            {outside('BLACK', { kind: 'color', color: 'black', amount: chip })}
                            {outside('ODD', { kind: 'parity', parity: 'odd', amount: chip })}
                            {outside('19–36', { kind: 'half', half: 'high', amount: chip })}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {outside('Column 1 · 2:1', { kind: 'column', column: 1, amount: chip })}
                            {outside('Column 2 · 2:1', { kind: 'column', column: 2, amount: chip })}
                            {outside('Column 3 · 2:1', { kind: 'column', column: 3, amount: chip })}
                        </div>
                        {result && (
                            <p className={`text-center font-bold ${result.payout > result.wager ? 'text-emerald-300' : 'text-slate-400'}`}>
                                {result.color.toUpperCase()} {result.number} · paid {result.payout.toLocaleString()} {currency}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

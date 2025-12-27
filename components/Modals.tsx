
import React, { useState, useEffect } from 'react';
import { MIN_REDEMPTION, REDEMPTION_UNLOCK_PRICE } from '../constants';
import { UserProfile, GameHistoryEntry } from '../types';
import { supabaseService } from '../services/supabaseService';

// --- Shared Modal Wrapper ---
export const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50">
                <h3 className="text-xl font-bold text-white font-display">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[80vh]">
                {children}
            </div>
        </div>
    </div>
);

// --- History Modal ---
export const HistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [history, setHistory] = useState<GameHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabaseService.game.getHistory().then(data => {
            setHistory(data);
            setLoading(false);
        });
    }, []);

    return (
        <Modal onClose={onClose} title="Transaction Ledger">
            {loading ? (
                <div className="text-center text-slate-400 py-8">Loading Records...</div>
            ) : history.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No transactions found.</div>
            ) : (
                <div className="space-y-3">
                    {history.map(entry => (
                        <div key={entry.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                    {entry.id.substring(0, 8)}... {/* Show part of Idempotency Key */}
                                </span>
                                <span className="font-bold text-white text-sm">{entry.activityId}</span>
                                <span className="text-xs text-slate-400">
                                    {new Date(entry.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className={`font-bold ${entry.credit > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                    {entry.credit > 0 ? '+' : ''}{entry.credit.toLocaleString()} {entry.currency}
                                </div>
                                <div className="text-xs text-red-400/70">
                                    -{entry.debit.toLocaleString()} {entry.currency}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};

// --- Get Coins Store (COMING SOON) ---
export const GetCoinsModal: React.FC<{ onClose: () => void; onPurchase: (pkg: any) => void }> = ({ onClose, onPurchase }) => (
    <Modal onClose={onClose} title="Store Coming Soon">
        <div className="text-center py-8 space-y-4">
            <div className="text-5xl animate-pulse">🏪</div>
            <h4 className="text-2xl font-bold text-white">Under Construction</h4>
            <p className="text-slate-300">
                The Coin Store is currently being prepared for launch. 
                <br/>Soon you will be able to purchase Gold Coin packages and unlock exclusive Sweeps Cash rewards!
            </p>
            <div className="inline-block bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-yellow-500">
                Play with your daily free Gold Coins in the meantime!
            </div>
        </div>
    </Modal>
);

// --- Redeem Modal ---
export const RedeemModal: React.FC<{ onClose: () => void; user: UserProfile; onRedeem: (amount: number) => void }> = ({ onClose, user, onRedeem }) => {
    const [amount, setAmount] = useState<string>('');
    const numAmount = parseFloat(amount);
    
    return (
        <Modal onClose={onClose} title="Redeem Prizes">
            {!user.hasUnlockedRedemption ? (
                <div className="text-center space-y-4">
                    <div className="text-4xl">🔒</div>
                    <p className="text-slate-300">Redemption is currently locked.</p>
                    <p className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                        Purchase any coin package of ${REDEMPTION_UNLOCK_PRICE} or more to unlock real prize redemptions!
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-slate-800 p-4 rounded-xl text-center">
                        <p className="text-slate-400 text-sm uppercase">Redeemable Balance</p>
                        <p className="text-3xl font-bold text-green-400">{user.redeemableSc.toFixed(2)} SC</p>
                    </div>

                    {user.redeemableSc < MIN_REDEMPTION ? (
                         <p className="text-center text-red-400 text-sm">
                            Minimum redemption is {MIN_REDEMPTION} SC. Keep playing!
                         </p>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-1">Amount to Redeem</label>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    max={user.redeemableSc}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <button 
                                onClick={() => onRedeem(numAmount)}
                                disabled={!numAmount || numAmount < MIN_REDEMPTION || numAmount > user.redeemableSc}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                Redeem Cash
                            </button>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

// --- Auth Modal (Login/Register) ---
export const AuthModal: React.FC<{ onClose: () => void; onAuth: (email: string) => void; type: 'login' | 'register' }> = ({ onClose, onAuth, type }) => {
    const [email, setEmail] = useState('');
    return (
        <Modal onClose={onClose} title={type === 'login' ? 'Welcome Back' : 'Create Account'}>
            <form onSubmit={(e) => { e.preventDefault(); onAuth(email); }} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">Email Address</label>
                    <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                        placeholder="you@cosmic.com"
                    />
                </div>
                {type === 'register' && (
                    <div className="text-xs text-slate-500">
                        By creating an account you agree to our Terms of Service. No real money gambling. 18+ only.
                    </div>
                )}
                <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all">
                    {type === 'login' ? 'Login' : 'Join Now'}
                </button>
            </form>
        </Modal>
    );
};

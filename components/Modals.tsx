
import React, { useState, useEffect } from 'react';
import { MIN_REDEMPTION, REDEMPTION_UNLOCK_PRICE } from '../constants';
import { UserProfile, GameHistoryEntry } from '../types';
import { supabaseService } from '../services/supabaseService';

// --- Shared Modal Wrapper ---
export const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50 flex-shrink-0">
                <h3 className="text-xl font-bold text-white font-display">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
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
        // Initial Fetch
        supabaseService.game.getHistory().then(data => {
            setHistory(data);
            setLoading(false);
        });

        // Realtime Subscription
        const unsubscribe = supabaseService.game.subscribeToHistory((newEntry) => {
            setHistory(prev => [newEntry, ...prev]);
        });

        return () => unsubscribe();
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

// --- Auth Modal (Login/Register/Reset) ---
interface AuthModalProps {
    onClose: () => void; 
    onAuth: (email: string, profileData?: any) => void; 
    type: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuth, type: initialType }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialType);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zip, setZip] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Helper: Calculate age
    const calculateAge = (birthDateString: string) => {
        const today = new Date();
        const birthDate = new Date(birthDateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        onAuth(email); // Login uses email only in mock, pass in current app flow
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (!acceptedTerms) {
            setError("You must accept the Terms and Agreements.");
            return;
        }
        const age = calculateAge(dob);
        if (isNaN(age) || age < 18) {
            setError("You must be at least 18 years old to register.");
            return;
        }

        const profileData = {
            firstName,
            lastName,
            dob,
            city,
            state,
            zip
        };

        onAuth(email, profileData);
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);
        
        const { success, message } = await supabaseService.auth.resetPassword(email);
        setLoading(false);
        if (success) {
            setSuccessMsg(message);
        } else {
            setError(message);
        }
    };

    return (
        <Modal onClose={onClose} title={
            mode === 'login' ? 'Welcome Back' : 
            mode === 'register' ? 'Create Account' : 
            'Reset Password'
        }>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            {successMsg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg mb-4 text-sm">{successMsg}</div>}

            {/* --- LOGIN FORM --- */}
            {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Email Address</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Password</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                        <div className="text-right mt-1">
                            <button type="button" onClick={() => setMode('forgot')} className="text-xs text-indigo-400 hover:text-white">Forgot Password?</button>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all">Login</button>
                    <div className="text-center text-sm text-slate-400 mt-2">
                        Don't have an account? <button type="button" onClick={() => setMode('register')} className="text-indigo-400 hover:text-white font-bold">Register</button>
                    </div>
                </form>
            )}

            {/* --- REGISTER FORM --- */}
            {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">First Name</label>
                            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Last Name</label>
                            <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Date of Birth</label>
                        <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                    </div>

                    <div className="grid grid-cols-6 gap-2">
                        <div className="col-span-3">
                            <label className="block text-xs font-bold text-slate-400 mb-1">City</label>
                            <input type="text" required value={city} onChange={(e) => setCity(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                        </div>
                         <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">State</label>
                            <input type="text" required maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 mb-1">Zip</label>
                            <input type="text" required maxLength={10} value={zip} onChange={(e) => setZip(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Email</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Confirm PW</label>
                            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-indigo-500 outline-none" />
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
                        <p className="mb-2"><strong>Disclaimer:</strong> This is a social casino for entertainment purposes only. No real money gambling is involved. Game outcomes are simulated.</p>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" className="mt-1" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                            <span>I certify I am 18+ and accept the <a href="#" className="text-indigo-400 underline">Terms & Agreements</a> and Privacy Policy.</span>
                        </label>
                    </div>

                    <button type="submit" className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg text-white font-bold py-3 rounded-lg transition-all">
                        Complete Registration
                    </button>
                    
                    <div className="text-center text-sm text-slate-400 pt-2">
                        Already registered? <button type="button" onClick={() => setMode('login')} className="text-indigo-400 hover:text-white font-bold">Login</button>
                    </div>
                </form>
            )}

            {/* --- FORGOT PASSWORD FORM --- */}
            {mode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                     <p className="text-slate-300 text-sm">Enter your email address and we'll send you a link to reset your password.</p>
                     <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Email Address</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all">
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <div className="text-center text-sm">
                        <button type="button" onClick={() => setMode('login')} className="text-indigo-400 hover:text-white font-bold">Back to Login</button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

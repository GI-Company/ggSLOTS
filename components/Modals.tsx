
import React, { useState, useEffect, useRef } from 'react';
import { MIN_REDEMPTION, REDEMPTION_UNLOCK_PRICE, COIN_PACKAGES } from '../constants';
import { UserProfile, GameHistoryEntry, KycStatus, CoinPackage } from '../types';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';

// --- Shared Modal Wrapper ---
export const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700/50 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/30 flex-shrink-0">
                <h3 className="text-xl font-bold text-white font-display tracking-wide">{title}</h3>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-full p-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

// --- KYC Modal ---
export const KycModal: React.FC<{ onClose: () => void; user: UserProfile; onStatusUpdate: (status: KycStatus) => void }> = ({ onClose, user, onStatusUpdate }) => {
    const [step, setStep] = useState(1);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = () => {
        setUploading(true);
        // Simulate upload delay
        setTimeout(() => {
            setUploading(false);
            if (step < 3) setStep(step + 1);
            else {
                onStatusUpdate('pending');
                onClose();
            }
        }, 1500);
    };

    return (
        <Modal onClose={onClose} title="Identity Verification">
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <div className={`flex flex-col items-center ${step >= 1 ? 'text-indigo-400' : 'text-slate-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 ${step >= 1 ? 'bg-indigo-500/20 border-2 border-indigo-500' : 'bg-slate-800 border-2 border-slate-600'}`}>1</div>
                        <span className="text-[10px] uppercase font-bold">Front ID</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                    <div className={`flex flex-col items-center ${step >= 2 ? 'text-indigo-400' : 'text-slate-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 ${step >= 2 ? 'bg-indigo-500/20 border-2 border-indigo-500' : 'bg-slate-800 border-2 border-slate-600'}`}>2</div>
                        <span className="text-[10px] uppercase font-bold">Back ID</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${step >= 3 ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                    <div className={`flex flex-col items-center ${step >= 3 ? 'text-indigo-400' : 'text-slate-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 ${step >= 3 ? 'bg-indigo-500/20 border-2 border-indigo-500' : 'bg-slate-800 border-2 border-slate-600'}`}>3</div>
                        <span className="text-[10px] uppercase font-bold">Selfie</span>
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-indigo-500/50 transition-colors">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <h4 className="text-white font-bold mb-1">
                        {step === 1 ? "Upload Government ID (Front)" : step === 2 ? "Upload Government ID (Back)" : "Take a Selfie"}
                    </h4>
                    <p className="text-slate-400 text-xs mb-6">Supports JPG, PNG, PDF (Max 5MB)</p>
                    
                    <button 
                        onClick={handleUpload} 
                        disabled={uploading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center justify-center gap-2 w-full sm:w-auto mx-auto"
                    >
                        {uploading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Uploading...
                            </>
                        ) : (
                            "Select File"
                        )}
                    </button>
                </div>

                <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 text-[10px] text-slate-500">
                    <p><strong>Compliance Notice:</strong> Your data is encrypted and used solely for identity verification required by Sweepstakes regulations. We do not sell your data.</p>
                </div>
            </div>
        </Modal>
    );
};

// --- Game Rules Modal ---
export const GameRulesModal: React.FC<{ onClose: () => void; gameTitle: string }> = ({ onClose, gameTitle }) => (
    <Modal onClose={onClose} title={`${gameTitle} - Rules`}>
        <div className="space-y-6 text-slate-300 text-sm">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <h4 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    General Info
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li>RTP (Return to Player): <strong>~96.00%</strong></li>
                    <li>Volatility: <strong>Variable</strong></li>
                    <li>Malfunction voids all pays and plays.</li>
                </ul>
            </div>

            <div>
                 <h4 className="text-white font-bold text-lg mb-2">Sweeps Cash (SC) Mode</h4>
                 <div className="bg-gradient-to-r from-green-900/20 to-slate-800 p-4 rounded-xl border border-green-900/50">
                    <p className="mb-2 text-green-100"><strong>1.00 SC = $1.00 USD</strong> for redemption.</p>
                    <p className="text-xs text-green-200/70">SC must be played through 1x before redemption.</p>
                 </div>
            </div>
        </div>
    </Modal>
);

// --- Sweepstakes Rules Modal ---
export const SweepstakesRulesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal onClose={onClose} title="Official Rules">
        <div className="space-y-4 text-slate-300 text-xs sm:text-sm">
            <div className="font-bold text-white uppercase text-center bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm">
                NO PURCHASE NECESSARY TO ENTER OR WIN.
            </div>
            
            <h5 className="text-white font-bold text-base">1. Eligibility</h5>
            <p>Open only to legal residents of the United States (excluding Washington and Idaho) who are at least eighteen (18) years old.</p>

            <h5 className="text-white font-bold text-base">2. Obtaining Sweeps Cash</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-slate-800 p-2 rounded border border-slate-700"><strong>Free Bonus:</strong> Sign-up & Daily Login</div>
                <div className="bg-slate-800 p-2 rounded border border-slate-700"><strong>Mail-In (AMO):</strong> Send 3x5 card</div>
                <div className="bg-slate-800 p-2 rounded border border-slate-700 col-span-1 sm:col-span-2"><strong>Promotion:</strong> Free with GC Purchase</div>
            </div>

            <p className="text-[10px] text-slate-500 mt-6 text-center border-t border-slate-800 pt-4">
                Void where prohibited by law. Full Terms & Conditions available on website.
            </p>
        </div>
    </Modal>
);

// --- History Modal ---
export const HistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [history, setHistory] = useState<GameHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabaseService.game.getHistory().then(data => { setHistory(data); setLoading(false); });
        const unsubscribe = supabaseService.game.subscribeToHistory((newEntry) => setHistory(prev => [newEntry, ...prev]));
        return () => unsubscribe();
    }, []);

    return (
        <Modal onClose={onClose} title="Activity Ledger">
            {loading ? <div className="text-center text-slate-400 py-12">Loading...</div> : history.length === 0 ? (
                <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                    <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    No transactions yet.
                </div>
            ) : (
                <div className="space-y-2">
                    {history.map(entry => (
                        <div key={entry.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center hover:bg-slate-800 transition-colors">
                            <div className="flex flex-col">
                                <span className="font-bold text-white text-sm capitalize">{entry.activityId.replace('-', ' ')}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-right">
                                <div className={`font-bold font-mono ${entry.credit > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                                    {entry.credit > 0 ? '+' : ''}{entry.credit.toLocaleString()} {entry.currency}
                                </div>
                                {entry.debit > 0 && <div className="text-[10px] text-slate-500">Bet: {entry.debit}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};

// --- Get Coins Store ---
export const GetCoinsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [selectedPkg, setSelectedPkg] = useState<CoinPackage | null>(null);
    const [step, setStep] = useState<'select' | 'crypto_widget'>('select');
    
    const handleSelectPkg = (pkg: CoinPackage) => { 
        setSelectedPkg(pkg); 
        setStep('crypto_widget'); 
    };
    
    return (
        <Modal onClose={onClose} title="Coin Store">
            {step === 'select' && (
                 <div className="grid gap-4">
                    {COIN_PACKAGES.map((pkg, i) => (
                        <div key={i} 
                             onClick={() => handleSelectPkg(pkg)}
                             className={`
                                group relative overflow-hidden bg-slate-800/50 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                                flex items-center p-4
                                ${pkg.isBestValue ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'border-slate-700 hover:border-slate-500'}
                             `}
                        >
                             {pkg.isBestValue && (
                                 <div className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider z-10">
                                     Best Value
                                 </div>
                             )}
                             
                             <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 mr-4 shadow-inner">
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg ${pkg.isBestValue ? 'animate-pulse' : ''}`}></div>
                             </div>

                             <div className="flex-1">
                                 <div className="text-xl font-black text-white font-display tracking-tight group-hover:text-yellow-400 transition-colors">
                                     {pkg.gcAmount.toLocaleString()} <span className="text-yellow-500 text-sm">GC</span>
                                 </div>
                                 {pkg.scAmount > 0 && (
                                     <div className="text-sm font-bold text-green-400 flex items-center gap-1">
                                         + {pkg.scAmount.toFixed(2)} SC <span className="bg-green-500/20 px-1.5 py-0.5 rounded text-[10px] text-green-300 uppercase">Free</span>
                                     </div>
                                 )}
                             </div>
                             
                             <button className="bg-slate-700 group-hover:bg-indigo-600 text-white font-bold py-2 px-5 rounded-xl transition-colors min-w-[80px]">
                                 ${pkg.price}
                             </button>
                        </div>
                    ))}
                 </div>
            )}

            {step === 'crypto_widget' && selectedPkg && (
                <div className="flex flex-col items-center animate-in slide-in-from-right duration-300 h-full">
                    {/* Header Summary for Checkout */}
                    <div className="bg-slate-800/50 p-4 rounded-xl text-center border border-slate-700 w-full mb-4">
                        <div className="text-slate-400 text-xs uppercase font-bold mb-1">Package</div>
                        <div className="inline-block bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700 text-sm">
                            <span className="text-yellow-500 font-bold">{selectedPkg.gcAmount.toLocaleString()} GC</span>
                            <span className="mx-2 text-slate-600">|</span>
                            <span className="text-green-500 font-bold">{selectedPkg.scAmount} SC</span>
                        </div>
                    </div>

                    {/* Fake Browser Bar for Widget */}
                    <div className="w-full bg-slate-800 rounded-t-xl p-2 flex items-center gap-2 border border-slate-700 border-b-0">
                        <div className="flex gap-1.5 ml-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex-1 bg-slate-900 rounded px-3 py-1 text-[10px] text-slate-500 text-center font-mono flex items-center justify-center gap-1">
                            <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            nowpayments.io
                        </div>
                    </div>
                    
                    <div className="w-full flex-1 bg-slate-950 border border-slate-800 relative shadow-inner overflow-hidden" style={{ minHeight: '400px' }}>
                         <iframe 
                            src={`https://nowpayments.io/embeds/payment-widget?iid=${selectedPkg.widgetId}`}
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            className="absolute inset-0"
                        >
                            Loading Payment Gateway...
                        </iframe>
                    </div>

                    <div className="mt-4 w-full">
                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg flex gap-3 items-start mb-4">
                            <svg className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-xs text-indigo-200/80 leading-relaxed">
                                Please complete your secure payment in the widget above. 
                                <br/><br/>
                                <strong>Note:</strong> Your account balance will update automatically once the transaction is confirmed on the blockchain (usually 2-5 minutes).
                            </p>
                        </div>

                        <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors border border-slate-700">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

// --- Redeem Modal ---
export const RedeemModal: React.FC<{ onClose: () => void; user: UserProfile; onRedeem: (amount: number) => void; onOpenKyc: () => void }> = ({ onClose, user, onRedeem, onOpenKyc }) => {
    const [amount, setAmount] = useState<string>('');
    const numAmount = parseFloat(amount);
    
    if (user.kycStatus !== 'verified') {
        return (
            <Modal onClose={onClose} title="Redeem Prizes">
                <div className="text-center py-8">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                            <span className="text-xs font-bold text-white">!</span>
                        </div>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Identity Verification Required</h4>
                    <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                        To redeem prizes, we need to verify your identity. This is a one-time process required by law.
                    </p>
                    
                    {user.kycStatus === 'pending' ? (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg text-yellow-400 text-sm">
                            Your documents are currently under review. This usually takes 24-48 hours.
                        </div>
                    ) : (
                        <button 
                            onClick={() => { onClose(); onOpenKyc(); }} 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg"
                        >
                            Verify Identity
                        </button>
                    )}
                </div>
            </Modal>
        );
    }

    if (!user.hasUnlockedRedemption) {
        return (
            <Modal onClose={onClose} title="Redeem Prizes">
                <div className="text-center py-8">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Redemption Locked</h4>
                    <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                        To enable prize redemptions, please make a one-time purchase of any Coin Package worth <strong>${REDEMPTION_UNLOCK_PRICE}</strong> or more.
                    </p>
                    <button onClick={onClose} className="text-indigo-400 hover:text-white text-sm font-bold">Go to Store</button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose} title="Redeem Prizes">
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-900/30 to-slate-800 p-6 rounded-2xl text-center border border-green-500/20">
                    <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-1">Redeemable Balance</p>
                    <p className="text-4xl font-black text-white">{user.redeemableSc.toFixed(2)} <span className="text-lg text-green-500">SC</span></p>
                </div>

                {user.redeemableSc < MIN_REDEMPTION ? (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <div>
                            <h5 className="text-red-400 font-bold text-sm">Minimum Not Met</h5>
                            <p className="text-red-300/70 text-xs mt-1">You need at least {MIN_REDEMPTION} SC to request a prize redemption. Keep playing!</p>
                        </div>
                        </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="redeem-amount" className="block text-xs font-bold text-slate-400 uppercase mb-2">Amount to Redeem</label>
                            <div className="relative">
                                <input 
                                    id="redeem-amount"
                                    name="redeemAmount"
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    max={user.redeemableSc}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-bold text-lg focus:border-green-500 outline-none pl-12"
                                    placeholder="0.00"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</div>
                                <button 
                                    onClick={() => setAmount(user.redeemableSc.toString())}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 font-bold"
                                >
                                    MAX
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={() => onRedeem(numAmount)}
                            disabled={!numAmount || numAmount < MIN_REDEMPTION || numAmount > user.redeemableSc}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-4 rounded-xl transition-all shadow-lg"
                        >
                            REQUEST CASH PRIZE
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

// --- Auth Modal (Login/Register/Reset) ---
interface AuthModalProps {
    onClose: () => void; 
    onAuth: (email: string, password?: string, profileData?: any) => void; 
    type: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuth, type: initialType }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialType);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');
    const [address1, setAddress1] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zip, setZip] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const calculateAge = (birthDateString: string) => {
        const today = new Date();
        const birthDate = new Date(birthDateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const handleLogin = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if(!email.trim() || !password.trim()) { setError("All fields required."); return; }
        onAuth(email.trim(), password.trim()); 
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const cleanEmail = email.trim();
        const cleanPass = password.trim();
        const cleanConfirm = confirmPassword.trim();

        if (cleanPass !== cleanConfirm) { setError("Passwords do not match."); return; }
        if (cleanPass.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (!/\d/.test(cleanPass)) { setError("Password must contain at least one number."); return; }
        
        if (!acceptedTerms) { setError("You must accept the Terms and Agreements."); return; }
        const age = calculateAge(dob);
        if (isNaN(age) || age < 18) { setError("You must be at least 18 years old to register."); return; }
        
        // Strict Field Validation for KYC Prep
        if (!firstName.trim() || !lastName.trim() || !address1.trim() || !city.trim() || !state.trim() || !zip.trim()) { 
            setError("Full legal name and address are required for Sweepstakes verification."); 
            return; 
        }

        const profileData = { firstName: firstName.trim(), lastName: lastName.trim(), dob, addressLine1: address1.trim(), city: city.trim(), state: state.trim().toUpperCase(), zip: zip.trim(), country: 'US', kycStatus: 'unverified', isAddressLocked: true };
        onAuth(cleanEmail, cleanPass, profileData);
    };

    return (
        <Modal onClose={onClose} title={mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : 'Reset Password'}>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

            {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="login-email" className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                        <input id="login-email" name="email" autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label htmlFor="login-password" className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                        <input id="login-password" name="password" autoComplete="current-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" />
                        <div className="text-right mt-1"><button type="button" onClick={() => setMode('forgot')} className="text-xs text-indigo-400 hover:text-white font-bold">Forgot Password?</button></div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/40 transition-all">LOG IN</button>
                    <div className="text-center text-sm text-slate-400 mt-2">New here? <button type="button" onClick={() => setMode('register')} className="text-indigo-400 hover:text-white font-bold ml-1">Create Account</button></div>
                </form>
            )}

            {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                    <div className="p-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 mb-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-lg">🎁</div>
                        <div>
                            <strong className="text-white block">Welcome Offer</strong>
                            Register now to receive <span className="text-green-400 font-bold">20.00 SC</span> instantly!
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div><label htmlFor="reg-firstname" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label><input id="reg-firstname" name="firstName" autoComplete="given-name" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                        <div><label htmlFor="reg-lastname" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label><input id="reg-lastname" name="lastName" autoComplete="family-name" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                    </div>
                    <div><label htmlFor="reg-dob" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Birth</label><input id="reg-dob" name="dob" autoComplete="bday" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                    
                    <div><label htmlFor="reg-address" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address</label><input id="reg-address" name="addressLine1" autoComplete="address-line1" type="text" required value={address1} onChange={(e) => setAddress1(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                    <div className="grid grid-cols-6 gap-2">
                        <div className="col-span-3"><label htmlFor="reg-city" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">City</label><input id="reg-city" name="city" autoComplete="address-level2" type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                        <div className="col-span-1"><label htmlFor="reg-state" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">State</label><input id="reg-state" name="state" autoComplete="address-level1" type="text" required maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                        <div className="col-span-2"><label htmlFor="reg-zip" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zip</label><input id="reg-zip" name="zip" autoComplete="postal-code" type="text" required maxLength={10} value={zip} onChange={(e) => setZip(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                    </div>

                    <div><label htmlFor="reg-email" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label><input id="reg-email" name="email" autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label htmlFor="reg-password" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Password</label><input id="reg-password" name="password" autoComplete="new-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                        <div><label htmlFor="reg-confirm" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Confirm</label><input id="reg-confirm" name="confirmPassword" autoComplete="new-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                    </div>

                    <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input id="reg-terms" name="terms" type="checkbox" className="mt-0.5" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                            <span>I certify I am 18+, a resident of a valid state, and accept the Terms & Sweepstakes Rules. Address is permanent.</span>
                        </label>
                    </div>
                    <button type="submit" className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/20 text-white font-bold py-3.5 rounded-xl transition-all">COMPLETE REGISTRATION</button>
                    <div className="text-center text-sm text-slate-400 pt-1">Already registered? <button type="button" onClick={() => setMode('login')} className="text-indigo-400 hover:text-white font-bold ml-1">Log In</button></div>
                </form>
            )}

            {mode === 'forgot' && (
                 <div className="p-4 text-center">
                    <p className="text-slate-300 mb-4">Reset functionality is available via Supabase.</p>
                    <button type="button" onClick={() => setMode('login')} className="text-indigo-400 font-bold">Back to Login</button>
                 </div>
            )}
        </Modal>
    );
};

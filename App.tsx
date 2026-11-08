
import React, { useState, useEffect, Suspense } from 'react';
import { UserProfile, CurrencyType, ViewType, GameConfig, WinResult } from './types';
import { supabaseService, prepareCasinoBackend } from './services/supabaseService';
import { Layout } from './components/Layout';
import { Lobby } from './components/Lobby';
import { AuthModal, GetCoinsModal, HistoryModal, SweepstakesRulesModal, KycModal } from './components/Modals';
import { TermsModal, PrivacyModal, ResponsibleGamingModal } from './components/Legal';
import { ErrorBoundary } from './components/ErrorBoundary';
import toast, { Toaster } from 'react-hot-toast';

// --- LAZY LOADED GAMES (Performance Optimization) ---
// Using module renaming for named exports
const SlotGame = React.lazy(() => import('./components/SlotGame').then(m => ({ default: m.SlotGame })));
const PlinkoGame = React.lazy(() => import('./components/PlinkoGame').then(m => ({ default: m.PlinkoGame })));
const BlackjackGame = React.lazy(() => import('./components/BlackjackGame').then(m => ({ default: m.BlackjackGame })));
const ScratchGame = React.lazy(() => import('./components/ScratchGame').then(m => ({ default: m.ScratchGame })));
const PokerGame = React.lazy(() => import('./components/PokerGame').then(m => ({ default: m.PokerGame })));
const BingoGame = React.lazy(() => import('./components/BingoGame').then(m => ({ default: m.BingoGame })));
const MinesGame = React.lazy(() => import('./components/MinesGame').then(m => ({ default: m.MinesGame })));
const CrashGame = React.lazy(() => import('./components/CrashGame').then(m => ({ default: m.CrashGame })));
const RouletteGame = React.lazy(() => import('./components/RouletteGame').then(m => ({ default: m.RouletteGame })));

const GameLoader = () => (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-indigo-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Game Asset...</div>
        </div>
    </div>
);

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.GC);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [activeGame, setActiveGame] = useState<GameConfig | null>(null);
  const [authModalType, setAuthModalType] = useState<'login' | 'register' | null>(null);
  const [showKyc, setShowKyc] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Compliance & Legal
  const sweepsLocked = true; // Free-play safety lock: no SC, purchasing, or redemption.
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'responsible' | null>(null);

  // App-level control of sidebar state to handle game pausing/collapsing
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // New: Visual Balance Override for syncing Header with Game Optimistic UI
  const [visualBalanceOverride, setVisualBalanceOverride] = useState<number | null>(null);

  // Initialize Session & Geo-Check
  useEffect(() => {
    let cancel = false;
    (async () => {
        await prepareCasinoBackend();
        const sessionUser = await supabaseService.auth.getSession();
        if (cancel) return;
        if (sessionUser) setUser(sessionUser);

        const params = new URLSearchParams(window.location.search);
        const checkout = params.get('checkout');
        const sessionId = params.get('session_id');
        if (checkout === 'cancel') {
            toast('Checkout canceled');
            window.history.replaceState({}, '', window.location.pathname);
        } else if (checkout === 'success' && sessionId) {
            toast.error('Payments are paused. If you were charged, contact GGSlots support with your receipt.');
            window.history.replaceState({}, '', window.location.pathname);
        }
    })();

    return () => { cancel = true; };
  }, []);

  useEffect(() => {
      if (sweepsLocked && currency === CurrencyType.SC) {
          setCurrency(CurrencyType.GC);
          toast.error('Sweeps Cash is closed in your region. Gold Coin play stays open.');
      }
  }, [sweepsLocked, currency]);

  // Realtime Subscription for Profile Updates
  useEffect(() => {
    if (user && !user.isGuest) {
        const unsubscribe = supabaseService.auth.subscribeToUserChanges(user.id, (updatedProfile: UserProfile) => {
            setUser((prev: UserProfile | null) => prev ? { ...prev, ...updatedProfile } : updatedProfile);
        });
        return () => unsubscribe();
    }
  }, [user?.id, user?.isGuest]);

  useEffect(() => {
      if(notification) {
          toast.success(notification, { duration: 5000, icon: '🎁' });
          setNotification(null);
      }
  }, [notification]);

  const handleAuth = async (email: string, password?: string, profileData?: any) => {
    const { data, message, error } = await supabaseService.auth.signIn(email, password, profileData);
    if (error) { toast.error(error); return; }
    if(data) setUser(data);
    if(message) toast.success(message);
    setAuthModalType(null);
  };

  const ensureGuestUser = async (): Promise<UserProfile> => {
      if (user) return user;
      const { user: guest, message } = await supabaseService.auth.signInAsGuest();
      setUser(guest);
      setCurrency(CurrencyType.GC);
      if (message) toast.success(message);
      return guest;
  };

  const handleGuestPlay = async () => { await ensureGuestUser(); };

  const handleLogout = async () => {
    await supabaseService.auth.signOut();
    setUser(null);
    setCurrentView('main');
    toast.success("Logged out successfully");
  };


  const handleKycUpdate = async (status: 'pending') => {
      if (!user) return;
      await supabaseService.auth.submitKyc(user.id);
      setUser(prev => prev ? { ...prev, kycStatus: status } : null);
      toast.success("KYC Documents Submitted.");
  };

  const handleGameSpin = async (wager: number, isFreeSpin: boolean = false, plinkoConfig?: any): Promise<WinResult> => {
    if (!user) throw new Error("No user");
    const gameId = activeGame ? activeGame.id : 'unknown';
    const { user: updatedUser, result } = await supabaseService.game.spin(user, wager, currency, gameId, isFreeSpin, plinkoConfig);
    setUser(updatedUser);
    return result;
  };

  const closeGame = () => {
      setActiveGame(null);
      setVisualBalanceOverride(null); // Reset override on close
  };

  const renderContent = () => {
    if (currentView === 'sweeps-rules') return <SweepstakesRulesModal onClose={() => setCurrentView('main')} />;
    if (currentView === 'history') return <HistoryModal onClose={() => setCurrentView('main')} />;
    
    if (currentView === 'get-coins') {
        return (
            <GetCoinsModal 
                onClose={() => setCurrentView('main')} 
                user={user}
                onRegister={() => setAuthModalType('register')}
            />
        );
    }
    
    if (currentView === 'redeem') {
        return <div className="p-8 text-center text-white" role="status">
            <h2 className="text-2xl font-bold mb-3">Prize redemption unavailable</h2>
            <p className="text-slate-300">GGSlots is currently a free-play preview. Demo balances have no cash value and cannot be redeemed.</p>
        </div>;
    }

    if (currentView === 'promotions') {
        return (
            <div className="p-8 text-center animate-in fade-in duration-300">
                <h2 className="text-3xl font-bold text-white mb-4">Promotions</h2>
                <div className="max-w-2xl mx-auto space-y-4">
                    <div className="bg-slate-800 p-6 rounded-xl border border-indigo-500/30">
                        <h3 className="text-xl text-yellow-400 font-bold mb-2">Daily Login Bonus</h3>
                        <p className="text-slate-300">Get <span className="text-white font-bold">10,000 GC</span> every day you login.</p>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl border border-green-500/30">
                        <h3 className="text-xl text-green-400 font-bold mb-2">Sign Up Bonus</h3>
                        <p className="text-slate-300">Play free Gold Coin games as a guest. Account registration and Sweeps Cash are not currently offered.</p>
                    </div>
                     <div className="bg-slate-800 p-6 rounded-xl border border-indigo-500/30">
                        <h3 className="text-xl text-white font-bold mb-2">Mail-In Entry (AMO)</h3>
                        <p className="text-slate-300 text-sm">Sweepstakes entries and prize promotions are not active in this free-play preview.</p>
                    </div>
                </div>
            </div>
        );
    }
    if (currentView === 'vip') {
        return (
            <div className="p-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">VIP Club</h2>
                <div className="inline-block bg-slate-900 rounded-full px-6 py-2 border border-yellow-500/30">
                    <span className="text-yellow-500 font-bold uppercase tracking-widest">{user?.vipLevel || 'Guest'} Status</span>
                </div>
                {user?.isGuest && <button onClick={() => setAuthModalType('register')} className="block mx-auto mt-4 text-indigo-400 underline">Register</button>}
            </div>
        );
    }
    
    return (
        <Lobby 
            isLoggedIn={!!user && !user.isGuest}
            onRegister={() => setAuthModalType('register')}
            onGuestPlay={handleGuestPlay}
            onPlayGame={async (game) => {
                let currentUser = user;
                if (!currentUser && game.isDemo) currentUser = await ensureGuestUser();
                if (currentUser) {
                    setActiveGame(game);
                    setSidebarCollapsed(true);
                } else if (!game.isDemo) {
                    setAuthModalType('login');
                }
            }}
        />
    );
  };

  return (
    <>
        <Toaster 
            position="top-center"
            toastOptions={{
                style: {
                    background: '#0f172a',
                    color: '#fff',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: 600,
                },
                success: {
                    iconTheme: { primary: '#10b981', secondary: '#fff' },
                    style: { border: '1px solid rgba(16, 185, 129, 0.3)' }
                },
                error: {
                    iconTheme: { primary: '#ef4444', secondary: '#fff' },
                    style: { border: '1px solid rgba(239, 68, 68, 0.3)' }
                }
            }}
        />
        {sweepsLocked && (
            <div role="status" className="fixed top-0 left-0 right-0 z-[80] bg-amber-950/95 text-amber-100 text-xs sm:text-sm text-center px-4 py-2 border-b border-amber-800">
                FREE-PLAY PREVIEW — Gold Coins are demo credits with no cash value. Purchases, Sweeps Cash and redemptions are disabled.
            </div>
        )}
        <Layout 
            user={user} 
            currency={currency} 
            setCurrency={(next) => next === CurrencyType.GC ? setCurrency(next) : toast.error('Sweeps Cash is unavailable in free-play preview.')} 
            currentView={currentView}
            setView={setCurrentView}
            onLogin={() => setAuthModalType('login')}
            onRegister={() => setAuthModalType('register')}
            onLogout={handleLogout}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            visualBalanceOverride={visualBalanceOverride}
            openLegalModal={(type) => setLegalModal(type)}
        >
            {renderContent()}

            {authModalType && (
                <AuthModal type={authModalType} onClose={() => setAuthModalType(null)} onAuth={handleAuth} />
            )}

            {showKyc && user && (
                <KycModal onClose={() => setShowKyc(false)} user={user} onStatusUpdate={handleKycUpdate} />
            )}

            {/* Legal Modals */}
            {legalModal === 'terms' && <TermsModal onClose={() => setLegalModal(null)} />}
            {legalModal === 'privacy' && <PrivacyModal onClose={() => setLegalModal(null)} />}
            {legalModal === 'responsible' && <ResponsibleGamingModal onClose={() => setLegalModal(null)} />}

            {/* --- GAME ROUTES --- */}
            <Suspense fallback={<GameLoader />}>
                <ErrorBoundary componentName={activeGame?.title} onReset={closeGame}>
                    {activeGame && activeGame.id.includes('plinko') && (
                        <PlinkoGame 
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            currency={currency}
                            balance={user ? (currency === CurrencyType.GC ? user.gcBalance : user.scBalance) : 0}
                            user={user}
                            onClose={closeGame}
                            onSpin={(wager, isFreeSpin, config) => handleGameSpin(wager, isFreeSpin, config)}
                            isPaused={!sidebarCollapsed}
                            onVisualBalanceChange={setVisualBalanceOverride}
                        />
                    )}

                    {activeGame && activeGame.id.includes('bingo') && user && (
                        <BingoGame
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            currency={currency}
                            balance={currency === CurrencyType.GC ? user.gcBalance : user.scBalance}
                            user={user}
                            onClose={closeGame}
                            onSettle={async (debit, credit) => {
                                const result = await supabaseService.game.settle(user, currency, debit, credit, activeGame.id);
                                setUser(result.user);
                                return result.credited;
                            }}
                            isPaused={!sidebarCollapsed}
                            onVisualBalanceChange={setVisualBalanceOverride}
                        />
                    )}

                    {activeGame && activeGame.id === 'blackjack' && user && (
                        <BlackjackGame 
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            currency={currency}
                            balance={currency === CurrencyType.GC ? user.gcBalance : user.scBalance}
                            user={user}
                            onClose={closeGame}
                            onUpdateUser={setUser}
                            isPaused={!sidebarCollapsed}
                            onVisualBalanceChange={setVisualBalanceOverride}
                        />
                    )}
                    
                    {activeGame && activeGame.id === 'video-poker' && user && (
                        <PokerGame
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            currency={currency}
                            balance={currency === CurrencyType.GC ? user.gcBalance : user.scBalance}
                            user={user}
                            onClose={closeGame}
                            onUpdateUser={setUser}
                            isPaused={!sidebarCollapsed}
                        />
                    )}
                    
                    {activeGame && activeGame.id === 'mines' && user && (
                        <MinesGame
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            currency={currency}
                            balance={currency === CurrencyType.GC ? user.gcBalance : user.scBalance}
                            user={user}
                            onClose={closeGame}
                            onUpdateUser={setUser}
                            isPaused={!sidebarCollapsed}
                        />
                    )}

                    {activeGame && activeGame.id === 'crash' && user && (
                        <CrashGame
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            currency={currency}
                            balance={currency === CurrencyType.GC ? user.gcBalance : user.scBalance}
                            user={user}
                            onClose={closeGame}
                            onUpdateUser={setUser}
                            isPaused={!sidebarCollapsed}
                        />
                    )}

                    {activeGame && activeGame.id === 'roulette' && user && (
                        <RouletteGame
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            currency={currency}
                            balance={currency === CurrencyType.GC ? user.gcBalance : user.scBalance}
                            user={user}
                            onClose={closeGame}
                            onUpdateUser={setUser}
                            isPaused={!sidebarCollapsed}
                        />
                    )}

                    {activeGame && activeGame.id.includes('scratch') && user && (
                        <ScratchGame
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            user={user}
                            onClose={closeGame}
                            onUpdateUser={setUser}
                            isPaused={!sidebarCollapsed}
                        />
                    )}

                    {activeGame && !activeGame.id.includes('plinko') && !activeGame.id.includes('bingo') && activeGame.id !== 'blackjack' && activeGame.id !== 'video-poker' && !activeGame.id.includes('scratch') && activeGame.id !== 'mines' && activeGame.id !== 'crash' && activeGame.id !== 'roulette' && (
                        <SlotGame 
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame} 
                            currency={currency}
                            balance={user ? (currency === CurrencyType.GC ? user.gcBalance : user.scBalance) : 0}
                            user={user}
                            onClose={closeGame}
                            onSpin={handleGameSpin}
                            isPaused={!sidebarCollapsed}
                        />
                    )}
                </ErrorBoundary>
            </Suspense>
        </Layout>
    </>
  );
};

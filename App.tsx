
import React, { useState, useEffect, Suspense } from 'react';
import { UserProfile, CurrencyType, ViewType, GameConfig, WinResult } from './types';
import { supabaseService } from './services/supabaseService';
import { geoService } from './services/geoService';
import { Layout } from './components/Layout';
import { Lobby } from './components/Lobby';
import { AuthModal, GetCoinsModal, RedeemModal, HistoryModal, SweepstakesRulesModal, KycModal } from './components/Modals';
import { GeoBlock } from './components/GeoBlock';
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

const GameLoader = () => (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-indigo-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Game Asset...</div>
        </div>
    </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.GC);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [activeGame, setActiveGame] = useState<GameConfig | null>(null);
  const [authModalType, setAuthModalType] = useState<'login' | 'register' | null>(null);
  const [showKyc, setShowKyc] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Compliance & Legal
  const [isGeoBlocked, setIsGeoBlocked] = useState(false);
  const [blockedRegion, setBlockedRegion] = useState<string | undefined>(undefined);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'responsible' | null>(null);

  // App-level control of sidebar state to handle game pausing/collapsing
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // New: Visual Balance Override for syncing Header with Game Optimistic UI
  const [visualBalanceOverride, setVisualBalanceOverride] = useState<number | null>(null);

  // Initialize Session & Geo-Check
  useEffect(() => {
    supabaseService.auth.getSession().then(session => {
        if(session) setUser(session);
    });

    // Check Geolocation
    geoService.checkCompliance().then(status => {
        if (!status.allowed) {
            setIsGeoBlocked(true);
            setBlockedRegion(status.region);
        }
    });
  }, []);

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

  const handleRedeem = async (amount: number) => {
    if (!user || user.isGuest) return;
    const updatedUser = await supabaseService.db.redeem(amount);
    setUser(updatedUser);
    toast.success(`Redemption request for ${amount.toFixed(2)} SC submitted!`);
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
    if (currentView === 'get-coins') return <GetCoinsModal onClose={() => setCurrentView('main')} />;
    
    if (currentView === 'redeem') {
        if (!user || user.isGuest) return <div className="p-8 text-center text-white">Please login to redeem.</div>;
        return (
            <RedeemModal 
                onClose={() => setCurrentView('main')} 
                user={user} 
                onRedeem={handleRedeem} 
                onOpenKyc={() => setShowKyc(true)}
            />
        );
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
                        <p className="text-slate-300">New players receive <span className="text-white font-bold">20.00 SC</span> instantly upon registration.</p>
                    </div>
                     <div className="bg-slate-800 p-6 rounded-xl border border-indigo-500/30">
                        <h3 className="text-xl text-white font-bold mb-2">Mail-In Entry (AMO)</h3>
                        <p className="text-slate-300 text-sm">Send a handwritten 3x5 card to receive 5.00 SC. See <button onClick={() => setCurrentView('sweeps-rules')} className="text-indigo-400 underline">Official Rules</button> for details.</p>
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

  if (isGeoBlocked) {
      return <GeoBlock region={blockedRegion} />;
  }

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
        <Layout 
            user={user} 
            currency={currency} 
            setCurrency={setCurrency} 
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

                    {activeGame && activeGame.id.includes('bingo') && (
                        <BingoGame
                            key={`${activeGame.id}-${currency}`}
                            game={activeGame}
                            currency={currency}
                            balance={user ? (currency === CurrencyType.GC ? user.gcBalance : user.scBalance) : 0}
                            user={user}
                            onClose={closeGame}
                            onSpin={(wager, isFreeSpin) => handleGameSpin(wager, isFreeSpin)}
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

                    {activeGame && !activeGame.id.includes('plinko') && !activeGame.id.includes('bingo') && activeGame.id !== 'blackjack' && activeGame.id !== 'video-poker' && !activeGame.id.includes('scratch') && (
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

export default App;

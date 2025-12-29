
import React, { useState, useEffect } from 'react';
import { UserProfile, CurrencyType, ViewType, GameConfig, WinResult } from './types';
import { supabaseService } from './services/supabaseService';
import { Layout } from './components/Layout';
import { Lobby } from './components/Lobby';
import { SlotGame } from './components/SlotGame';
import { PlinkoGame } from './components/PlinkoGame';
import { BlackjackGame } from './components/BlackjackGame';
import { ScratchGame } from './components/ScratchGame';
import { PokerGame } from './components/PokerGame';
import { AuthModal, GetCoinsModal, RedeemModal, HistoryModal, SweepstakesRulesModal, KycModal } from './components/Modals';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.GC);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [activeGame, setActiveGame] = useState<GameConfig | null>(null);
  const [authModalType, setAuthModalType] = useState<'login' | 'register' | null>(null);
  const [showKyc, setShowKyc] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  // App-level control of sidebar state to handle game pausing/collapsing
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // New: Visual Balance Override for syncing Header with Game Optimistic UI
  const [visualBalanceOverride, setVisualBalanceOverride] = useState<number | null>(null);

  // Initialize Session
  useEffect(() => {
    supabaseService.auth.getSession().then(session => {
        if(session) setUser(session);
    });
  }, []);

  // Realtime Subscription for Profile Updates
  useEffect(() => {
    if (user && !user.isGuest) {
        const unsubscribe = supabaseService.auth.subscribeToUserChanges(user.id, (updatedProfile) => {
            setUser(prev => prev ? { ...prev, ...updatedProfile } : updatedProfile);
        });
        return () => unsubscribe();
    }
  }, [user?.id, user?.isGuest]);

  useEffect(() => {
      if(notification) {
          const timer = setTimeout(() => setNotification(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const handleAuth = async (email: string, password?: string, profileData?: any) => {
    const { data, message, error } = await supabaseService.auth.signIn(email, password, profileData);
    if (error) { alert(error); return; }
    if(data) setUser(data);
    if(message) setNotification(message);
    setAuthModalType(null);
  };

  const ensureGuestUser = async (): Promise<UserProfile> => {
      if (user) return user;
      const { user: guest, message } = await supabaseService.auth.signInAsGuest();
      setUser(guest);
      setCurrency(CurrencyType.GC);
      if (message) setNotification(message);
      return guest;
  };

  const handleGuestPlay = async () => { await ensureGuestUser(); };

  const handleLogout = async () => {
    await supabaseService.auth.signOut();
    setUser(null);
    setCurrentView('main');
  };

  const handlePurchase = async (pkg: any) => { 
      if(!user) return;
      // Simulate successful payment
      const updatedUser = await supabaseService.db.purchasePackage(pkg.price, pkg.gcAmount, pkg.scAmount);
      setUser(updatedUser);
      setNotification(`Purchased ${pkg.gcAmount} GC + ${pkg.scAmount} SC!`);
  };

  const handleRedeem = async (amount: number) => {
    if (!user || user.isGuest) return;
    const updatedUser = await supabaseService.db.redeem(amount);
    setUser(updatedUser);
    alert(`Redemption of ${amount} SC request received! Funds will arrive in 1-3 business days.`);
  };

  const handleKycUpdate = async (status: 'pending') => {
      if (!user) return;
      await supabaseService.auth.submitKyc(user.id);
      setUser(prev => prev ? { ...prev, kycStatus: status } : null);
      setNotification("KYC Documents Submitted. Verification in progress.");
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
    if (currentView === 'get-coins') return <GetCoinsModal onClose={() => setCurrentView('main')} onPurchase={handlePurchase} />;
    
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

  return (
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
    >
        {renderContent()}

        {notification && (
            <div className="fixed top-24 right-4 z-[80] bg-indigo-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 border border-indigo-400/50 flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                    <h4 className="font-bold">Notification</h4>
                    <p className="text-sm text-indigo-100">{notification}</p>
                </div>
            </div>
        )}

        {authModalType && (
            <AuthModal type={authModalType} onClose={() => setAuthModalType(null)} onAuth={handleAuth} />
        )}

        {showKyc && user && (
            <KycModal onClose={() => setShowKyc(false)} user={user} onStatusUpdate={handleKycUpdate} />
        )}

        {/* --- GAME ROUTES --- */}

        {activeGame && activeGame.id.includes('plinko') && (
            <PlinkoGame 
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

        {activeGame && activeGame.id === 'blackjack' && user && (
            <BlackjackGame 
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
                game={activeGame}
                user={user}
                onClose={closeGame}
                onUpdateUser={setUser}
                isPaused={!sidebarCollapsed}
             />
        )}

        {activeGame && !activeGame.id.includes('plinko') && activeGame.id !== 'blackjack' && activeGame.id !== 'video-poker' && !activeGame.id.includes('scratch') && (
            <SlotGame 
                game={activeGame} 
                currency={currency}
                balance={user ? (currency === CurrencyType.GC ? user.gcBalance : user.scBalance) : 0}
                user={user}
                onClose={closeGame}
                onSpin={handleGameSpin}
                isPaused={!sidebarCollapsed}
            />
        )}
    </Layout>
  );
};

export default App;

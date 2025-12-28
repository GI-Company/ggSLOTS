
import React, { useState, useEffect } from 'react';
import { UserProfile, CurrencyType, ViewType, GameConfig, WinResult } from './types';
import { supabaseService } from './services/supabaseService';
import { Layout } from './components/Layout';
import { Lobby } from './components/Lobby';
import { SlotGame } from './components/SlotGame';
import { AuthModal, GetCoinsModal, RedeemModal, HistoryModal } from './components/Modals';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.GC);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [activeGame, setActiveGame] = useState<GameConfig | null>(null);
  const [authModalType, setAuthModalType] = useState<'login' | 'register' | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // App-level control of sidebar state to handle game pausing/collapsing
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Initialize Session
  useEffect(() => {
    supabaseService.auth.getSession().then(session => {
        if(session) setUser(session);
    });
  }, []);

  // Realtime Subscription for Profile Updates
  useEffect(() => {
    if (user && !user.isGuest) {
        // Subscribe to changes on the profile (e.g. Balance updates from DB)
        const unsubscribe = supabaseService.auth.subscribeToUserChanges(user.id, (updatedProfile) => {
            // We merge to keep local flags if necessary, but generally DB source is truth
            setUser(prev => prev ? { ...prev, ...updatedProfile } : updatedProfile);
        });
        return () => unsubscribe();
    }
  }, [user?.id, user?.isGuest]);

  // Clear notification after 5s
  useEffect(() => {
      if(notification) {
          const timer = setTimeout(() => setNotification(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const handleAuth = async (email: string, profileData?: any) => {
    // If profileData exists, it's a registration call
    const { data, message, error } = await supabaseService.auth.signIn(email, profileData);
    
    if (error) {
        alert(error);
        return;
    }

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

  const handleGuestPlay = async () => {
     await ensureGuestUser();
  };

  const handleLogout = async () => {
    await supabaseService.auth.signOut();
    setUser(null);
    setCurrentView('main');
  };

  const handlePurchase = async (pkg: any) => {
    // Disabled for 'Coming Soon'
    // if (!user || user.isGuest) { setAuthModalType('register'); return; }
    // const updatedUser = await supabaseService.db.purchasePackage(pkg.price, pkg.gcAmount, pkg.scAmount);
    // setUser(updatedUser);
    // setCurrentView('main'); 
    alert("Store is currently under maintenance. Coming Soon!");
  };

  const handleRedeem = async (amount: number) => {
    if (!user || user.isGuest) return;
    const updatedUser = await supabaseService.db.redeem(amount);
    setUser(updatedUser);
    alert(`Redemption of ${amount} SC request received!`);
  };

  const handleGameSpin = async (wager: number): Promise<WinResult> => {
    if (!user) throw new Error("No user");
    const gameId = activeGame ? activeGame.id : 'unknown';
    const { user: updatedUser, result } = await supabaseService.game.spin(user, wager, currency, gameId);
    setUser(updatedUser);
    return result;
  };

  const renderContent = () => {
    if (currentView === 'history') {
        return <HistoryModal onClose={() => setCurrentView('main')} />;
    }
    if (currentView === 'get-coins') {
        return <GetCoinsModal onClose={() => setCurrentView('main')} onPurchase={handlePurchase} />;
    }
    if (currentView === 'redeem') {
        if (!user || user.isGuest) return <div className="p-8 text-center text-white">Please login to redeem.</div>;
        return <RedeemModal onClose={() => setCurrentView('main')} user={user} onRedeem={handleRedeem} />;
    }
    if (currentView === 'promotions') {
        return (
            <div className="p-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Promotions</h2>
                <div className="space-y-4 max-w-2xl mx-auto">
                    <div className="bg-slate-800 p-6 rounded-xl border border-indigo-500/30">
                        <h3 className="text-xl text-yellow-400 font-bold mb-2">Daily Login Bonus</h3>
                        <p className="text-slate-300">
                            Get <span className="text-white font-bold">10,000 GC</span> every day you login. 
                            Login consecutive days to get <span className="text-white font-bold">+10k GC</span> extra per day!
                            <br/><span className="text-xs text-slate-500">(Resets if missed 24h)</span>
                        </p>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl border border-indigo-500/30">
                        <h3 className="text-xl text-purple-400 font-bold mb-2">7-Day Streak</h3>
                        <p className="text-slate-300">Hit a 7-day streak for a massive <span className="text-white font-bold">100,000 GC</span> bonus!</p>
                    </div>
                </div>
            </div>
        );
    }
    if (currentView === 'vip') {
        return (
            <div className="p-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">VIP Club</h2>
                <div className="inline-block bg-gradient-to-r from-yellow-600 to-yellow-400 p-1 rounded-full mb-4">
                    <div className="bg-slate-900 rounded-full px-6 py-2">
                        <span className="text-yellow-500 font-bold uppercase tracking-widest">{user?.vipLevel || 'Guest'} Status</span>
                    </div>
                </div>
                {user?.isGuest && <button onClick={() => setAuthModalType('register')} className="block mx-auto mt-4 text-indigo-400 underline">Register to join VIP</button>}
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
                if (!currentUser && game.isDemo) {
                     currentUser = await ensureGuestUser();
                }
                
                if (currentUser) {
                    setActiveGame(game);
                    setSidebarCollapsed(true); // Auto collapse when game starts
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
    >
        {renderContent()}

        {notification && (
            <div className="fixed top-24 right-4 z-[80] bg-indigo-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 border border-indigo-400/50 flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                    <h4 className="font-bold">Bonus Received!</h4>
                    <p className="text-sm text-indigo-100">{notification}</p>
                </div>
            </div>
        )}

        {authModalType && (
            <AuthModal type={authModalType} onClose={() => setAuthModalType(null)} onAuth={handleAuth} />
        )}

        {activeGame && (
            <SlotGame 
                game={activeGame} 
                currency={currency}
                balance={user ? (currency === CurrencyType.GC ? user.gcBalance : user.scBalance) : 0}
                onClose={() => setActiveGame(null)}
                onSpin={handleGameSpin}
                isPaused={!sidebarCollapsed} // Pause game if sidebar opens
            />
        )}
    </Layout>
  );
};

export default App;

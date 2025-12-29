
import React, { useState, useEffect } from 'react';
import { CurrencyType, UserProfile, ViewType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  currency: CurrencyType;
  setCurrency: (c: CurrencyType) => void;
  currentView: ViewType;
  setView: (v: ViewType) => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  visualBalanceOverride?: number | null;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, user, currency, setCurrency, currentView, setView, onLogin, onRegister, onLogout,
    sidebarCollapsed, setSidebarCollapsed, visualBalanceOverride
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCurrencyToggle = () => { return; }; // SC Locked for now

  const NavItem = ({ view, label, icon }: { view: ViewType, label: string, icon: React.ReactNode }) => {
    const isActive = currentView === view;
    const showLabel = isMobile || !sidebarCollapsed;

    return (
        <button 
            onClick={() => { setView(view); setMobileMenuOpen(false); }}
            title={!showLabel ? label : ''}
            className={`
                group flex items-center rounded-xl transition-all duration-200 mb-1 font-medium relative overflow-hidden
                ${!showLabel ? 'justify-center p-3' : 'w-full px-4 py-3'}
                ${isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/40 border border-indigo-500/50' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'}
            `}
        >
            <span className={`relative z-10 ${showLabel && 'mr-3'} ${isActive ? 'text-white' : 'group-hover:text-white transition-colors'}`}>
                {icon}
            </span>
            {showLabel && <span className="relative z-10 whitespace-nowrap">{label}</span>}
            {isActive && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
        </button>
    );
  };

  const displayBalance = visualBalanceOverride !== undefined && visualBalanceOverride !== null
    ? visualBalanceOverride
    : (user ? (currency === CurrencyType.GC ? user.gcBalance : user.scBalance) : 0);

  const CurrencyToggle = ({ className = "" }: { className?: string }) => (
    <div 
        className={`relative inline-flex bg-slate-950 p-1 rounded-full border border-slate-700 shadow-inner group transition-colors cursor-not-allowed opacity-60 grayscale ${className}`}
        onClick={handleCurrencyToggle}
        title="Sweeps Cash (SC) Coming Soon!"
    >
            <div className={`w-14 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg`}></div>
            <div className="absolute inset-0 flex justify-between items-center px-2 text-[11px] font-black pointer-events-none select-none w-full box-border pr-3 pl-3">
                <span className="z-10 text-slate-900">GC</span>
                <span className="z-10 text-slate-500">SC</span>
            </div>
            <div className="absolute -bottom-3 -right-2 bg-red-600 text-white text-[8px] px-1 rounded uppercase font-bold tracking-tighter shadow-sm">SOON</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
        
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
            <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
            fixed lg:relative z-[70] h-full bg-slate-950 border-r border-slate-800 
            transform transition-all duration-300 ease-in-out flex flex-col shadow-2xl
            ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
            ${!isMobile && sidebarCollapsed ? 'w-20' : 'w-72'}
        `}>
            {/* Sidebar Header */}
            <div className={`h-16 lg:h-20 flex items-center border-b border-slate-800/50 bg-slate-900/50 ${!isMobile && sidebarCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black font-display text-xl shrink-0">
                        G
                    </div>
                    {(isMobile || !sidebarCollapsed) && (
                        <h1 className="text-xl font-black font-display tracking-wider text-white">GG<span className="text-indigo-500">SLOTS</span></h1>
                    )}
                </div>
                {!isMobile && !sidebarCollapsed && (
                    <button onClick={() => setSidebarCollapsed(true)} className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                )}
                {isMobile && (
                     <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>
            
            {/* Expand Button */}
            {!isMobile && sidebarCollapsed && (
                 <button onClick={() => setSidebarCollapsed(false)} className="w-full py-3 text-slate-500 hover:text-white transition-colors flex justify-center border-b border-slate-800/50 hover:bg-slate-900">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
            )}

            {/* Mobile Wallet */}
            {isMobile && user && (
                <div className="p-4 mx-3 mt-3 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
                    <div className="flex justify-between items-start mb-3">
                         <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Balance</p>
                            <div className="flex items-baseline gap-1">
                                 <span className={`text-xl font-black font-display ${currency === CurrencyType.GC ? 'text-yellow-400' : 'text-green-400'} tabular-nums`}>
                                    {currency === CurrencyType.GC ? Math.floor(displayBalance).toLocaleString() : displayBalance.toFixed(2)}
                                 </span>
                                 <span className="text-xs font-bold text-slate-500">{currency}</span>
                            </div>
                         </div>
                         <CurrencyToggle className="scale-90 origin-top-right" />
                    </div>
                    <button onClick={() => { setView('get-coins'); setMobileMenuOpen(false); }} className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-lg text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 border border-indigo-400/20">
                        GET COINS
                    </button>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-3 overflow-y-auto hide-scrollbar space-y-6 mt-2">
                <div className="space-y-1">
                    {(isMobile || !sidebarCollapsed) && <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Lobby</p>}
                    <NavItem view="main" label="Slots" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
                    <NavItem view="promotions" label="Promotions" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4H5z" /></svg>} />
                    <NavItem view="vip" label="VIP Club" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>} />
                </div>
                
                <div className="space-y-1">
                    {(isMobile || !sidebarCollapsed) && <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Account</p>}
                    <NavItem view="get-coins" label="Cashier" icon={<svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <NavItem view="redeem" label="Redeem" icon={<svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    <NavItem view="history" label="History" icon={<svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                </div>
            </nav>

            {/* User Footer */}
            <div className={`p-4 border-t border-slate-800 bg-slate-900/50 ${!isMobile && sidebarCollapsed ? 'flex justify-center' : ''}`}>
                {user ? (
                    <div className="w-full">
                        {/* VIP Progress (Only if expanded) */}
                        {(isMobile || !sidebarCollapsed) && (
                            <div className="mb-4">
                                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                                    <span className="text-yellow-500">{user.vipLevel}</span>
                                    <span className="text-slate-500">80% to Silver</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 w-[80%] rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-white shrink-0 border border-slate-600 shadow-inner">
                                {user.email[0].toUpperCase()}
                            </div>
                            {(isMobile || !sidebarCollapsed) && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate leading-none mb-1">{user.firstName || user.email.split('@')[0]}</p>
                                    <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-300 font-medium">Log Out</button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={`space-y-2 w-full ${!isMobile && sidebarCollapsed ? 'hidden' : 'block'}`}>
                        <button onClick={onLogin} className="w-full py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-sm hover:bg-slate-700 transition-colors">Log In</button>
                        <button onClick={onRegister} className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/30">Register</button>
                    </div>
                )}
                 {!isMobile && sidebarCollapsed && !user && (
                    <button onClick={onLogin} className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 shadow-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    </button>
                )}
            </div>
        </aside>

        {/* Main Layout Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Header */}
            <header className="h-16 lg:h-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-4 lg:px-8 z-40 sticky top-0 shadow-lg">
                <div className="flex items-center gap-3">
                    <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-slate-400 p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    
                    <button 
                        onClick={() => setView('main')} 
                        className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg group"
                        title="Back to Lobby"
                    >
                        <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    
                    {/* Breadcrumb / Title */}
                    <div className="hidden sm:block h-6 w-[1px] bg-slate-800 mx-2"></div>
                    <span className="hidden sm:block text-sm font-bold text-slate-300 uppercase tracking-wider">{currentView === 'main' ? 'Lobby' : currentView.replace('-', ' ')}</span>
                </div>

                <div className="flex-1" />

                {/* Desktop Balance */}
                {user && (
                    <div className="flex items-center gap-3 sm:gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="hidden sm:flex items-center bg-slate-900 rounded-full p-1.5 pr-6 border border-slate-800 shadow-inner">
                            <div className={`p-2 rounded-full mr-3 ${currency === CurrencyType.GC ? 'bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]'} transition-all duration-300`}>
                                <div className={`w-2.5 h-2.5 rounded-full ${currency === CurrencyType.GC ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`} />
                            </div>
                            <div className="flex flex-col items-end leading-none">
                                <span className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${currency === CurrencyType.GC ? 'text-yellow-500' : 'text-green-500'}`}>
                                    {currency === CurrencyType.GC ? 'Gold Coins' : 'Sweeps Cash'}
                                </span>
                                <span className={`font-black font-display text-white tabular-nums text-lg tracking-tight`}>
                                    {currency === CurrencyType.GC ? Math.floor(displayBalance).toLocaleString() : displayBalance.toFixed(2)}
                                </span>
                            </div>
                        </div>

                         {/* Mobile Balance Pill */}
                         <div className="sm:hidden flex items-center bg-slate-900 rounded-full px-3 py-1.5 border border-slate-800">
                             <span className={`w-2 h-2 rounded-full mr-2 ${currency === CurrencyType.GC ? 'bg-yellow-500' : 'bg-green-500'}`} />
                             <span className="font-bold text-white text-sm tabular-nums">
                                {currency === CurrencyType.GC 
                                    ? (displayBalance >= 1000 ? (displayBalance/1000).toFixed(1) + 'k' : Math.floor(displayBalance))
                                    : displayBalance.toFixed(2)}
                             </span>
                        </div>

                        <CurrencyToggle className="scale-90 sm:scale-100" />

                        <button onClick={() => setView('get-coins')} className="relative group">
                             <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                             <div className="relative w-10 h-10 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg border border-indigo-400/30 group-hover:scale-105 transition-transform">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                             </div>
                        </button>
                    </div>
                )}
            </header>

            {/* View Content */}
            <main className="flex-1 overflow-y-auto relative bg-[#020617] scroll-smooth z-10">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                    <div className="star" style={{top:'15%', left:'25%', width:'2px', height:'2px', animationDelay:'0s'}}></div>
                    <div className="star" style={{top:'45%', left:'75%', width:'3px', height:'3px', animationDelay:'1.5s'}}></div>
                    <div className="star" style={{top:'85%', left:'15%', width:'2px', height:'2px', animationDelay:'3s'}}></div>
                    <div className="star" style={{top:'10%', left:'80%', width:'1px', height:'1px', animationDelay:'2s'}}></div>
                    <div className="star" style={{top:'60%', left:'50%', width:'2px', height:'2px', animationDelay:'4s'}}></div>
                </div>
                <div className="relative z-10 pb-20">
                    {children}
                </div>
            </main>
        </div>
    </div>
  );
};

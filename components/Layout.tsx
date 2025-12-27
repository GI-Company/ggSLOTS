
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
  // Lifted state for App control
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, user, currency, setCurrency, currentView, setView, onLogin, onRegister, onLogout,
    sidebarCollapsed, setSidebarCollapsed
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

  const handleCurrencyToggle = () => {
    // SC is strictly disabled/non-clickable logic
    return;
  };

  const NavItem = ({ view, label, icon }: { view: ViewType, label: string, icon: React.ReactNode }) => {
    const isActive = currentView === view;
    return (
        <button 
            onClick={() => { setView(view); setMobileMenuOpen(false); }}
            title={sidebarCollapsed ? label : ''}
            className={`
                group flex items-center rounded-xl transition-all duration-200 mb-1 font-medium
                ${sidebarCollapsed ? 'justify-center p-3' : 'w-full px-4 py-3'}
                ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
            `}
        >
            <span className={`${!sidebarCollapsed && 'mr-3'} ${isActive ? 'text-white' : 'group-hover:text-white'}`}>
                {icon}
            </span>
            {!sidebarCollapsed && <span className="whitespace-nowrap opacity-100 transition-opacity duration-200">{label}</span>}
        </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans">
        
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
            <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
            fixed lg:relative z-[70] h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 
            transform transition-all duration-300 ease-in-out flex flex-col
            ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
            ${!isMobile && sidebarCollapsed ? 'w-20' : 'w-64'}
        `}>
            {/* Sidebar Header */}
            <div className={`h-20 flex items-center border-b border-slate-800 transition-all duration-300 ${sidebarCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-yellow-500/20 text-black font-black font-display shrink-0">G</div>
                    {!sidebarCollapsed && (
                        <h1 className="text-xl font-black font-display tracking-wider text-white animate-in fade-in duration-300">GG<span className="text-indigo-500">SLOTS</span></h1>
                    )}
                </div>
                {/* Collapse Button (Desktop Only) */}
                {!isMobile && !sidebarCollapsed && (
                    <button onClick={() => setSidebarCollapsed(true)} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                )}
            </div>
            
            {/* Show expand button if collapsed */}
            {!isMobile && sidebarCollapsed && (
                 <button onClick={() => setSidebarCollapsed(false)} className="w-full py-2 text-slate-500 hover:text-white transition-colors flex justify-center border-b border-slate-800/50">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
            )}

            <nav className="flex-1 p-3 overflow-y-auto hide-scrollbar space-y-4">
                <div className="space-y-1">
                    <NavItem view="main" label="Slots" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
                    <NavItem view="promotions" label="Promotions" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4H5z" /></svg>} />
                    <NavItem view="vip" label="VIP Club" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>} />
                </div>
                
                <div className={`pt-4 border-t border-slate-800 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                    {!sidebarCollapsed && <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cashier</p>}
                    <NavItem view="get-coins" label="Get Coins" icon={<svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <NavItem view="redeem" label="Redeem" icon={<svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                </div>
                
                 {/* History Nav Item */}
                 <div className={`pt-4 border-t border-slate-800 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                    <NavItem view="history" label="History" icon={<svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                </div>
            </nav>

            <div className={`p-4 border-t border-slate-800 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
                {user ? (
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-indigo-400 shrink-0 border border-slate-600">
                            {user.email[0].toUpperCase()}
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                                <p className="text-sm font-bold text-white truncate">{user.email.split('@')[0]}</p>
                                <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-300">Logout</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`space-y-2 w-full ${sidebarCollapsed ? 'hidden' : 'block'}`}>
                        <button onClick={onLogin} className="w-full py-2 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-colors">Login</button>
                        <button onClick={onRegister} className="w-full py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50">Register</button>
                    </div>
                )}
                 {/* Compact Auth for collapsed state */}
                 {sidebarCollapsed && !user && (
                    <button onClick={onLogin} className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    </button>
                )}
            </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Header - Sticky and High Z-Index for Visibility */}
            <header className="h-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 lg:px-8 z-40 sticky top-0 shadow-lg">
                <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-slate-400 p-2 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>

                <div className="flex-1" />

                {/* Balance & Toggles */}
                {user && (
                    <div className="flex items-center gap-2 sm:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* High Visibility Balance Container */}
                        <div className="hidden sm:flex items-center bg-slate-950 rounded-full p-1 pr-6 border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                            <div className={`p-2 rounded-full mr-3 ${currency === CurrencyType.GC ? 'bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]'} transition-all duration-300`}>
                                <div className={`w-2 h-2 rounded-full ${currency === CurrencyType.GC ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${currency === CurrencyType.GC ? 'text-yellow-500/80' : 'text-green-500/80'}`}>
                                    {currency === CurrencyType.GC ? 'Gold Coins' : 'Sweeps Cash'}
                                </span>
                                <span className={`font-black font-display text-white tabular-nums text-lg leading-none shadow-black drop-shadow-md`}>
                                    {currency === CurrencyType.GC 
                                        ? user.gcBalance.toLocaleString() 
                                        : user.scBalance.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <div 
                            className={`relative inline-flex bg-slate-950 p-1 rounded-full border border-slate-700 shadow-inner group transition-colors cursor-not-allowed opacity-60 grayscale`}
                            onClick={handleCurrencyToggle}
                            title="Sweeps Cash (SC) Coming Soon!"
                        >
                             <div className={`w-14 h-8 rounded-full transition-transform duration-300 ease-out-back translate-x-0 bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg`}></div>
                             <div className="absolute inset-0 flex justify-between items-center px-2 text-[11px] font-black pointer-events-none select-none w-full box-border pr-3 pl-3">
                                <span className="z-10 text-slate-900">GC</span>
                                <span className="z-10 text-slate-500">SC</span>
                             </div>
                             {/* Coming Soon Badge */}
                             <div className="absolute -bottom-3 -right-2 bg-red-600 text-white text-[8px] px-1 rounded uppercase font-bold tracking-tighter">SOON</div>
                        </div>

                        <button onClick={() => setView('get-coins')} className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-110 transition-all">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                )}
            </header>

            {/* View Content */}
            <main className="flex-1 overflow-y-auto relative bg-[#020617] scroll-smooth z-10">
                {/* Dynamic Background Stars */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
                     {/* Static CSS stars are lightweight */}
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
        
        <style>{`
            .ease-out-back {
                transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
        `}</style>
    </div>
  );
};

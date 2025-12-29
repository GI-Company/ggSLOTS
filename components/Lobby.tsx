
import React, { useEffect, useState } from 'react';
import { GameConfig } from '../types';
import { GAMES_LIST } from '../constants';

interface LobbyProps {
  onPlayGame: (game: GameConfig) => void;
  isLoggedIn: boolean;
  onRegister: () => void;
  onGuestPlay: () => void;
}

const MOCK_WINNERS = [
    { user: 'CryptoKing', amount: '2,500.00 SC', game: 'Plinko' },
    { user: 'SarahJ', amount: '150.00 SC', game: 'Slots' },
    { user: 'VegasMike', amount: '10,000.00 SC', game: 'Blackjack' },
    { user: 'LuckyGal88', amount: '500.00 SC', game: 'Scratch' },
    { user: 'TomB', amount: '45.00 SC', game: 'Slots' },
    { user: 'WhaleWatcher', amount: '5,000.00 SC', game: 'Plinko' },
];

const LiveTicker = () => {
    return (
        <div className="w-full bg-slate-950/80 border-b border-slate-800 overflow-hidden flex items-center h-10 relative z-30">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#020617] to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#020617] to-transparent z-10"></div>
            
            <div className="flex items-center gap-8 animate-scroll whitespace-nowrap min-w-full">
                {[...MOCK_WINNERS, ...MOCK_WINNERS, ...MOCK_WINNERS].map((win, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-white">{win.user}</span>
                        <span>won</span>
                        <span className="text-green-400 text-glow">{win.amount}</span>
                        <span className="opacity-50">on {win.game}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Lobby: React.FC<LobbyProps> = ({ onPlayGame, isLoggedIn, onRegister, onGuestPlay }) => {
  const [heroIndex, setHeroIndex] = useState(0);

  // Auto-rotate hero logic could go here, strictly static for now to ensure stability
  
  return (
    <div className="w-full min-h-full flex flex-col">
        {/* Live Ticker */}
        <LiveTicker />

        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto flex-1 flex flex-col gap-8">
            
            {/* Featured Hero */}
            <div className="relative rounded-3xl overflow-hidden h-72 md:h-96 w-full group shadow-2xl ring-1 ring-white/10">
                {/* Dynamic Background */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 z-0"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 z-0 transition-transform duration-1000 transform group-hover:scale-105"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_100%)] z-0"></div>

                <div className="relative h-full flex flex-col justify-center p-8 md:p-16 z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/50 rounded-full px-3 py-1 w-fit mb-4 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                        <span className="text-yellow-200 text-xs font-bold uppercase tracking-wider">New Release</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 mb-6 drop-shadow-xl font-display leading-tight">
                        COSMIC <span className="text-indigo-400">CASH</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl font-medium leading-relaxed">
                        Explore the galaxy and uncover multipliers up to <span className="text-yellow-400 font-bold">x5,000</span>. The universe is full of rewards waiting to be claimed.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={() => onPlayGame(GAMES_LIST[0])}
                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 font-black py-4 px-10 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.4)] transform hover:translate-y-[-2px] hover:shadow-[0_0_40px_rgba(234,179,8,0.6)] transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            {isLoggedIn ? 'PLAY NOW' : 'TRY DEMO'}
                        </button>
                        {!isLoggedIn && (
                            <button 
                                onClick={onRegister}
                                className="bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold py-4 px-10 rounded-full border border-slate-600 backdrop-blur-md transition-all duration-300"
                            >
                                CREATE ACCOUNT
                            </button>
                        )}
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
                <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Game Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white font-display tracking-tight">Top Games</h3>
                     </div>
                     <div className="hidden md:flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        {['All', 'Slots', 'Table', 'Instant'].map(filter => (
                            <button key={filter} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${filter === 'All' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                {filter}
                            </button>
                        ))}
                     </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {GAMES_LIST.map((game, i) => {
                        const isLocked = !isLoggedIn && !game.isDemo;

                        return (
                            <div key={game.id} className={`group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/20 ring-1 ring-slate-800 hover:ring-indigo-500/50 ${!isLocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}>
                                
                                {/* Background Gradient Placeholder */}
                                <div className={`absolute inset-0 bg-gradient-to-b ${['from-indigo-900', 'from-purple-900', 'from-blue-900', 'from-emerald-900', 'from-rose-900'][i % 5]} to-slate-950 opacity-60 transition-opacity group-hover:opacity-80`}></div>
                                
                                {/* Icon / Placeholder Art */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-0">
                                     <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300 drop-shadow-md">
                                        {game.id.includes('card') || game.id.includes('black') ? '🃏' : game.id.includes('plinko') ? '🟣' : game.id.includes('scratch') ? '🎟️' : '🎰'}
                                     </div>
                                     <h4 className="text-white font-black text-xl font-display leading-tight drop-shadow-md">{game.title}</h4>
                                </div>
                                
                                {/* Tags */}
                                {game.tag && (
                                    <div className="absolute top-3 left-3 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-10 uppercase tracking-wider">
                                        {game.tag}
                                    </div>
                                )}

                                {/* Hover Stats Overlay */}
                                {!isLocked && (
                                    <div className="absolute inset-0 bg-slate-950/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col items-center justify-end p-4 backdrop-blur-[2px]">
                                        <div className="w-full space-y-3 mb-2">
                                            <div className="flex justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                                                <span>Volatility</span>
                                                <span className="text-white font-bold">{game.volatility}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                                                <span>Max Win</span>
                                                <span className="text-yellow-400 font-bold">{game.maxMultiplier}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onPlayGame(game)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            {isLoggedIn ? 'PLAY' : 'DEMO'}
                                        </button>
                                    </div>
                                )}

                                {/* Lock Overlay */}
                                {isLocked && (
                                    <div className="absolute inset-0 bg-black/60 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                                        <div className="p-3 bg-slate-800 rounded-full border border-slate-600 mb-2 shadow-lg">
                                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </div>
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Login Required</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  );
};

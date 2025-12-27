import React, { useEffect, useRef } from 'react';
import { GameConfig } from '../types';
import { GAMES_LIST } from '../constants';

interface LobbyProps {
  onPlayGame: (game: GameConfig) => void;
  isLoggedIn: boolean;
  onRegister: () => void;
  onGuestPlay: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onPlayGame, isLoggedIn, onRegister, onGuestPlay }) => {
  const tickerRef = useRef<HTMLDivElement>(null);
  
  // Ticker Logic (Same as before)
  useEffect(() => {
    const names = ["SpinMaster", "JackpotJoe", "ReelQueen", "LuckyLucy", "VortexVinnie"];
    const ticker = tickerRef.current;
    if(!ticker) return;

    const interval = setInterval(() => {
        const item = document.createElement('div');
        item.className = "text-sm text-slate-300 py-1 transition-opacity duration-500 animate-in fade-in slide-in-from-top-2";
        const name = names[Math.floor(Math.random() * names.length)];
        const amt = Math.floor(Math.random() * 500) + 10;
        const curr = Math.random() > 0.8 ? 'SC' : 'GC';
        const formattedAmt = curr === 'SC' ? amt.toFixed(2) : (amt * 100).toLocaleString();
        item.innerHTML = `<span class="font-bold text-white">${name}</span> just won <span class="${curr === 'SC' ? 'text-green-400' : 'text-yellow-400'} font-bold">${formattedAmt} ${curr}</span>`;
        if (ticker.firstChild) ticker.insertBefore(item, ticker.firstChild);
        else ticker.appendChild(item);
        if (ticker.children.length > 8) ticker.removeChild(ticker.lastChild!);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
        
        {/* Featured Hero */}
        <div className="relative rounded-2xl overflow-hidden mb-8 h-64 md:h-80 w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 flex flex-col shadow-2xl border border-white/10">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
            <div className="relative h-full flex flex-col justify-center p-8 md:p-12 z-10">
                <div className="w-full flex justify-between items-start mb-auto">
                     <div className="bg-black/30 backdrop-blur-md rounded-lg p-3 border border-white/10 w-64 hidden md:block">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                             <span className="text-xs font-bold text-white uppercase tracking-wider">Live Wins</span>
                        </div>
                        <div ref={tickerRef} className="flex flex-col h-24 overflow-hidden mask-image-linear-gradient"></div>
                     </div>
                </div>
                
                <div className="text-center md:text-left">
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-4 drop-shadow-lg font-display">
                        COSMIC CASH
                    </h1>
                    <p className="text-lg md:text-xl text-indigo-100 mb-6 max-w-xl">
                        Journey through the stars and uncover multipliers up to x5,000 in our hottest new release.
                    </p>
                    <div className="flex gap-4 justify-center md:justify-start">
                        <button 
                            onClick={() => onPlayGame(GAMES_LIST[0])}
                            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-10 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)] transform hover:scale-105 transition-all duration-300"
                        >
                            {isLoggedIn ? 'PLAY NOW' : 'TRY DEMO'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Game Grid */}
        <div className="flex items-center justify-between mb-6">
             <h3 className="text-2xl font-bold text-white font-display">All Games</h3>
             <div className="hidden md:flex space-x-2 bg-slate-800 p-1 rounded-lg">
                <button className="px-4 py-1 text-sm font-bold text-white bg-slate-700 rounded shadow">All</button>
             </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {GAMES_LIST.map((game, i) => {
                const isLocked = !isLoggedIn && !game.isDemo;

                return (
                    <div key={game.id} className={`group relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 shadow-lg transform hover:-translate-y-2 transition-all duration-300 border border-slate-700 ${!isLocked ? 'cursor-pointer hover:border-indigo-500' : 'cursor-not-allowed opacity-75'}`}>
                        
                        {/* Game Visuals */}
                        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-600 font-display font-bold text-2xl">
                             <div className="text-center p-4">
                                <div className="text-4xl mb-2">🎰</div>
                                {game.title}
                             </div>
                        </div>
                        <div className={`absolute inset-0 opacity-80 ${['bg-indigo-900', 'bg-purple-900', 'bg-blue-900', 'bg-emerald-900', 'bg-red-900'][i % 5]}`}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                        
                        {/* Tags */}
                        {game.tag && (
                            <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-10 uppercase tracking-wider">
                                {game.tag}
                            </div>
                        )}

                        {/* Lock Overlay */}
                        {isLocked && (
                            <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center backdrop-blur-[2px]">
                                <div className="bg-slate-900/90 p-3 rounded-full border border-slate-600 mb-2">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <span className="text-xs font-bold text-slate-300 uppercase">Login to Play</span>
                            </div>
                        )}
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                            <h4 className="text-white font-bold text-lg leading-tight group-hover:opacity-0 transition-opacity duration-300">{game.title}</h4>
                        </div>

                        {/* Play Overlay (Only if not locked) */}
                        {!isLocked && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center z-20">
                                <h4 className="text-white font-bold text-xl mb-4 font-display">{game.title}</h4>
                                <button 
                                    onClick={() => onPlayGame(game)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-full shadow-lg mb-4 transform hover:scale-105 transition-transform"
                                >
                                    {isLoggedIn ? 'PLAY' : 'DEMO'}
                                </button>
                                <div className="space-y-1 text-xs text-slate-300">
                                    <p>Vol: <span className="text-white font-bold">{game.volatility}</span></p>
                                    <p>Max: <span className="text-yellow-400 font-bold">{game.maxMultiplier}</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

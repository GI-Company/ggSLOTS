
import React, { useState, useEffect } from 'react';
import { GameConfig, CurrencyType, BlackjackState, UserProfile } from '../types';
import { WAGER_LEVELS } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { Card } from './Card';

interface BlackjackGameProps {
  game: GameConfig;
  currency: CurrencyType;
  balance: number;
  user: UserProfile;
  onClose: () => void;
  onUpdateUser: (user: UserProfile) => void;
  isPaused: boolean;
  onVisualBalanceChange: (balance: number | null) => void;
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ game, currency, balance, user, onClose, onUpdateUser, isPaused, onVisualBalanceChange }) => {
  const [wagerIndex, setWagerIndex] = useState(3);
  const [gameState, setGameState] = useState<BlackjackState | null>(null);
  const [loading, setLoading] = useState(false);
  const [dealing, setDealing] = useState(false); // For animation state

  const currentWager = WAGER_LEVELS[currency][wagerIndex];

  // Derived Visual Balance
  // If game is active, balance has already been deducted by RPC/Service.
  // We just show what the prop says, unless we want to show potential win? 
  // Standard casino practice: Show current available balance (excluding wager).
  // The prop 'balance' is the source of truth from App state.
  
  const startGame = async () => {
      if (balance < currentWager) { alert("Insufficient Funds"); return; }
      setLoading(true);
      setDealing(true);
      
      try {
          const { game: newGame, user: updatedUser } = await supabaseService.blackjack.start(user, currentWager, currency);
          
          // Add artificial delay for "Dealing" animation
          setTimeout(() => {
              setGameState(newGame);
              onUpdateUser(updatedUser);
              setLoading(false);
              setDealing(false);
          }, 800);
      } catch (e: any) {
          alert(e.message);
          setLoading(false);
          setDealing(false);
      }
  };

  const hit = async () => {
      if (!gameState) return;
      setLoading(true);
      try {
          const { game: updatedGame, user: updatedUser } = await supabaseService.blackjack.hit(gameState.id, user);
          setGameState(updatedGame);
          onUpdateUser(updatedUser); // Bust logic updates balance? No, balance updated on start.
          setLoading(false);
      } catch (e) { console.error(e); setLoading(false); }
  };

  const stand = async () => {
      if (!gameState) return;
      setLoading(true);
      try {
          const { game: updatedGame, user: updatedUser } = await supabaseService.blackjack.stand(gameState.id, user);
          setGameState(updatedGame);
          onUpdateUser(updatedUser); // Win logic updates balance
          setLoading(false);
      } catch (e) { console.error(e); setLoading(false); }
  };

  // Reset local game state to allow re-betting
  const resetTable = () => {
      setGameState(null);
  };

  const renderStatus = () => {
      if (!gameState || gameState.status === 'active') return null;
      
      let msg = "";
      let color = "text-white";
      let amount = gameState.payout;

      switch(gameState.status) {
          case 'player_bust': msg = "BUST"; color = "text-red-500"; break;
          case 'dealer_bust': msg = "DEALER BUST! YOU WIN"; color = "text-green-400"; break;
          case 'player_win': msg = "YOU WIN!"; color = "text-green-400"; break;
          case 'dealer_win': msg = "DEALER WINS"; color = "text-slate-400"; break;
          case 'push': msg = "PUSH"; color = "text-yellow-400"; break;
      }

      return (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <h1 className={`text-6xl font-black font-display mb-4 ${color} drop-shadow-[0_0_20px_rgba(0,0,0,1)]`}>{msg}</h1>
              {amount > 0 && (
                  <div className="text-4xl font-bold text-white mb-8">
                      +{currency === 'GC' ? Math.floor(amount).toLocaleString() : amount.toFixed(2)}
                  </div>
              )}
              <button 
                onClick={resetTable}
                className="bg-green-600 hover:bg-green-500 text-white text-xl font-bold py-3 px-10 rounded-full shadow-lg transform hover:scale-105 transition-all"
              >
                  PLACE NEW BET
              </button>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
        <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-3xl border-4 border-emerald-500/50 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Top Bar */}
            <div className="flex-none h-16 bg-slate-950 border-b border-emerald-900 flex justify-between items-center px-6 z-20">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} disabled={gameState?.status === 'active'} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 disabled:opacity-50">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-emerald-500 font-display tracking-wider">BLACKJACK</h2>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-slate-500 mr-2 text-xs font-bold uppercase">Balance</span>
                    <span className="text-white font-bold tabular-nums">
                        {currency === 'GC' ? Math.floor(balance).toLocaleString() : balance.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Game Table */}
            <div className="flex-1 relative bg-[#0f392b] radial-gradient-table flex flex-col items-center justify-between py-12">
                {/* Felt Texture & Vignette */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>

                {/* Dealer Area */}
                <div className="flex flex-col items-center z-10 min-h-[160px]">
                    {gameState && (
                        <>
                            <div className="flex gap-[-60px]">
                                {gameState.dealer_hand.map((card, i) => (
                                    <div key={i} className={`transition-all duration-500 transform ${i > 0 ? '-ml-12' : ''} hover:-translate-y-2`}>
                                        {/* Hide first card if active */}
                                        <Card rank={card.rank} suit={card.suit} hidden={gameState.status === 'active' && i === 0} className="w-28 h-40 shadow-2xl" />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 bg-black/40 px-4 py-1 rounded-full text-slate-300 font-bold text-sm backdrop-blur-md">
                                DEALER {gameState.status !== 'active' ? gameState.dealer_score : '?'}
                            </div>
                        </>
                    )}
                    {!gameState && !dealing && (
                        <div className="text-emerald-500/30 font-black text-6xl tracking-widest uppercase font-display select-none">
                            G-21-G
                        </div>
                    )}
                </div>

                {/* Center Info / Result Overlay */}
                {renderStatus()}

                {/* Player Area */}
                <div className="flex flex-col items-center z-10 min-h-[160px]">
                    {gameState && (
                        <>
                             <div className="mb-4 bg-emerald-900/80 px-4 py-1 rounded-full text-white font-bold text-lg shadow-lg backdrop-blur-md border border-emerald-500/30">
                                PLAYER {gameState.player_score}
                            </div>
                            <div className="flex">
                                {gameState.player_hand.map((card, i) => (
                                    <div key={i} className={`transition-all duration-500 transform ${i > 0 ? '-ml-12' : ''} animate-in slide-in-from-bottom-10 fade-in`}>
                                        <Card rank={card.rank} suit={card.suit} className="w-28 h-40 shadow-2xl" />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Dealing Animation Placeholder */}
                {dealing && !gameState && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="text-white text-2xl font-bold animate-pulse">Dealing...</div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="h-24 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-6 px-4 z-20">
                {!gameState ? (
                    // Betting Controls
                    <div className="flex items-center gap-4">
                        <div className="text-slate-400 font-bold uppercase text-xs">Total Bet</div>
                         <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
                             <button 
                                disabled={wagerIndex === 0}
                                onClick={() => setWagerIndex(i => i - 1)}
                                className="w-12 h-10 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold transition-colors text-xl"
                            >-</button>
                            <div className="w-32 text-center font-bold text-white tabular-nums text-xl">
                                {currency === 'GC' ? currentWager.toLocaleString() : currentWager.toFixed(2)}
                            </div>
                            <button 
                                 disabled={wagerIndex === WAGER_LEVELS[currency].length - 1}
                                 onClick={() => setWagerIndex(i => i + 1)}
                                 className="w-12 h-10 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold transition-colors text-xl"
                            >+</button>
                        </div>
                        <button 
                            onClick={startGame}
                            disabled={loading || dealing}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xl py-3 px-12 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transform active:scale-[0.98] transition-all"
                        >
                            DEAL
                        </button>
                    </div>
                ) : (
                    // Game Controls
                    <div className="flex gap-4">
                        {gameState.status === 'active' && (
                            <>
                                <button 
                                    onClick={hit}
                                    disabled={loading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-12 rounded-xl text-xl shadow-lg transform active:scale-[0.98] transition-all"
                                >
                                    HIT
                                </button>
                                <button 
                                    onClick={stand}
                                    disabled={loading}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-12 rounded-xl text-xl shadow-lg transform active:scale-[0.98] transition-all"
                                >
                                    STAND
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

        </div>
        <style>{`
            .radial-gradient-table {
                background: radial-gradient(circle at center, #10b981 0%, #064e3b 100%);
            }
        `}</style>
    </div>
  );
};

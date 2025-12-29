
import React, { useState } from 'react';
import { GameConfig, CurrencyType, UserProfile, PokerState } from '../types';
import { WAGER_LEVELS } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { Card } from './Card';
import { GameRulesModal } from './Modals';
import toast from 'react-hot-toast';

interface PokerGameProps {
  game: GameConfig;
  currency: CurrencyType;
  balance: number;
  user: UserProfile;
  onClose: () => void;
  onUpdateUser: (user: UserProfile) => void;
  isPaused: boolean;
}

export const PokerGame: React.FC<PokerGameProps> = ({ game, currency, balance, user, onClose, onUpdateUser, isPaused }) => {
  const [wagerIndex, setWagerIndex] = useState(3);
  const [gameState, setGameState] = useState<PokerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [heldIndices, setHeldIndices] = useState<number[]>([]);
  const [showRules, setShowRules] = useState(false);

  const currentWager = WAGER_LEVELS[currency][wagerIndex];

  const handleDeal = async () => {
    if (balance < currentWager) { toast.error("Insufficient Funds"); return; }
    setLoading(true);
    setHeldIndices([]); // Reset holds
    try {
        const { game: newGame, user: updatedUser } = await supabaseService.poker.deal(user, currentWager, currency);
        setGameState(newGame);
        onUpdateUser(updatedUser);
        setLoading(false);
    } catch (e: any) { toast.error(e.message); setLoading(false); }
  };

  const handleDraw = async () => {
      if (!gameState) return;
      setLoading(true);
      try {
          const { game: updatedGame, user: updatedUser } = await supabaseService.poker.draw(gameState.id, heldIndices, user);
          setGameState(updatedGame);
          onUpdateUser(updatedUser);
          setLoading(false);
      } catch (e: any) { toast.error(e.message); setLoading(false); }
  };

  const toggleHold = (idx: number) => {
      if (!gameState || gameState.stage !== 'draw') return;
      if (heldIndices.includes(idx)) {
          setHeldIndices(prev => prev.filter(i => i !== idx));
      } else {
          setHeldIndices(prev => [...prev, idx]);
      }
  };

  const resetGame = () => setGameState(null);

  const PayTableItem = ({ name, payout, active }: { name: string, payout: number, active?: boolean }) => (
      <div className={`flex justify-between text-xs sm:text-sm font-bold px-2 py-1 rounded ${active ? 'bg-yellow-500 text-slate-900 animate-pulse' : 'text-slate-400 even:bg-slate-800/50'}`}>
          <span>{name}</span>
          <span>x{payout}</span>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
        {showRules && <GameRulesModal onClose={() => setShowRules(false)} gameTitle="Jacks or Better" />}
        
        <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-3xl border-4 border-blue-600/50 shadow-2xl flex flex-col overflow-hidden">
             
             {/* HEADER */}
            <div className="flex-none h-16 bg-slate-950 border-b border-blue-900 flex justify-between items-center px-4 sm:px-6 z-20">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} disabled={loading || (gameState?.stage === 'draw')} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 disabled:opacity-50">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => setShowRules(true)} className="w-8 h-8 rounded-full border border-slate-500 flex items-center justify-center text-slate-400 font-serif font-bold hover:text-white hover:border-white transition-colors">i</button>
                    <h2 className="text-xl font-bold text-blue-500 font-display tracking-wider hidden sm:block">VIDEO POKER</h2>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-slate-500 mr-2 text-xs font-bold uppercase">Balance</span>
                    <span className="text-white font-bold tabular-nums">
                        {currency === 'GC' ? Math.floor(balance).toLocaleString() : balance.toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="flex-1 relative bg-slate-900 flex flex-col p-4 sm:p-8 gap-4 overflow-y-auto">
                {/* Paytable */}
                <div className="w-full max-w-2xl mx-auto bg-slate-950/50 rounded-xl border border-slate-800 p-2 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 shadow-inner">
                    <PayTableItem name="Royal Flush" payout={800} active={gameState?.handName === 'Royal Flush'} />
                    <PayTableItem name="Straight Flush" payout={50} active={gameState?.handName === 'Straight Flush'} />
                    <PayTableItem name="4 of a Kind" payout={25} active={gameState?.handName === 'Four of a Kind'} />
                    <PayTableItem name="Full House" payout={9} active={gameState?.handName === 'Full House'} />
                    <PayTableItem name="Flush" payout={6} active={gameState?.handName === 'Flush'} />
                    <PayTableItem name="Straight" payout={4} active={gameState?.handName === 'Straight'} />
                    <PayTableItem name="3 of a Kind" payout={3} active={gameState?.handName === 'Three of a Kind'} />
                    <PayTableItem name="Two Pair" payout={2} active={gameState?.handName === 'Two Pair'} />
                    <PayTableItem name="Jacks or Better" payout={1} active={gameState?.handName === 'Jacks or Better'} />
                </div>

                {/* Game Area */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    {!gameState ? (
                        <div className="text-blue-500/20 font-black text-6xl sm:text-8xl tracking-tighter uppercase font-display select-none animate-pulse">
                            JACKS OR BETTER
                        </div>
                    ) : (
                        <div className="flex gap-2 sm:gap-4 justify-center flex-wrap">
                            {gameState.hand.map((card, i) => (
                                <div key={i} className="relative group cursor-pointer" onClick={() => toggleHold(i)}>
                                    <Card 
                                        rank={card.rank} 
                                        suit={card.suit} 
                                        className={`w-20 h-28 sm:w-32 sm:h-44 shadow-2xl transition-transform duration-200 ${heldIndices.includes(i) ? 'translate-y-[-10px] ring-2 ring-yellow-500' : 'hover:translate-y-[-5px]'}`} 
                                    />
                                    {gameState.stage === 'draw' && (
                                        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 text-black text-xs font-black uppercase rounded shadow-lg transition-opacity ${heldIndices.includes(i) ? 'opacity-100' : 'opacity-0'}`}>
                                            HELD
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Win Notification */}
                    {gameState?.stage === 'over' && (
                        <div className="mt-8 text-center animate-in zoom-in fade-in duration-300">
                            {gameState.winAmount > 0 ? (
                                <>
                                    <h2 className="text-4xl font-black text-yellow-400 font-display drop-shadow-md">{gameState.handName}</h2>
                                    <div className="text-2xl text-white font-bold mt-2">
                                        WIN: {currency === 'GC' ? Math.floor(gameState.winAmount).toLocaleString() : gameState.winAmount.toFixed(2)}
                                    </div>
                                </>
                            ) : (
                                <h2 className="text-3xl font-black text-slate-500 font-display">GAME OVER</h2>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* CONTROLS */}
            <div className="h-24 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-6 px-4 z-20">
                {!gameState || gameState.stage === 'over' ? (
                     <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
                             <button disabled={wagerIndex === 0} onClick={() => setWagerIndex(i => i - 1)} className="w-12 h-10 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xl">-</button>
                             <div className="w-32 text-center font-bold text-white tabular-nums text-xl">
                                {currency === 'GC' ? currentWager.toLocaleString() : currentWager.toFixed(2)}
                             </div>
                             <button disabled={wagerIndex === WAGER_LEVELS[currency].length - 1} onClick={() => setWagerIndex(i => i + 1)} className="w-12 h-10 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xl">+</button>
                        </div>
                        <button 
                            onClick={gameState?.stage === 'over' ? resetGame : handleDeal}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xl py-3 px-12 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transform active:scale-[0.98] transition-all"
                        >
                            {gameState?.stage === 'over' ? 'NEW GAME' : 'DEAL'}
                        </button>
                     </div>
                ) : (
                    <button 
                        onClick={handleDraw}
                        className="bg-green-600 hover:bg-green-500 text-white font-black text-xl py-3 px-16 rounded-xl shadow-[0_0_20px_rgba(22,163,74,0.3)] transform active:scale-[0.98] transition-all"
                    >
                        DRAW
                    </button>
                )}
            </div>

        </div>
    </div>
  );
};

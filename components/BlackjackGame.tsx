
import React, { useState, useEffect, useRef } from 'react';
import { GameConfig, CurrencyType, BlackjackState, UserProfile, Card as CardType } from '../types';
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

// Bot Types
interface BotPlayer {
    name: string;
    hand: CardType[];
    score: number;
    status: 'waiting' | 'turn' | 'stand' | 'bust';
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ game, currency, balance, user, onClose, onUpdateUser, isPaused, onVisualBalanceChange }) => {
  const [wagerIndex, setWagerIndex] = useState(3);
  const [gameState, setGameState] = useState<BlackjackState | null>(null);
  const [loading, setLoading] = useState(false);
  const [deckTheme, setDeckTheme] = useState<'classic' | 'witch'>('classic');
  
  // Turn Management
  const [turn, setTurn] = useState<'none' | 'dealing' | 'botLeft' | 'player' | 'botRight' | 'dealer' | 'settle'>('none');
  const [botLeft, setBotLeft] = useState<BotPlayer>({ name: 'House Bot 1', hand: [], score: 0, status: 'waiting' });
  const [botRight, setBotRight] = useState<BotPlayer>({ name: 'House Bot 2', hand: [], score: 0, status: 'waiting' });

  const currentWager = WAGER_LEVELS[currency][wagerIndex];
  const timerRef = useRef<number | null>(null);

  // --- BOT LOGIC ENGINE ---
  const generateRandomCard = (): CardType => {
      const suits: ('H' | 'D' | 'C' | 'S')[] = ['H', 'D', 'C', 'S'];
      const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
      const s = suits[Math.floor(Math.random() * 4)];
      const r = ranks[Math.floor(Math.random() * 13)];
      let val = parseInt(r);
      if (['J','Q','K'].includes(r)) val = 10;
      if (r === 'A') val = 11;
      return { suit: s, rank: r, value: val };
  };

  const calculateBotScore = (hand: CardType[]) => {
      let score = 0;
      let aces = 0;
      for (const c of hand) { score += c.value; if(c.rank === 'A') aces++; }
      while (score > 21 && aces > 0) { score -= 10; aces--; }
      return score;
  };

  const updateBotState = (botSetter: React.Dispatch<React.SetStateAction<BotPlayer>>, hand: CardType[], status: any) => {
      botSetter(prev => ({ ...prev, hand, score: calculateBotScore(hand), status }));
  };

  // --- TURN SEQUENCER ---
  useEffect(() => {
      if (turn === 'dealing') {
          // Animate dealing initial cards
          const dealSequence = async () => {
              // Deal Bot Left
              await new Promise(r => setTimeout(r, 300));
              updateBotState(setBotLeft, [generateRandomCard(), generateRandomCard()], 'waiting');
              
              // Deal User (via service state already set)
              await new Promise(r => setTimeout(r, 300));
              
              // Deal Bot Right
              await new Promise(r => setTimeout(r, 300));
              updateBotState(setBotRight, [generateRandomCard(), generateRandomCard()], 'waiting');

              // Deal Dealer (via service)
              await new Promise(r => setTimeout(r, 300));
              setTurn('botLeft');
          };
          dealSequence();
      }
      else if (turn === 'botLeft') {
          timerRef.current = setTimeout(() => {
              let currentHand = [...botLeft.hand];
              let score = calculateBotScore(currentHand);
              
              if (score < 17) {
                  // Hit
                  currentHand.push(generateRandomCard());
                  updateBotState(setBotLeft, currentHand, 'turn');
                  // Re-trigger effect for next decision
                  setTurn('none'); setTimeout(() => setTurn('botLeft'), 500); 
              } else {
                  // Stand/Bust
                  updateBotState(setBotLeft, currentHand, score > 21 ? 'bust' : 'stand');
                  setTurn('player');
              }
          }, 800);
      } 
      else if (turn === 'player') {
          // Wait for user input
      }
      else if (turn === 'botRight') {
          timerRef.current = setTimeout(() => {
              let currentHand = [...botRight.hand];
              let score = calculateBotScore(currentHand);
              
              if (score < 17) {
                  currentHand.push(generateRandomCard());
                  updateBotState(setBotRight, currentHand, 'turn');
                  setTurn('none'); setTimeout(() => setTurn('botRight'), 500);
              } else {
                  updateBotState(setBotRight, currentHand, score > 21 ? 'bust' : 'stand');
                  setTurn('dealer'); // Trigger dealer resolution in service
                  finalizeGame();
              }
          }, 800);
      }

      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [turn, botLeft.hand, botRight.hand]); // Dependencies for bot recursion

  const startGame = async () => {
      if (balance < currentWager) { alert("Insufficient Funds"); return; }
      setLoading(true);
      setBotLeft(prev => ({ ...prev, hand: [], score: 0, status: 'waiting' }));
      setBotRight(prev => ({ ...prev, hand: [], score: 0, status: 'waiting' }));
      
      try {
          const { game: newGame, user: updatedUser } = await supabaseService.blackjack.start(user, currentWager, currency);
          setGameState(newGame);
          onUpdateUser(updatedUser);
          setTurn('dealing');
          setLoading(false);
      } catch (e: any) { alert(e.message); setLoading(false); }
  };

  const handleHit = async () => {
      if (!gameState || turn !== 'player') return;
      setLoading(true);
      try {
          const { game: updatedGame, user: updatedUser } = await supabaseService.blackjack.hit(gameState.id, user);
          setGameState(updatedGame);
          onUpdateUser(updatedUser);
          setLoading(false);
          if (updatedGame.status !== 'active') {
              setTurn('botRight'); // Player busted/21 -> Move to Bot 2
          }
      } catch (e) { console.error(e); setLoading(false); }
  };

  const handleStand = async () => {
      if (turn !== 'player') return;
      setTurn('botRight'); // Don't call service 'stand' yet, wait for Bot 2 to finish
  };

  // Called after Bot 2 finishes
  const finalizeGame = async () => {
      if (!gameState) return;
      // Now we tell the server the player stood (if they didn't bust earlier)
      // If player already busted, state is already finalized, but we need to reveal dealer cards visually
      
      if (gameState.status === 'active') {
          const { game: finalGame, user: finalUser } = await supabaseService.blackjack.stand(gameState.id, user);
          setGameState(finalGame);
          onUpdateUser(finalUser);
      }
      setTurn('settle');
  };

  const resetTable = () => {
      setGameState(null);
      setTurn('none');
  };

  const BotSeat = ({ bot, position }: { bot: BotPlayer, position: 'left' | 'right' }) => (
      <div className={`flex flex-col items-center opacity-80 ${position === 'left' ? 'mr-auto' : 'ml-auto'} transform scale-90`}>
          <div className="flex -space-x-12 mb-2 h-32">
              {bot.hand.map((card, i) => (
                  <div key={i} className={`transition-all duration-300 transform hover:-translate-y-2 origin-bottom-left`} style={{ rotate: `${(i - 1) * 5}deg` }}>
                      <Card rank={card.rank} suit={card.suit} theme={deckTheme} className="w-20 h-28 shadow-xl border border-slate-600" />
                  </div>
              ))}
              {bot.hand.length === 0 && <div className="w-20 h-28 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30"></div>}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${bot.status === 'bust' ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
              {bot.name} {bot.score > 0 && `(${bot.score})`}
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
        <div className="relative w-full max-w-7xl h-[90vh] bg-slate-900 rounded-3xl border-4 border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            
            {/* TOP BAR */}
            <div className="flex-none h-16 bg-slate-950 border-b border-slate-800 flex justify-between items-center px-6 z-30">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} disabled={turn !== 'none' && turn !== 'settle'} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 disabled:opacity-50">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-slate-200 font-display tracking-wider">BLACKJACK</h2>
                    
                    {/* DECK TOGGLE */}
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 ml-4">
                        <button onClick={() => setDeckTheme('classic')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${deckTheme === 'classic' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Classic</button>
                        <button onClick={() => setDeckTheme('witch')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${deckTheme === 'witch' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-white'}`}>Witch</button>
                    </div>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-slate-500 mr-2 text-xs font-bold uppercase">Balance</span>
                    <span className="text-white font-bold tabular-nums">
                        {currency === 'GC' ? Math.floor(balance).toLocaleString() : balance.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* TABLE SURFACE */}
            <div className={`flex-1 relative transition-colors duration-1000 flex flex-col ${deckTheme === 'witch' ? 'bg-[#1a0b2e]' : 'bg-[#0f392b]'} radial-gradient-table overflow-hidden`}>
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
                
                {/* Dealer */}
                <div className="flex flex-col items-center justify-start pt-8 z-10 h-1/3">
                    {gameState ? (
                        <div className="flex flex-col items-center">
                            <div className="flex gap-[-60px]">
                                {gameState.dealer_hand.map((card, i) => (
                                    <div key={i} className={`transition-all duration-500 transform ${i > 0 ? '-ml-12' : ''} hover:-translate-y-2`}>
                                        <Card rank={card.rank} suit={card.suit} hidden={turn !== 'settle' && turn !== 'none' && i === 0} theme={deckTheme} className="w-28 h-40 shadow-2xl" />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 bg-black/40 px-3 py-1 rounded-full text-slate-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                Dealer {turn === 'settle' ? gameState.dealer_score : '?'}
                            </div>
                        </div>
                    ) : (
                        <div className={`text-6xl font-black opacity-10 font-display tracking-[1em] mt-10 select-none ${deckTheme === 'witch' ? 'text-purple-500' : 'text-emerald-500'}`}>G-21-G</div>
                    )}
                </div>

                {/* Players Row */}
                <div className="flex-1 flex items-end justify-between px-8 pb-12 z-10">
                    {/* Bot Left */}
                    <div className="w-1/4 flex justify-start">
                        <BotSeat bot={botLeft} position="left" />
                    </div>

                    {/* User Player (Center) */}
                    <div className="w-1/3 flex flex-col items-center -mt-12">
                        {gameState && (
                            <>
                                <div className={`relative flex transition-all duration-300 ${turn === 'player' ? 'scale-110 translate-y-[-20px]' : 'scale-100'}`}>
                                    {gameState.player_hand.map((card, i) => (
                                        <div key={i} className={`transition-all duration-500 transform ${i > 0 ? '-ml-16' : ''} animate-in slide-in-from-bottom-20 fade-in`}>
                                            <Card rank={card.rank} suit={card.suit} theme={deckTheme} className={`w-32 h-48 shadow-2xl ${turn === 'player' ? 'ring-4 ring-yellow-400/50 rounded-xl' : ''}`} />
                                        </div>
                                    ))}
                                    {turn === 'player' && <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black px-3 py-1 rounded-full text-xs shadow-lg animate-bounce">YOUR TURN</div>}
                                </div>
                                <div className="mt-4 bg-slate-900/90 border border-slate-600 px-6 py-2 rounded-full text-white font-bold text-xl shadow-xl backdrop-blur-md flex items-center gap-2">
                                    <span className="text-slate-400 text-xs uppercase">Count</span> {gameState.player_score}
                                </div>
                            </>
                        )}
                        {!gameState && (
                            <div className="w-32 h-48 border-4 border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/10 font-black text-2xl">SEAT</div>
                        )}
                    </div>

                    {/* Bot Right */}
                    <div className="w-1/4 flex justify-end">
                        <BotSeat bot={botRight} position="right" />
                    </div>
                </div>

                {/* Result Overlay */}
                {turn === 'settle' && gameState && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                        <h1 className={`text-6xl font-black font-display mb-4 drop-shadow-2xl ${gameState.payout > 0 ? 'text-green-400' : 'text-red-500'}`}>
                            {gameState.status === 'push' ? 'PUSH' : gameState.payout > 0 ? 'YOU WIN!' : 'DEALER WINS'}
                        </h1>
                        {gameState.payout > 0 && <div className="text-4xl font-bold text-white mb-8">+{currency === 'GC' ? Math.floor(gameState.payout).toLocaleString() : gameState.payout.toFixed(2)}</div>}
                        <button onClick={resetTable} className="bg-white hover:bg-slate-200 text-black text-xl font-black py-4 px-12 rounded-full shadow-xl transform hover:scale-105 transition-all">
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>

            {/* CONTROLS */}
            <div className="h-24 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-6 px-4 z-20">
                {!gameState ? (
                    <div className="flex items-center gap-4">
                         <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
                             <button disabled={wagerIndex === 0} onClick={() => setWagerIndex(i => i - 1)} className="w-12 h-10 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xl">-</button>
                             <div className="w-32 text-center font-bold text-white tabular-nums text-xl">{currency === 'GC' ? currentWager.toLocaleString() : currentWager.toFixed(2)}</div>
                             <button disabled={wagerIndex === WAGER_LEVELS[currency].length - 1} onClick={() => setWagerIndex(i => i + 1)} className="w-12 h-10 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xl">+</button>
                        </div>
                        <button onClick={startGame} disabled={loading} className={`text-white font-black text-xl py-3 px-16 rounded-xl shadow-lg transform active:scale-[0.98] transition-all ${deckTheme === 'witch' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/40' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'}`}>DEAL</button>
                    </div>
                ) : (
                    <div className="flex gap-4">
                        <button 
                            onClick={handleHit} 
                            disabled={turn !== 'player' || loading} 
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 px-12 rounded-xl text-xl shadow-lg transform active:scale-[0.98] transition-all"
                        >
                            HIT
                        </button>
                        <button 
                            onClick={handleStand} 
                            disabled={turn !== 'player' || loading} 
                            className="bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 px-12 rounded-xl text-xl shadow-lg transform active:scale-[0.98] transition-all"
                        >
                            STAND
                        </button>
                    </div>
                )}
            </div>
        </div>
        <style>{`
            .radial-gradient-table {
                background-image: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%);
            }
        `}</style>
    </div>
  );
};

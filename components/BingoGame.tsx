
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameConfig, CurrencyType, WinResult, UserProfile } from '../types';
import { WAGER_LEVELS } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { GameRulesModal } from './Modals';
import toast from 'react-hot-toast';

interface BingoGameProps {
  game: GameConfig;
  currency: CurrencyType;
  balance: number;
  user: UserProfile | null;
  onClose: () => void;
  onSpin: (wager: number, isFreeSpin: boolean) => Promise<WinResult>; 
  isPaused: boolean;
  onVisualBalanceChange: (balance: number | null) => void;
}

const BALL_COUNT = 75;
const DRAW_COUNT = 30;
const POOL_SIZE = 50;
const MAX_SELECTED_CARDS = 4;

type BingoCardState = {
    id: number;
    grid: number[][]; // 5x5, 0 for FREE
    hits: boolean[][];
    serial: string; // Unique ID for flavor
};

export const BingoGame: React.FC<BingoGameProps> = ({ game, currency, balance, user, onClose, onSpin, isPaused, onVisualBalanceChange }) => {
  const [wagerIndex, setWagerIndex] = useState(3);
  
  // Card State
  const [allCards, setAllCards] = useState<BingoCardState[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [isPickingCards, setIsPickingCards] = useState(false);

  // Game State
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gamePhase, setGamePhase] = useState<'idle' | 'drawing' | 'result'>('idle');
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  
  const [winAmount, setWinAmount] = useState(0);
  const [visualBalance, setVisualBalance] = useState(balance);
  const [showRules, setShowRules] = useState(false);

  const currentWagerPerCard = WAGER_LEVELS[currency][wagerIndex];
  const activeCards = useMemo(() => allCards.filter(c => selectedCardIds.includes(c.id)), [allCards, selectedCardIds]);
  const totalBet = currentWagerPerCard * activeCards.length;

  useEffect(() => {
     onVisualBalanceChange(visualBalance);
     return () => onVisualBalanceChange(null);
  }, [visualBalance, onVisualBalanceChange]);

  // Initialize Pool of 50 Cards
  useEffect(() => {
      generateCardPool();
  }, []);

  const generateCardPool = () => {
      const newPool: BingoCardState[] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
          const grid: number[][] = Array(5).fill(0).map(() => Array(5).fill(0));
          const hits: boolean[][] = Array(5).fill(false).map(() => Array(5).fill(false));
          
          // B (1-15), I (16-30), N (31-45), G (46-60), O (61-75)
          const ranges = [[1,15], [16,30], [31,45], [46,60], [61,75]];
          
          for (let col = 0; col < 5; col++) {
              const [min, max] = ranges[col];
              const nums = new Set<number>();
              while(nums.size < 5) nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
              const colNums = Array.from(nums);
              for (let row = 0; row < 5; row++) {
                  grid[row][col] = colNums[row];
              }
          }
          grid[2][2] = 0; // FREE SPACE
          hits[2][2] = true;
          
          const serial = `BIGO-${Math.floor(1000 + Math.random() * 9000)}-${i + 1}`;
          newPool.push({ id: i, grid, hits, serial });
      }
      setAllCards(newPool);
      // Default select first 4
      setSelectedCardIds([0, 1, 2, 3]);
  };

  const toggleCardSelection = (id: number) => {
      if (selectedCardIds.includes(id)) {
          // Prevent deselecting the last card
          if (selectedCardIds.length === 1) {
              toast.error("You must play at least one card!");
              return;
          }
          setSelectedCardIds(prev => prev.filter(cid => cid !== id));
      } else {
          if (selectedCardIds.length >= MAX_SELECTED_CARDS) {
              toast.error(`Max ${MAX_SELECTED_CARDS} cards allowed at once.`);
              return;
          }
          setSelectedCardIds(prev => [...prev, id]);
      }
  };

  const checkWin = (card: BingoCardState) => {
      let lines = 0;
      // Horizontal
      for(let r=0; r<5; r++) {
          if(card.hits[r].every(h => h)) lines++;
      }
      // Vertical
      for(let c=0; c<5; c++) {
          let colHit = true;
          for(let r=0; r<5; r++) if(!card.hits[r][c]) colHit = false;
          if(colHit) lines++;
      }
      // Diagonals
      if(card.hits[0][0] && card.hits[1][1] && card.hits[2][2] && card.hits[3][3] && card.hits[4][4]) lines++;
      if(card.hits[0][4] && card.hits[1][3] && card.hits[2][2] && card.hits[3][1] && card.hits[4][0]) lines++;

      // Payouts
      if (lines === 0) return 0;
      if (lines === 1) return currentWagerPerCard * 0.5; // Consolation
      if (lines === 2) return currentWagerPerCard * 2;
      if (lines === 3) return currentWagerPerCard * 10;
      if (lines >= 4) return currentWagerPerCard * 100;
      return 0;
  };

  const playRound = async () => {
      if (visualBalance < totalBet) { toast.error("Insufficient funds"); return; }
      
      setIsPlaying(true);
      setGamePhase('drawing');
      setDrawnBalls([]);
      setWinAmount(0);
      setVisualBalance(prev => prev - totalBet);
      
      // Reset hits on ACTIVE cards only (except free space)
      const resetPool = allCards.map(c => {
          if (selectedCardIds.includes(c.id)) {
              return {
                  ...c,
                  hits: c.grid.map((row, r) => row.map((cell, col) => (r===2 && col===2)))
              };
          }
          return c;
      });
      setAllCards(resetPool);

      // Simulate Server Draw
      const pool = Array.from({length: 75}, (_, i) => i + 1);
      const drawSequence: number[] = [];
      for(let i=0; i<DRAW_COUNT; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          drawSequence.push(pool[idx]);
          pool.splice(idx, 1);
      }

      // Animation Loop
      for (let i = 0; i < drawSequence.length; i++) {
          if (isPaused) break;
          const ball = drawSequence[i];
          setCurrentBall(ball);
          setDrawnBalls(prev => [...prev, ball]);
          
          // Mark Cards
          setAllCards(currentPool => {
              return currentPool.map(card => {
                  if (!selectedCardIds.includes(card.id)) return card; // Skip inactive

                  const newHits = card.hits.map(row => [...row]);
                  let hitFound = false;
                  card.grid.forEach((row, r) => {
                      row.forEach((cell, c) => {
                          if (cell === ball) {
                              newHits[r][c] = true;
                              hitFound = true;
                          }
                      });
                  });
                  return { ...card, hits: newHits };
              });
          });

          await new Promise(r => setTimeout(r, 150));
      }

      // Calculate Result
      let totalRoundWin = 0;
      // We need to calculate based on the latest state, but setState is async. 
      // In a real app, we'd check the final state. Here we re-run logic or trust the last state update.
      // Better: Re-calculate strictly from drawSequence for accuracy.
      
      // ... For this demo, let's grab the active cards from the pool manually after delay
      await new Promise(r => setTimeout(r, 100)); // Wait for last render
      
      // Re-evaluate hits locally to ensure sync
      const finalHitsCalculated = activeCards.map(card => {
          // Re-simulate hits
          const hits = card.grid.map((row, r) => row.map((cell, c) => (r===2 && c===2) || drawSequence.includes(cell)));
          return { ...card, hits };
      });

      finalHitsCalculated.forEach(c => {
          totalRoundWin += checkWin(c);
      });

      setWinAmount(totalRoundWin);
      if (totalRoundWin > 0) {
          setVisualBalance(prev => prev + totalRoundWin);
          onSpin(totalBet, false).catch(e => console.error("Sync error", e)); 
      }
      
      setGamePhase('result');
      setIsPlaying(false);
      setCurrentBall(null);
  };

  const getBallColor = (n: number) => {
      if (n <= 15) return 'bg-red-500 border-red-700';
      if (n <= 30) return 'bg-blue-500 border-blue-700';
      if (n <= 45) return 'bg-green-500 border-green-700';
      if (n <= 60) return 'bg-yellow-500 border-yellow-700';
      return 'bg-purple-500 border-purple-700';
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
        <div className="relative w-full max-w-7xl h-[90vh] bg-slate-900 rounded-3xl border-4 border-indigo-500 shadow-2xl flex flex-col overflow-hidden">
            {showRules && <GameRulesModal onClose={() => setShowRules(false)} gameTitle={game.title} />}
            
            {/* Header */}
            <div className="flex-none h-16 bg-slate-950 border-b border-indigo-900/50 flex justify-between items-center px-6 z-20">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} disabled={isPlaying} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 disabled:opacity-50">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-white font-display tracking-wider">BINGO BLAST</h2>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                        <span className="text-slate-500 mr-2 text-xs font-bold uppercase">Balance</span>
                        <span className="text-white font-bold tabular-nums">{currency === 'GC' ? Math.floor(visualBalance).toLocaleString() : visualBalance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                
                {/* --- CARD PICKER OVERLAY --- */}
                {isPickingCards && (
                    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h3 className="text-2xl font-black text-white font-display">SELECT CARDS</h3>
                                <p className="text-slate-400 text-sm">Pick up to <span className="text-indigo-400 font-bold">{MAX_SELECTED_CARDS}</span> lucky cards from the pool of 50.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs uppercase font-bold text-slate-500">Selected</div>
                                    <div className={`text-2xl font-black ${selectedCardIds.length === MAX_SELECTED_CARDS ? 'text-green-400' : 'text-white'}`}>
                                        {selectedCardIds.length} <span className="text-slate-600 text-lg">/ {MAX_SELECTED_CARDS}</span>
                                    </div>
                                </div>
                                <button onClick={() => setIsPickingCards(false)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-colors">
                                    CONFIRM
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {allCards.map(card => {
                                    const isSelected = selectedCardIds.includes(card.id);
                                    return (
                                        <button 
                                            key={card.id} 
                                            onClick={() => toggleCardSelection(card.id)}
                                            className={`
                                                relative aspect-[4/5] rounded-xl border-2 flex flex-col overflow-hidden transition-all duration-200 group
                                                ${isSelected ? 'border-green-500 ring-2 ring-green-500/50 scale-[1.02] shadow-xl z-10' : 'border-slate-700 hover:border-indigo-500 opacity-70 hover:opacity-100'}
                                            `}
                                        >
                                            <div className={`p-2 text-center text-xs font-bold uppercase tracking-widest ${isSelected ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                #{card.id + 1}
                                            </div>
                                            <div className="flex-1 bg-white p-1 grid grid-cols-5 gap-[1px] content-center bg-slate-200">
                                                {card.grid.flat().map((n, i) => (
                                                    <div key={i} className={`flex items-center justify-center text-[8px] font-bold h-full ${n===0 ? 'bg-indigo-200' : 'bg-white'}`}>
                                                        {n===0 ? '★' : n}
                                                    </div>
                                                ))}
                                            </div>
                                            {isSelected && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 pointer-events-none">
                                                    <div className="bg-green-500 rounded-full p-1 shadow-lg">
                                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* LEFT: BALL HOPPER */}
                <div className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-4 relative overflow-hidden hidden md:flex">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                    
                    {/* Current Ball Display */}
                    <div className="h-48 w-full bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center relative shadow-inner">
                        {currentBall ? (
                            <div key={currentBall} className={`w-32 h-32 rounded-full flex items-center justify-center border-8 shadow-2xl animate-in zoom-in spin-in-12 ${getBallColor(currentBall)}`}>
                                <div className="w-24 h-24 rounded-full bg-white/20 absolute top-1 left-2"></div>
                                <span className="text-5xl font-black text-white font-display drop-shadow-md">{currentBall}</span>
                            </div>
                        ) : (
                            <span className="text-slate-700 font-bold uppercase tracking-widest text-xs">Waiting...</span>
                        )}
                    </div>

                    {/* History */}
                    <div className="flex-1 bg-slate-900/50 rounded-xl p-2 overflow-y-auto grid grid-cols-4 content-start gap-2">
                        {drawnBalls.map((b, i) => (
                            <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 shadow-sm ${getBallColor(b)}`}>
                                {b}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER: CARDS */}
                <div className="flex-1 p-4 sm:p-8 bg-[#0f172a] relative overflow-y-auto">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-black pointer-events-none"></div>
                    
                    <div className={`grid gap-4 sm:gap-8 h-full place-content-center transition-all duration-500 ${activeCards.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : activeCards.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                        {activeCards.map(card => (
                            <div key={card.id} className="bg-slate-100 rounded-xl overflow-hidden shadow-2xl border-4 border-white/10 transform transition-transform duration-300 hover:scale-[1.01]">
                                {/* Card Header */}
                                <div className="bg-indigo-600 text-white flex justify-between items-center px-4 py-2 shadow-md z-10 relative">
                                    <span className="text-[10px] font-bold opacity-70">ID: {card.id + 1}</span>
                                    <div className="grid grid-cols-5 gap-4 font-black font-display tracking-widest">
                                        <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
                                    </div>
                                    <span className="text-[10px] font-bold opacity-70">{card.serial.split('-')[1]}</span>
                                </div>
                                {/* Grid */}
                                <div className="grid grid-cols-5 gap-[1px] bg-slate-300 p-[1px]">
                                    {card.grid.map((row, r) => row.map((num, c) => {
                                        const isHit = card.hits[r][c];
                                        const isFree = r===2 && c===2;
                                        return (
                                            <div key={`${r}-${c}`} className={`
                                                aspect-square flex items-center justify-center font-bold text-lg sm:text-xl relative transition-colors duration-200
                                                ${isFree ? 'bg-indigo-200' : 'bg-white'}
                                                ${isHit && !isFree ? 'text-white' : 'text-slate-800'}
                                            `}>
                                                {isFree ? (
                                                    <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                ) : (
                                                    num
                                                )}
                                                
                                                {/* Daub Mark */}
                                                {isHit && (
                                                    <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                                                        <div className={`w-[80%] h-[80%] rounded-full opacity-80 ${isFree ? 'bg-indigo-500' : 'bg-red-500'} mix-blend-multiply`}></div>
                                                    </div>
                                                )}
                                                
                                                <span className="relative z-10">{!isFree && num}</span>
                                            </div>
                                        );
                                    }))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {gamePhase === 'result' && winAmount > 0 && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300 pointer-events-none">
                            <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce font-display mb-2">BINGO!</h1>
                            <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-md">+{currency === 'GC' ? Math.floor(winAmount).toLocaleString() : winAmount.toFixed(2)}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="h-24 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-8 z-30">
                <div className="flex items-center gap-6">
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Active Cards</div>
                        <button 
                            disabled={isPlaying}
                            onClick={() => setIsPickingCards(true)}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700 transition-colors font-bold disabled:opacity-50"
                        >
                            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            PICK CARDS ({activeCards.length})
                        </button>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Bet Per Card</div>
                        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
                             <button disabled={isPlaying || wagerIndex === 0} onClick={() => setWagerIndex(i => i - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-lg">-</button>
                             <div className="w-20 text-center font-bold text-white tabular-nums">{currency === 'GC' ? currentWagerPerCard.toLocaleString() : currentWagerPerCard.toFixed(2)}</div>
                             <button disabled={isPlaying || wagerIndex === WAGER_LEVELS[currency].length - 1} onClick={() => setWagerIndex(i => i + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-lg">+</button>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Total Bet</div>
                        <div className="text-xl font-black text-white tabular-nums">{currency === 'GC' ? (totalBet).toLocaleString() : (totalBet).toFixed(2)}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isPlaying && gamePhase === 'drawing' ? (
                        <div className="text-white font-bold animate-pulse text-xl tracking-wider">DRAWING BALLS...</div>
                    ) : (
                        <button 
                            onClick={playRound} 
                            disabled={isPlaying || activeCards.length === 0} 
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-2xl py-3 px-16 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            PLAY
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

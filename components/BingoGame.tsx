
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
const MAX_DRAW_COUNT = 45; // Max balls to draw before ending if no one wins
const POOL_SIZE = 50;
const MAX_SELECTED_CARDS = 4;
const DRAW_SPEED_MS = 1200; // Slower call speed

type BingoCardState = {
    id: number;
    grid: number[][]; // 5x5, 0 for FREE
    hits: boolean[][];
};

type BotPlayer = {
    name: string;
    avatar: string;
    card: BingoCardState;
    isBingo: boolean;
};

export const BingoGame: React.FC<BingoGameProps> = ({ game, currency, balance, user, onClose, onSpin, isPaused, onVisualBalanceChange }) => {
  const [wagerIndex, setWagerIndex] = useState(0); // Default to lower bet
  
  // Card State
  const [allCards, setAllCards] = useState<BingoCardState[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [isPickingCards, setIsPickingCards] = useState(false);

  // Bot State
  const [bots, setBots] = useState<BotPlayer[]>([]);
  const [botWinner, setBotWinner] = useState<string | null>(null);

  // Game State
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gamePhase, setGamePhase] = useState<'idle' | 'drawing' | 'result'>('idle');
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [ballCallText, setBallCallText] = useState<string>("");
  
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

  // Initialize Pool & Bots
  useEffect(() => {
      const pool = generateCardPool(POOL_SIZE);
      setAllCards(pool);
      setSelectedCardIds([0, 1, 2, 3]);
      
      // Initialize Bots with their own unique cards (outside the player pool range to avoid ID clash logic issues, though visual only)
      const botNames = [
          { name: "Grandma Gertrude", avatar: "👵" },
          { name: "Bingo Bob", avatar: "🧢" },
          { name: "Lucky Larry", avatar: "🍀" }
      ];
      
      const newBots = botNames.map((b, i) => ({
          name: b.name,
          avatar: b.avatar,
          card: generateSingleCard(100 + i),
          isBingo: false
      }));
      setBots(newBots);

  }, []);

  const generateSingleCard = (id: number): BingoCardState => {
      const grid: number[][] = Array(5).fill(0).map(() => Array(5).fill(0));
      const hits: boolean[][] = Array(5).fill(false).map(() => Array(5).fill(false));
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
      return { id, grid, hits };
  }

  const generateCardPool = (size: number) => {
      const newPool: BingoCardState[] = [];
      for (let i = 0; i < size; i++) {
          newPool.push(generateSingleCard(i));
      }
      return newPool;
  };

  const toggleCardSelection = (id: number) => {
      if (selectedCardIds.includes(id)) {
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

  // Check lines for a single card
  const getLineCount = (card: BingoCardState): number => {
      let lines = 0;
      // Horizontal
      for(let r=0; r<5; r++) if(card.hits[r].every(h => h)) lines++;
      // Vertical
      for(let c=0; c<5; c++) {
          let colHit = true;
          for(let r=0; r<5; r++) if(!card.hits[r][c]) colHit = false;
          if(colHit) lines++;
      }
      // Diagonals
      if(card.hits[0][0] && card.hits[1][1] && card.hits[2][2] && card.hits[3][3] && card.hits[4][4]) lines++;
      if(card.hits[0][4] && card.hits[1][3] && card.hits[2][2] && card.hits[3][1] && card.hits[4][0]) lines++;
      return lines;
  };

  const checkPayout = (lines: number) => {
      if (lines === 0) return 0;
      if (lines === 1) return currentWagerPerCard * 0.5; // Consolation
      if (lines === 2) return currentWagerPerCard * 2;
      if (lines === 3) return currentWagerPerCard * 10;
      if (lines >= 4) return currentWagerPerCard * 100;
      return 0;
  };

  const getCallText = (ball: number) => {
      if (ball <= 15) return `B - ${ball}`;
      if (ball <= 30) return `I - ${ball}`;
      if (ball <= 45) return `N - ${ball}`;
      if (ball <= 60) return `G - ${ball}`;
      return `O - ${ball}`;
  };

  const playRound = async () => {
      if (visualBalance < totalBet) { toast.error("Insufficient funds"); return; }
      
      setIsPlaying(true);
      setGamePhase('drawing');
      setDrawnBalls([]);
      setWinAmount(0);
      setVisualBalance(prev => prev - totalBet);
      setBotWinner(null);
      setBallCallText("");
      
      // Reset hits on Player Cards
      setAllCards(prev => prev.map(c => ({
          ...c,
          hits: c.grid.map((row, r) => row.map((cell, col) => (r===2 && col===2)))
      })));

      // Reset Bots
      setBots(prev => prev.map(b => ({
          ...b,
          isBingo: false,
          card: {
              ...b.card,
              hits: b.card.grid.map((row, r) => row.map((cell, col) => (r===2 && col===2)))
          }
      })));

      // Generate Draw Sequence
      const pool = Array.from({length: 75}, (_, i) => i + 1);
      const drawSequence: number[] = [];
      for(let i=0; i<MAX_DRAW_COUNT; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          drawSequence.push(pool[idx]);
          pool.splice(idx, 1);
      }

      // --- GAME LOOP ---
      for (let i = 0; i < drawSequence.length; i++) {
          if (isPaused) break;
          const ball = drawSequence[i];
          
          setBallCallText(getCallText(ball));
          setCurrentBall(ball);
          setDrawnBalls(prev => [...prev, ball]);

          // 1. Update Player Cards
          setAllCards(currentPool => currentPool.map(card => {
              if (!selectedCardIds.includes(card.id)) return card;
              const newHits = card.hits.map(row => [...row]);
              card.grid.forEach((row, r) => {
                  row.forEach((cell, c) => {
                      if (cell === ball) newHits[r][c] = true;
                  });
              });
              return { ...card, hits: newHits };
          }));

          // 2. Update Bots
          let roundEnder = false;
          let winnerName = "";

          setBots(currentBots => currentBots.map(bot => {
              const newHits = bot.card.hits.map(row => [...row]);
              bot.card.grid.forEach((row, r) => {
                  row.forEach((cell, c) => {
                      if (cell === ball) newHits[r][c] = true;
                  });
              });
              
              const updatedCard = { ...bot.card, hits: newHits };
              const lines = getLineCount(updatedCard);
              
              // Bot Win Condition: Any line bingo
              if (lines > 0 && !bot.isBingo) {
                  roundEnder = true;
                  winnerName = bot.name;
                  return { ...bot, card: updatedCard, isBingo: true };
              }
              return { ...bot, card: updatedCard };
          }));

          // Wait for draw speed (Slow down the call)
          await new Promise(r => setTimeout(r, DRAW_SPEED_MS));

          // Check if Player hit Bingo (Visual check for early celebration, actual calc is at end of loop usually, but we check per ball for race)
          // Note: In this implementation, we calculate winnings at the very end to keep logic simple, 
          // but if a bot wins, we stop the ball draw immediately.
          
          if (roundEnder) {
              setBotWinner(winnerName);
              break; // Stop drawing
          }
      }

      // --- END ROUND CALCULATIONS ---
      let totalRoundWin = 0;
      
      // Calculate Player Winnings based on final state
      // Note: We need the LATEST state, so we re-calculate based on drawn balls
      // Because setAllCards is async inside the loop, we use the `drawSequence` sliced to where we stopped.
      
      const ballsActuallyDrawn = drawnBalls; // This might be stale due to closure, let's just rely on visual state + delay
      
      // Small delay to let last state settle
      await new Promise(r => setTimeout(r, 500)); 

      // We need to access the latest state, so we use a functional update or just re-calc for safety
      // For safety, let's re-calculate hits based on drawnBalls state which will be accurate after render
      
      setAllCards(finalPool => {
        // Calculate winnings inside this setter to ensure we have the very last grid state
        const active = finalPool.filter(c => selectedCardIds.includes(c.id));
        let calculatedWin = 0;
        
        active.forEach(c => {
             const lines = getLineCount(c);
             calculatedWin += checkPayout(lines);
        });

        if (calculatedWin > 0) {
            setWinAmount(calculatedWin);
            setVisualBalance(prev => prev + calculatedWin);
            // Fire and forget server sync
            onSpin(totalBet, false).catch(e => console.error("Sync error", e)); 
        }

        return finalPool;
      });
      
      setGamePhase('result');
      setIsPlaying(false);
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
        <div className="relative w-full max-w-7xl h-[95vh] bg-slate-900 rounded-3xl border-4 border-indigo-500 shadow-2xl flex flex-col overflow-hidden">
            {showRules && <GameRulesModal onClose={() => setShowRules(false)} gameTitle={game.title} />}
            
            {/* Header */}
            <div className="flex-none h-16 bg-slate-950 border-b border-indigo-900/50 flex justify-between items-center px-6 z-20">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} disabled={isPlaying} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 disabled:opacity-50">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-white font-display tracking-wider hidden sm:block">BINGO BLAST</h2>
                </div>
                
                {/* CALLER DISPLAY (Center) */}
                <div className="flex-1 flex justify-center">
                    {currentBall ? (
                        <div className="flex items-center gap-4 bg-slate-800/50 px-6 py-1 rounded-full border border-slate-700">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-white shadow-lg ${getBallColor(currentBall)}`}>{currentBall}</div>
                             <span className="text-2xl font-black text-white font-display tracking-widest">{ballCallText}</span>
                        </div>
                    ) : (
                        <div className="text-slate-500 font-bold uppercase tracking-widest text-sm">READY TO PLAY</div>
                    )}
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
                                <p className="text-slate-400 text-sm">Pick up to <span className="text-indigo-400 font-bold">{MAX_SELECTED_CARDS}</span> lucky cards.</p>
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
                                            className={`relative aspect-[4/5] rounded-xl border-2 flex flex-col overflow-hidden transition-all duration-200 group ${isSelected ? 'border-green-500 ring-2 ring-green-500/50 scale-[1.02] shadow-xl z-10' : 'border-slate-700 opacity-70 hover:opacity-100'}`}
                                        >
                                            <div className={`p-2 text-center text-xs font-bold uppercase tracking-widest ${isSelected ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Card #{card.id + 1}</div>
                                            <div className="flex-1 bg-white p-1 grid grid-cols-5 gap-[1px] content-center bg-slate-200">
                                                {card.grid.flat().map((n, i) => (<div key={i} className={`flex items-center justify-center text-[8px] font-bold h-full ${n===0 ? 'bg-indigo-200' : 'bg-white'}`}>{n===0 ? '★' : n}</div>))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* LEFT: BALL HISTORY */}
                <div className="w-24 bg-slate-950 border-r border-slate-800 p-2 flex flex-col gap-2 relative overflow-hidden hidden md:flex">
                    <div className="text-[10px] text-center font-bold text-slate-500 uppercase">History</div>
                    <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2 items-center">
                        {drawnBalls.slice().reverse().map((b, i) => (
                            <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 shadow-sm shrink-0 ${getBallColor(b)}`}>
                                {b}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER: PLAYER CARDS */}
                <div className="flex-1 bg-[#0f172a] relative overflow-y-auto custom-scrollbar">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-black pointer-events-none fixed"></div>
                    
                    <div className="min-h-full w-full flex flex-col items-center justify-start p-4 sm:p-8 relative z-10">
                        {/* Winner Banner */}
                        {botWinner && (
                            <div className="w-full max-w-2xl bg-red-500/90 text-white p-4 rounded-xl mb-6 text-center shadow-lg border-2 border-red-400 animate-in slide-in-from-top-10">
                                <h3 className="text-2xl font-black font-display uppercase">ROUND OVER!</h3>
                                <p className="font-bold">{botWinner} called Bingo!</p>
                            </div>
                        )}

                        <div className={`grid gap-6 w-full transition-all duration-500 ${activeCards.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 lg:grid-cols-2 max-w-4xl'}`}>
                            {activeCards.map(card => {
                                const lineCount = getLineCount(card);
                                return (
                                <div key={card.id} className={`bg-slate-100 rounded-xl overflow-hidden shadow-2xl border-4 transform transition-transform duration-300 hover:scale-[1.01] ${lineCount > 0 ? 'border-yellow-400 shadow-yellow-500/30' : 'border-white/10'}`}>
                                    <div className={`flex justify-between items-center px-4 py-2 shadow-md z-10 relative ${lineCount > 0 ? 'bg-yellow-500 text-slate-900' : 'bg-indigo-600 text-white'}`}>
                                        <span className="text-[10px] font-bold opacity-70">Card #{card.id + 1}</span>
                                        <div className="grid grid-cols-5 gap-5 font-black font-display tracking-widest text-lg">
                                            <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
                                        </div>
                                        <span className="text-[10px] font-bold opacity-70">Payout: {lineCount > 0 ? (checkPayout(lineCount)/currentWagerPerCard).toFixed(1)+'x' : '-'}</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-[1px] bg-slate-300 p-[1px]">
                                        {card.grid.map((row, r) => row.map((num, c) => {
                                            const isHit = card.hits[r][c];
                                            const isFree = r===2 && c===2;
                                            return (
                                                <div key={`${r}-${c}`} className={`aspect-square flex items-center justify-center font-bold text-lg sm:text-2xl relative transition-colors duration-500 ${isFree ? 'bg-indigo-200' : 'bg-white'} ${isHit && !isFree ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                    {isFree ? (
                                                        <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                    ) : (
                                                        num
                                                    )}
                                                    {isHit && (
                                                        <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                                                            <div className={`w-[85%] h-[85%] rounded-full opacity-80 ${isFree ? 'bg-indigo-500' : 'bg-red-500'} mix-blend-multiply shadow-sm`}></div>
                                                        </div>
                                                    )}
                                                    <span className={`relative z-10 ${isHit ? 'text-white' : ''}`}>{!isFree && num}</span>
                                                </div>
                                            );
                                        }))}
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>

                    {gamePhase === 'result' && winAmount > 0 && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300 pointer-events-none">
                            <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce font-display mb-2">YOU WON!</h1>
                            <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-md">+{currency === 'GC' ? Math.floor(winAmount).toLocaleString() : winAmount.toFixed(2)}</div>
                        </div>
                    )}
                </div>

                {/* RIGHT: COMPETITION (BOTS) */}
                <div className="w-64 bg-slate-950 border-l border-slate-800 flex flex-col hidden lg:flex">
                     <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Competition</div>
                     <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                         {bots.map((bot, i) => {
                             const botLines = getLineCount(bot.card);
                             // Calculate progress to next bingo roughly (just hits / 24)
                             const hits = bot.card.hits.flat().filter(h => h).length - 1; // minus free space
                             const progress = Math.min(100, (hits / 5) * 30); // Arbitrary progress visual

                             return (
                                 <div key={i} className={`rounded-xl p-3 border-2 transition-all duration-500 ${bot.isBingo ? 'bg-green-900/30 border-green-500 scale-105 shadow-lg shadow-green-900/50' : 'bg-slate-900 border-slate-800'}`}>
                                     <div className="flex items-center gap-3 mb-2">
                                         <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl border border-slate-700 shadow-inner">
                                             {bot.avatar}
                                         </div>
                                         <div className="min-w-0">
                                             <div className="text-sm font-bold text-white truncate">{bot.name}</div>
                                             <div className="text-[10px] text-slate-500 font-bold uppercase">{bot.isBingo ? <span className="text-green-400 animate-pulse">BINGO!</span> : 'Playing...'}</div>
                                         </div>
                                     </div>
                                     
                                     {/* Mini Grid Visualization */}
                                     <div className="grid grid-cols-5 gap-[2px] mb-2 opacity-80">
                                         {bot.card.hits.map((row, r) => row.map((hit, c) => (
                                             <div key={`${r}-${c}`} className={`w-full aspect-square rounded-sm ${hit ? (bot.isBingo ? 'bg-green-500' : 'bg-red-500') : 'bg-slate-800'}`}></div>
                                         )))}
                                     </div>

                                     {botLines > 0 && !bot.isBingo && (
                                         <div className="text-center text-[10px] font-bold text-yellow-500 animate-pulse">
                                             {botLines} Line{botLines > 1 ? 's' : ''}!
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                     </div>
                </div>
            </div>

            {/* Controls */}
            <div className="h-24 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-8 z-30 shrink-0">
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
                        <div className="text-white font-bold animate-pulse text-xl tracking-wider flex flex-col items-center">
                            <span>DRAWING...</span>
                            <span className="text-[10px] text-slate-500 font-normal">GOOD LUCK!</span>
                        </div>
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

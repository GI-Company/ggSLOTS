
import React, { useState, useEffect, useRef } from 'react';
import { GameConfig, CurrencyType, WinResult } from '../types';
import { REEL_STRIPS, WAGER_LEVELS } from '../constants';
import { SlotReel } from './SlotReel';

interface SlotGameProps {
  game: GameConfig;
  currency: CurrencyType;
  balance: number;
  onClose: () => void;
  onSpin: (wager: number) => Promise<WinResult>;
  isPaused: boolean;
}

export const SlotGame: React.FC<SlotGameProps> = ({ game, currency, balance, onClose, onSpin, isPaused }) => {
  const [wagerIndex, setWagerIndex] = useState(3);
  const [spinning, setSpinning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [targetIndices, setTargetIndices] = useState([0, 0, 0]);
  
  // Local Visual Balance to handle animations without jumping
  const [visualBalance, setVisualBalance] = useState(balance);
  const [winState, setWinState] = useState<{ amount: number; text: string } | null>(null);
  
  // Refs to manage timers and latent state
  const winTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingWinAmount = useRef<number>(0);

  const currentWager = WAGER_LEVELS[currency][wagerIndex];

  // 1. Sync visual balance ONLY when idle to prevent jumps during play
  useEffect(() => {
    // We only sync if we are NOT spinning, NOT stopping, and NOT celebrating a win
    if (!spinning && !stopping && !winState) {
        setVisualBalance(balance);
    }
  }, [balance, spinning, stopping, winState]);

  // Load initial random positions
  useEffect(() => {
    setTargetIndices(REEL_STRIPS.map(strip => Math.floor(Math.random() * strip.length)));
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
      return () => {
          if (winTimerRef.current) clearTimeout(winTimerRef.current);
      };
  }, []);

  const triggerWinCelebration = (amount: number, isBig: boolean) => {
      setWinState({
          amount: amount,
          text: isBig ? "BIG WIN!" : "WINNER"
      });
      pendingWinAmount.current = amount;

      // Auto-collect after 3 seconds
      winTimerRef.current = setTimeout(() => {
          collectWin();
      }, 3000);
  };

  const collectWin = () => {
      if (winTimerRef.current) clearTimeout(winTimerRef.current);
      winTimerRef.current = null;
      
      if (pendingWinAmount.current > 0) {
          setVisualBalance(prev => prev + pendingWinAmount.current);
          pendingWinAmount.current = 0;
      }
      setWinState(null);
  };

  const executeSpin = async () => {
    // Use actual prop balance for validation to ensure server/client sync
    if (balance < currentWager) { alert("Insufficient Balance!"); return; }
    
    // Clear any existing win state immediately if user "Skipped"
    if (winState) collectWin();

    // 1. Visual Deduct
    setVisualBalance(prev => prev - currentWager);
    
    setSpinning(true);
    setStopping(false);

    try {
        const minSpinTime = new Promise(resolve => setTimeout(resolve, 300));
        const spinRequest = onSpin(currentWager);
        const [result] = await Promise.all([spinRequest, minSpinTime]);
        
        setTargetIndices(result.stopIndices);
        
        // Auto stop sequence
        setTimeout(() => {
             // Triggers the CSS transition in Reel component
             setStopping(true);
             
             // Wait for Reel CSS transition (approx 0.8s) then finish
             setTimeout(() => {
                 setSpinning(false);
                 setStopping(false);
                 
                 if (result.totalWin > 0) {
                     triggerWinCelebration(result.totalWin, result.isBigWin);
                 }
             }, 800); 

        }, 2000);
        
    } catch (e) {
        console.error(e);
        setSpinning(false);
        setStopping(false);
        // Sync back on error
        setVisualBalance(balance); 
    }
  };

  const handleClick = () => {
      // 1. Skill Stop
      if (spinning && !stopping) {
          setStopping(true);
          return;
      } 
      
      // 2. Start Spin (works even if celebrating - "Fast Play")
      if (!spinning) {
          executeSpin();
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
        
        {/* Game Frame */}
        <div className="relative w-full max-w-5xl aspect-[4/5] sm:aspect-[4/3] md:aspect-[16/9] bg-slate-900 rounded-3xl border-4 border-indigo-500/50 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Pause Overlay */}
            {isPaused && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <div className="text-6xl mb-4">⏸️</div>
                    <h2 className="text-3xl font-bold text-white font-display">GAME PAUSED</h2>
                    <p className="text-slate-300 mt-2">Close the sidebar to resume playing.</p>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex-none h-16 bg-slate-800/80 border-b border-indigo-500/30 flex justify-between items-center px-6 z-20">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} disabled={spinning} className="p-2 hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50">
                        <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-white font-display uppercase tracking-wider hidden sm:block">{game.title}</h2>
                </div>
                <div className="flex gap-4 text-sm font-bold">
                    <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-700 shadow-inner">
                        <span className="text-slate-500 mr-2">BAL</span>
                        <span className="text-white tabular-nums">
                            {currency === 'GC' ? Math.floor(visualBalance).toLocaleString() : visualBalance.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Reels Viewport */}
            <div className="flex-1 relative bg-black p-4 sm:p-8 flex items-center justify-center gap-2 sm:gap-4 overflow-hidden">
                {/* Payline Indicators */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-yellow-400/20 pointer-events-none z-0"></div>

                {/* Win Celebration Overlay */}
                {winState && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 animate-in fade-in zoom-in duration-300 pointer-events-none">
                        <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce font-display mb-2">
                            {winState.text}
                        </h1>
                        <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-md">
                            {currency === 'GC' ? Math.floor(winState.amount).toLocaleString() : winState.amount.toFixed(2)}
                        </div>
                    </div>
                )}

                {/* The Reels */}
                {REEL_STRIPS.map((strip, i) => (
                    <div key={i} className="flex-1 h-full max-w-[200px] relative bg-slate-900 rounded-lg overflow-hidden">
                        <SlotReel 
                            symbols={strip} 
                            targetIndex={targetIndices[i]} 
                            isSpinning={spinning && !stopping} 
                            reelIndex={i}
                        />
                    </div>
                ))}
            </div>

            {/* Bottom Controls */}
            <div className="flex-none h-24 bg-slate-800 border-t border-indigo-500/30 flex items-center justify-between px-4 sm:px-8 gap-4 z-20">
                
                {/* Wager Controls */}
                <div className="flex flex-col items-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Bet</div>
                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1 shadow-inner">
                        <button 
                            disabled={spinning || wagerIndex === 0}
                            onClick={() => setWagerIndex(i => i - 1)}
                            className="w-10 h-8 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold transition-colors"
                        >-</button>
                        <div className="w-24 text-center font-bold text-white tabular-nums">
                            {currency === 'GC' ? currentWager.toLocaleString() : currentWager.toFixed(2)}
                        </div>
                        <button 
                             disabled={spinning || wagerIndex === WAGER_LEVELS[currency].length - 1}
                             onClick={() => setWagerIndex(i => i + 1)}
                             className="w-10 h-8 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold transition-colors"
                        >+</button>
                    </div>
                </div>

                {/* Spin / Stop Button */}
                <div className="flex-1 max-w-xs h-16">
                    <button 
                        onClick={handleClick}
                        className={`
                            w-full h-full rounded-2xl font-black text-2xl tracking-widest uppercase shadow-lg
                            transition-all duration-100 transform active:scale-[0.98]
                            flex items-center justify-center relative overflow-hidden group
                            ${spinning && !stopping
                                ? 'bg-red-600 text-white shadow-red-500/30 hover:bg-red-500' // Stop State
                                : spinning 
                                    ? 'bg-slate-700 text-slate-500 cursor-wait' // Finishing State
                                    : 'bg-gradient-to-b from-green-400 to-green-600 text-white shadow-green-500/30 hover:shadow-green-500/50 hover:brightness-110' // Spin State
                             }
                        `}
                    >
                        {!spinning && <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] group-hover:animate-shine" />}
                        
                        {spinning && !stopping ? (
                            <span>STOP</span>
                        ) : spinning ? (
                            <div className="w-6 h-6 border-4 border-slate-500 border-t-white rounded-full animate-spin"></div>
                        ) : 'SPIN'}
                    </button>
                </div>

                {/* Win Display */}
                <div className="flex flex-col items-end min-w-[100px] hidden sm:flex">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Win</div>
                    <div className="text-2xl font-bold text-yellow-400 font-display tabular-nums">
                        {winState ? (currency === 'GC' ? Math.floor(winState.amount).toLocaleString() : winState.amount.toFixed(2)) : 0}
                    </div>
                </div>

            </div>
        </div>
        
        <style>{`
            @keyframes shine {
                0% { left: -50%; }
                100% { left: 150%; }
            }
            .group-hover\\:animate-shine {
                animation: shine 1s linear infinite;
            }
        `}</style>
    </div>
  );
};

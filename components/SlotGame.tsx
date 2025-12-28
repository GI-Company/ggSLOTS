
import React, { useState, useEffect, useRef } from 'react';
import { GameConfig, CurrencyType, WinResult } from '../types';
import { GAME_DATA, WAGER_LEVELS } from '../constants';
import { SlotReel } from './SlotReel';

interface SlotGameProps {
  game: GameConfig;
  currency: CurrencyType;
  balance: number;
  onClose: () => void;
  onSpin: (wager: number, isFreeSpin: boolean) => Promise<WinResult>;
  isPaused: boolean;
}

export const SlotGame: React.FC<SlotGameProps> = ({ game, currency, balance, onClose, onSpin, isPaused }) => {
  const [wagerIndex, setWagerIndex] = useState(3);
  const [spinning, setSpinning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [targetIndices, setTargetIndices] = useState([0, 0, 0]);
  const [isQuickSpin, setIsQuickSpin] = useState(false);
  
  // Bonus Game State
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [bonusWinTotal, setBonusWinTotal] = useState(0);

  // Local Visual Balance to handle animations without jumping
  const [visualBalance, setVisualBalance] = useState(balance);
  const [winState, setWinState] = useState<{ amount: number; text: string } | null>(null);
  const [lastWin, setLastWin] = useState(0);
  
  // Refs to manage timers and latent state
  const winTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bonusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWinAmount = useRef<number>(0);

  const currentWager = WAGER_LEVELS[currency][wagerIndex];
  
  // Get assets for current game
  const gameAssets = GAME_DATA[game.id] || GAME_DATA['default'];
  const reelStrips = gameAssets.strips;

  // 1. Sync visual balance ONLY when idle to prevent jumps during play
  // Also do not sync during bonus mode, as we accumulate wins separately
  useEffect(() => {
    // We only sync if we are NOT spinning, NOT stopping, NOT celebrating a win, and NOT in bonus mode
    if (!spinning && !stopping && !winState && !isBonusActive) {
        setVisualBalance(balance);
    }
  }, [balance, spinning, stopping, winState, isBonusActive]);

  // Load initial random positions
  useEffect(() => {
    setTargetIndices(reelStrips.map(strip => Math.floor(Math.random() * strip.length)));
  }, [game.id]);

  // Cleanup timers on unmount
  useEffect(() => {
      return () => {
          if (winTimerRef.current) clearTimeout(winTimerRef.current);
          if (bonusTimerRef.current) clearTimeout(bonusTimerRef.current);
      };
  }, []);

  const triggerWinCelebration = (amount: number, isBig: boolean, text: string) => {
      setWinState({
          amount: amount,
          text: text || (isBig ? "BIG WIN!" : "WINNER")
      });
      pendingWinAmount.current = amount;

      // Auto-collect duration based on Quick Spin
      // If inside bonus mode, make it snappier unless it's the final summary
      const duration = isQuickSpin || (isBonusActive && freeSpinsRemaining > 0) ? 800 : 3000;

      winTimerRef.current = setTimeout(() => {
          collectWin();
      }, duration);
  };

  const collectWin = () => {
      if (winTimerRef.current) clearTimeout(winTimerRef.current);
      winTimerRef.current = null;
      
      const amount = pendingWinAmount.current;
      if (amount > 0) {
          if (isBonusActive) {
              // In bonus mode, wins go to bonus accumulator, not immediate visual balance
              setBonusWinTotal(prev => prev + amount);
          } else {
              setVisualBalance(prev => prev + amount);
          }
          pendingWinAmount.current = 0;
      }
      setWinState(null);
  };

  // --- Main Spin Logic ---
  const executeSpin = async (isFreeSpin: boolean = false) => {
    // Validation
    if (!isFreeSpin && balance < currentWager) { alert("Insufficient Balance!"); return; }
    
    // Clear any existing win state immediately if user "Skipped"
    if (winState) collectWin();

    // 1. Visual Deduct (Only if not free spin)
    if (!isFreeSpin) {
        setVisualBalance(prev => prev - currentWager);
        setLastWin(0); // Reset last win on new paid spin
    }
    
    setSpinning(true);
    setStopping(false);

    // Timings
    const minWait = isQuickSpin || isFreeSpin ? 50 : 300; // Faster start for free spins
    const holdDuration = isQuickSpin || isFreeSpin ? 200 : 2000;
    const stopTransition = isQuickSpin || isFreeSpin ? 300 : 800;

    try {
        const minSpinTime = new Promise(resolve => setTimeout(resolve, minWait));
        const spinRequest = onSpin(currentWager, isFreeSpin);
        const [result] = await Promise.all([spinRequest, minSpinTime]);
        
        setTargetIndices(result.stopIndices);
        
        // Auto stop sequence
        setTimeout(() => {
             // Triggers the CSS transition in Reel component
             setStopping(true);
             
             // Wait for Reel CSS transition then finish
             setTimeout(() => {
                 setSpinning(false);
                 setStopping(false);
                 
                 // Handle Free Spins Trigger
                 if (result.freeSpinsWon > 0) {
                     // If we are already in bonus mode, this is a re-trigger
                     const isRetrigger = isBonusActive;
                     setFreeSpinsRemaining(prev => prev + result.freeSpinsWon);
                     
                     // Even on trigger, pay out line wins if any
                     const winAmount = result.totalWin;
                     
                     if (!isRetrigger) {
                         // Start Bonus Mode
                         setIsBonusActive(true);
                         setBonusWinTotal(0);
                         triggerWinCelebration(winAmount, true, "BONUS TRIGGERED!");
                     } else {
                         triggerWinCelebration(winAmount, true, "RE-TRIGGER! +10 SPINS");
                     }
                     
                     if (winAmount > 0) setLastWin(winAmount);
                 } 
                 // Handle Regular Wins
                 else if (result.totalWin > 0) {
                     const winText = result.bonusText ? result.bonusText : "";
                     triggerWinCelebration(result.totalWin, result.isBigWin, winText);
                     setLastWin(result.totalWin);
                 }
                 
                 // Decrement Free Spin Counter after spin completes
                 if (isFreeSpin) {
                     setFreeSpinsRemaining(prev => Math.max(0, prev - 1));
                 }

             }, stopTransition); 

        }, holdDuration);
        
    } catch (e) {
        console.error(e);
        setSpinning(false);
        setStopping(false);
        // Sync back on error
        setVisualBalance(balance); 
    }
  };

  // --- Auto-Play Bonus Logic ---
  useEffect(() => {
      // Logic: If Bonus Active, spins remaining, and state is idle -> Trigger next spin
      if (isBonusActive && freeSpinsRemaining > 0 && !spinning && !stopping && !winState) {
          bonusTimerRef.current = setTimeout(() => {
              executeSpin(true); // Call as free spin
          }, 1000); // 1s delay between spins
      }
      // Logic: Bonus Active, NO spins remaining, and state is idle -> End Bonus
      else if (isBonusActive && freeSpinsRemaining === 0 && !spinning && !stopping && !winState) {
           // Bonus Finished
           setIsBonusActive(false);
           
           // Show Summary
           // This triggers the celebration, which then calls collectWin to update Visual Balance
           triggerWinCelebration(bonusWinTotal, true, "TOTAL BONUS WIN");
           setLastWin(bonusWinTotal);
           
           setBonusWinTotal(0); // Reset accumulator
      }
      
      return () => {
          if (bonusTimerRef.current) clearTimeout(bonusTimerRef.current);
      }
  }, [isBonusActive, freeSpinsRemaining, spinning, stopping, winState, bonusWinTotal]);


  const handleClick = () => {
      // 1. Skill Stop
      if (spinning && !stopping) {
          setStopping(true);
          return;
      } 
      
      // 2. Start Spin (works even if celebrating - "Fast Play")
      if (!spinning && !isBonusActive) {
          executeSpin(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
        
        {/* Game Frame */}
        <div 
            className={`
                relative w-full max-w-5xl aspect-[4/5] sm:aspect-[4/3] md:aspect-[16/9] 
                bg-slate-900 rounded-3xl border-4 shadow-2xl flex flex-col overflow-hidden transition-colors duration-500 
                ${isBonusActive ? 'border-yellow-500 shadow-yellow-500/20' : 'border-indigo-500/50'}
            `}
        >
            {/* Bonus Mode Indicator Overlay */}
            {isBonusActive && (
                 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 animate-shimmer z-30"></div>
            )}

            {/* Pause Overlay */}
            {isPaused && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <div className="text-6xl mb-4">⏸️</div>
                    <h2 className="text-3xl font-bold text-white font-display">GAME PAUSED</h2>
                    <p className="text-slate-300 mt-2">Close the sidebar to resume playing.</p>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex-none h-16 bg-slate-800/80 border-b border-indigo-500/30 flex justify-between items-center px-6 z-20 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} disabled={spinning || isBonusActive} className="p-2 hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50">
                        <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-white font-display uppercase tracking-wider hidden sm:block shadow-black drop-shadow-md">{game.title}</h2>
                </div>
                
                {/* Center Message for Bonus */}
                {isBonusActive && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 bg-yellow-600 px-4 py-1 rounded-full border border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse">
                        <span className="font-bold text-white font-display tracking-widest text-sm">BONUS MODE ACTIVE</span>
                    </div>
                )}

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
            <div className={`flex-1 relative p-4 sm:p-8 flex items-center justify-center gap-2 sm:gap-4 overflow-hidden bg-black`}>
                {/* Payline Indicators */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-yellow-400/20 pointer-events-none z-0"></div>

                {/* Win Celebration Overlay */}
                {winState && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 animate-in fade-in zoom-in duration-300 pointer-events-none">
                        <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce font-display mb-2 text-center leading-none">
                            {winState.text}
                        </h1>
                        <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-md">
                            {currency === 'GC' ? Math.floor(winState.amount).toLocaleString() : winState.amount.toFixed(2)}
                        </div>
                    </div>
                )}

                {/* The Reels */}
                {reelStrips.map((strip, i) => (
                    <div key={i} className={`flex-1 h-full max-w-[200px] relative bg-slate-900 rounded-lg overflow-hidden transition-all duration-300 ${isBonusActive ? 'border border-yellow-500/30 shadow-[inset_0_0_20px_rgba(234,179,8,0.1)]' : ''}`}>
                        <SlotReel 
                            symbols={strip} 
                            targetIndex={targetIndices[i]} 
                            isSpinning={spinning && !stopping} 
                            reelIndex={i}
                            quickSpin={isQuickSpin || isBonusActive}
                        />
                    </div>
                ))}
            </div>

            {/* Bottom Controls */}
            <div className="flex-none h-24 bg-slate-800/90 backdrop-blur-md border-t border-indigo-500/30 flex items-center justify-between px-4 sm:px-8 gap-4 z-20">
                
                {/* Wager Controls */}
                <div className="flex flex-col items-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Bet</div>
                    <div className={`flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1 shadow-inner ${isBonusActive ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
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

                {/* Spin Area / Bonus Counter */}
                <div className="flex-1 max-w-xs h-16 flex items-center gap-3">
                    
                    {isBonusActive ? (
                         <div className="w-full h-full bg-slate-900 border-2 border-yellow-500 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.2)] relative overflow-hidden">
                             <div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div>
                             <span className="text-yellow-500 font-bold text-xs uppercase tracking-widest relative z-10">Free Spins</span>
                             <span className="text-3xl font-black text-white relative z-10 tabular-nums">{freeSpinsRemaining}</span>
                         </div>
                    ) : (
                        <>
                            {/* Quick Spin Toggle */}
                            <button 
                                onClick={() => setIsQuickSpin(p => !p)}
                                disabled={spinning}
                                className={`
                                    h-10 w-10 rounded-full flex items-center justify-center border transition-all duration-200 shadow-md
                                    ${isQuickSpin 
                                        ? 'bg-yellow-500 border-yellow-300 text-slate-900 shadow-yellow-500/50' 
                                        : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'}
                                `}
                                title="Quick Spin"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                            </button>

                            <button 
                                onClick={handleClick}
                                className={`
                                    flex-1 h-full rounded-2xl font-black text-2xl tracking-widest uppercase shadow-lg
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
                        </>
                    )}
                </div>

                {/* Win Display */}
                <div className="flex flex-col items-end min-w-[100px] hidden sm:flex">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                        {isBonusActive ? 'Bonus Win' : 'Win'}
                    </div>
                    <div className={`text-2xl font-bold font-display tabular-nums ${isBonusActive ? 'text-yellow-400 animate-pulse' : 'text-yellow-400'}`}>
                        {isBonusActive 
                            ? (currency === 'GC' ? Math.floor(bonusWinTotal).toLocaleString() : bonusWinTotal.toFixed(2))
                            : (winState 
                                ? (currency === 'GC' ? Math.floor(winState.amount).toLocaleString() : winState.amount.toFixed(2)) 
                                : (lastWin > 0 ? (currency === 'GC' ? Math.floor(lastWin).toLocaleString() : lastWin.toFixed(2)) : 0)
                            )
                        }
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
            @keyframes shimmer {
                0% { background-position: -1000px 0; }
                100% { background-position: 1000px 0; }
            }
            .animate-shimmer {
                background: linear-gradient(to right, #eab308 4%, #ef4444 25%, #eab308 36%);
                background-size: 1000px 100%;
                animation: shimmer 2s infinite linear;
            }
        `}</style>
    </div>
  );
};

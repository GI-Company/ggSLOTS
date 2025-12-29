
import React, { useState, useEffect, useRef } from 'react';
import { GameConfig, CurrencyType, WinResult, UserProfile } from '../types';
import { GAME_DATA, WAGER_LEVELS } from '../constants';
import { SlotReel } from './SlotReel';
import { GameRulesModal } from './Modals';

interface SlotGameProps {
  game: GameConfig;
  currency: CurrencyType;
  balance: number;
  user: UserProfile | null;
  onClose: () => void;
  onSpin: (wager: number, isFreeSpin: boolean) => Promise<WinResult>;
  isPaused: boolean;
}

export const SlotGame: React.FC<SlotGameProps> = ({ game, currency, balance, user, onClose, onSpin, isPaused }) => {
  const [wagerIndex, setWagerIndex] = useState(3);
  const [spinning, setSpinning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [targetIndices, setTargetIndices] = useState([0, 0, 0]);
  const [isQuickSpin, setIsQuickSpin] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  // Bonus Game State
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [bonusWinTotal, setBonusWinTotal] = useState(0);

  // Local Visual Balance
  const [visualBalance, setVisualBalance] = useState(balance);
  const [winState, setWinState] = useState<{ amount: number; text: string } | null>(null);
  const [lastWin, setLastWin] = useState(0);
  
  const winTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bonusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWinAmount = useRef<number>(0);

  const currentWager = WAGER_LEVELS[currency][wagerIndex];
  const gameAssets = GAME_DATA[game.id] || GAME_DATA['default'];
  const reelStrips = gameAssets.strips;

  // Background style from config or fallback
  const backgroundStyle = game.style?.background ? { backgroundImage: `url(${game.style.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#0f172a' };
  const accentColor = game.style?.accentColor || '#6366f1';

  useEffect(() => {
    if (!spinning && !stopping && !winState && !isBonusActive) {
        setVisualBalance(balance);
    }
  }, [balance, spinning, stopping, winState, isBonusActive]);

  useEffect(() => {
    setTargetIndices(reelStrips.map(strip => Math.floor(Math.random() * strip.length)));
  }, [game.id]);

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
      const duration = isQuickSpin || (isBonusActive && freeSpinsRemaining > 0) ? 800 : 3000;
      winTimerRef.current = setTimeout(() => { collectWin(); }, duration);
  };

  const collectWin = () => {
      if (winTimerRef.current) clearTimeout(winTimerRef.current);
      winTimerRef.current = null;
      const amount = pendingWinAmount.current;
      if (amount > 0) {
          if (isBonusActive) { setBonusWinTotal(prev => prev + amount); } 
          else { setVisualBalance(prev => prev + amount); }
          pendingWinAmount.current = 0;
      }
      setWinState(null);
  };

  const executeSpin = async (isFreeSpin: boolean = false) => {
    if (!isFreeSpin && balance < currentWager) { alert("Insufficient Balance!"); return; }
    if (winState) collectWin();
    if (!isFreeSpin) { setVisualBalance(prev => prev - currentWager); setLastWin(0); }
    
    setSpinning(true); setStopping(false);
    const minWait = isQuickSpin || isFreeSpin ? 50 : 300; 
    const holdDuration = isQuickSpin || isFreeSpin ? 200 : 2000;
    const stopTransition = isQuickSpin || isFreeSpin ? 300 : 800;

    try {
        const minSpinTime = new Promise(resolve => setTimeout(resolve, minWait));
        const spinRequest = onSpin(currentWager, isFreeSpin);
        const [result] = await Promise.all([spinRequest, minSpinTime]);
        
        setTargetIndices(result.stopIndices);
        
        setTimeout(() => {
             setStopping(true);
             setTimeout(() => {
                 setSpinning(false); setStopping(false);
                 if (result.freeSpinsWon > 0) {
                     const isRetrigger = isBonusActive;
                     setFreeSpinsRemaining(prev => prev + result.freeSpinsWon);
                     const winAmount = result.totalWin;
                     if (!isRetrigger) { setIsBonusActive(true); setBonusWinTotal(0); triggerWinCelebration(winAmount, true, "BONUS TRIGGERED!"); } 
                     else { triggerWinCelebration(winAmount, true, "RE-TRIGGER! +10 SPINS"); }
                     if (winAmount > 0) setLastWin(winAmount);
                 } else if (result.totalWin > 0) {
                     const winText = result.bonusText ? result.bonusText : "";
                     triggerWinCelebration(result.totalWin, result.isBigWin, winText);
                     setLastWin(result.totalWin);
                 }
                 if (isFreeSpin) { setFreeSpinsRemaining(prev => Math.max(0, prev - 1)); }
             }, stopTransition); 
        }, holdDuration);
    } catch (e) {
        console.error(e);
        setSpinning(false); setStopping(false); setVisualBalance(balance); 
    }
  };

  useEffect(() => {
      if (isBonusActive && freeSpinsRemaining > 0 && !spinning && !stopping && !winState) {
          bonusTimerRef.current = setTimeout(() => { executeSpin(true); }, 1000); 
      } else if (isBonusActive && freeSpinsRemaining === 0 && !spinning && !stopping && !winState) {
           setIsBonusActive(false);
           triggerWinCelebration(bonusWinTotal, true, "TOTAL BONUS WIN");
           setLastWin(bonusWinTotal);
           setBonusWinTotal(0); 
      }
      return () => { if (bonusTimerRef.current) clearTimeout(bonusTimerRef.current); }
  }, [isBonusActive, freeSpinsRemaining, spinning, stopping, winState, bonusWinTotal]);

  const handleClick = () => {
      if (spinning && !stopping) { setStopping(true); return; } 
      if (!spinning && !isBonusActive) { executeSpin(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
        {showRules && <GameRulesModal onClose={() => setShowRules(false)} gameTitle={game.title} />}
        
        <div className={`relative w-full max-w-5xl aspect-[4/5] sm:aspect-[4/3] md:aspect-[16/9] bg-slate-900 rounded-3xl border-4 shadow-2xl flex flex-col overflow-hidden transition-colors duration-500 ${isBonusActive ? 'border-yellow-500 shadow-yellow-500/20' : ''}`} style={{ borderColor: isBonusActive ? '#eab308' : accentColor }}>
            {isBonusActive && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 animate-shimmer z-30"></div>}
            
            {/* DEMO / GUEST BANNER */}
            {(user?.isGuest || currency === 'GC') && (
                <div className="bg-yellow-500/90 text-black text-[10px] sm:text-xs font-bold text-center py-1 uppercase tracking-widest z-30">
                    {user?.isGuest ? "GUEST MODE - PROGRESS NOT SAVED" : "FUN PLAY MODE - NO REAL PRIZES"}
                </div>
            )}

            {isPaused && <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"><h2 className="text-3xl font-bold text-white font-display">GAME PAUSED</h2></div>}

            <div className="flex-none h-16 bg-slate-950/80 border-b flex justify-between items-center px-6 z-20 backdrop-blur-md" style={{ borderColor: `${accentColor}30` }}>
                <div className="flex items-center gap-2">
                    <button onClick={onClose} disabled={spinning || isBonusActive} className="p-2 hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50">
                        <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => setShowRules(true)} className="w-8 h-8 rounded-full border border-slate-500 flex items-center justify-center text-slate-400 font-serif font-bold hover:text-white hover:border-white transition-colors">i</button>
                    <h2 className="text-xl font-bold text-white font-display uppercase tracking-wider hidden sm:block shadow-black drop-shadow-md ml-2">{game.title}</h2>
                </div>
                {isBonusActive && <div className="absolute left-1/2 transform -translate-x-1/2 bg-yellow-600 px-4 py-1 rounded-full border border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse"><span className="font-bold text-white font-display tracking-widest text-sm">BONUS MODE ACTIVE</span></div>}
                <div className="flex gap-4 text-sm font-bold"><div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-700 shadow-inner"><span className="text-slate-500 mr-2">BAL</span><span className="text-white tabular-nums">{currency === 'GC' ? Math.floor(visualBalance).toLocaleString() : visualBalance.toFixed(2)}</span></div></div>
            </div>

            <div className={`flex-1 relative p-4 sm:p-8 flex items-center justify-center gap-2 sm:gap-4 overflow-hidden bg-black`} style={backgroundStyle}>
                <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none"></div>
                <div className="absolute top-1/2 left-0 w-full h-1 bg-yellow-400/20 pointer-events-none z-0"></div>
                
                {winState && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 animate-in fade-in zoom-in duration-300 pointer-events-none">
                        <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce font-display mb-2 text-center leading-none">{winState.text}</h1>
                        <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-md">{currency === 'GC' ? Math.floor(winState.amount).toLocaleString() : winState.amount.toFixed(2)}</div>
                    </div>
                )}
                
                {reelStrips.map((strip, i) => (
                    <div key={i} className={`flex-1 h-full max-w-[200px] relative bg-slate-950/80 rounded-lg overflow-hidden transition-all duration-300 z-10 ${isBonusActive ? 'border border-yellow-500/30 shadow-[inset_0_0_20px_rgba(234,179,8,0.1)]' : ''}`}>
                        <SlotReel symbols={strip} targetIndex={targetIndices[i]} isSpinning={spinning && !stopping} reelIndex={i} quickSpin={isQuickSpin || isBonusActive}/>
                    </div>
                ))}
            </div>

            <div className="flex-none h-24 bg-slate-900/90 backdrop-blur-md border-t flex items-center justify-between px-4 sm:px-8 gap-4 z-20" style={{ borderColor: `${accentColor}30` }}>
                <div className="flex flex-col items-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Bet</div>
                    <div className={`flex items-center bg-slate-950 rounded-lg border border-slate-700 p-1 shadow-inner ${isBonusActive ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <button disabled={spinning || wagerIndex === 0} onClick={() => setWagerIndex(i => i - 1)} className="w-10 h-8 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold transition-colors">-</button>
                        <div className="w-24 text-center font-bold text-white tabular-nums">{currency === 'GC' ? currentWager.toLocaleString() : currentWager.toFixed(2)}</div>
                        <button disabled={spinning || wagerIndex === WAGER_LEVELS[currency].length - 1} onClick={() => setWagerIndex(i => i + 1)} className="w-10 h-8 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 text-white font-bold transition-colors">+</button>
                    </div>
                </div>

                <div className="flex-1 max-w-xs h-16 flex items-center gap-3">
                    {isBonusActive ? (<div className="w-full h-full bg-slate-900 border-2 border-yellow-500 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.2)] relative overflow-hidden"><div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div><span className="text-yellow-500 font-bold text-xs uppercase tracking-widest relative z-10">Free Spins</span><span className="text-3xl font-black text-white relative z-10 tabular-nums">{freeSpinsRemaining}</span></div>) : (
                        <>
                            <button onClick={() => setIsQuickSpin(p => !p)} disabled={spinning} className={`h-10 w-10 rounded-full flex items-center justify-center border transition-all duration-200 shadow-md ${isQuickSpin ? 'bg-yellow-500 border-yellow-300 text-slate-900 shadow-yellow-500/50' : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'}`} title="Quick Spin"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></button>
                            <button onClick={handleClick} className={`flex-1 h-full rounded-2xl font-black text-2xl tracking-widest uppercase shadow-lg transition-all duration-100 transform active:scale-[0.98] flex items-center justify-center relative overflow-hidden group ${spinning && !stopping ? 'bg-red-600 text-white shadow-red-500/30 hover:bg-red-500' : spinning ? 'bg-slate-700 text-slate-500 cursor-wait' : 'bg-gradient-to-b from-green-400 to-green-600 text-white shadow-green-500/30 hover:shadow-green-500/50 hover:brightness-110'}`}>{!spinning && <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] group-hover:animate-shine" />}{spinning && !stopping ? <span>STOP</span> : spinning ? <div className="w-6 h-6 border-4 border-slate-500 border-t-white rounded-full animate-spin"></div> : 'SPIN'}</button>
                        </>
                    )}
                </div>

                <div className="flex flex-col items-end min-w-[100px] hidden sm:flex">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">{isBonusActive ? 'Bonus Win' : 'Win'}</div>
                    <div className={`text-2xl font-bold font-display tabular-nums ${isBonusActive ? 'text-yellow-400 animate-pulse' : 'text-yellow-400'}`}>{isBonusActive ? (currency === 'GC' ? Math.floor(bonusWinTotal).toLocaleString() : bonusWinTotal.toFixed(2)) : (winState ? (currency === 'GC' ? Math.floor(winState.amount).toLocaleString() : winState.amount.toFixed(2)) : (lastWin > 0 ? (currency === 'GC' ? Math.floor(lastWin).toLocaleString() : lastWin.toFixed(2)) : 0))}</div>
                </div>
            </div>
        </div>
        <style>{` @keyframes shine { 0% { left: -50%; } 100% { left: 150%; } } .group-hover\\:animate-shine { animation: shine 1s linear infinite; } @keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } } .animate-shimmer { background: linear-gradient(to right, #eab308 4%, #ef4444 25%, #eab308 36%); background-size: 1000px 100%; animation: shimmer 2s infinite linear; } `}</style>
    </div>
  );
};

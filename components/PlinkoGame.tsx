
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameConfig, CurrencyType, WinResult, UserProfile } from '../types';
import { WAGER_LEVELS } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { GameRulesModal } from './Modals';

interface PlinkoGameProps {
  game: GameConfig;
  currency: CurrencyType;
  balance: number;
  user: UserProfile | null;
  onClose: () => void;
  onSpin: (wager: number, isFreeSpin: boolean, plinkoConfig: { rows: number, risk: 'Low' | 'Medium' | 'High' }) => Promise<WinResult>;
  isPaused: boolean;
  onVisualBalanceChange: (balance: number | null) => void;
}

interface Trail {
    x: number;
    y: number;
    opacity: number;
}

interface Ball {
  id: number;
  path: number[];
  currentStep: number;
  progress: number;
  finished: boolean;
  rotation: number;
  winAmount: number;
  multiplier: number;
  trails: Trail[];
}

interface ActivePeg {
  r: number;
  c: number;
  opacity: number;
}

export const PlinkoGame: React.FC<PlinkoGameProps> = ({ game, currency, balance, user, onClose, onSpin, isPaused, onVisualBalanceChange }) => {
  const [wagerIndex, setWagerIndex] = useState(3);
  const [rowCount, setRowCount] = useState<number>(12); 
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  
  const [optimisticDebit, setOptimisticDebit] = useState(0);
  const [pendingWins, setPendingWins] = useState(0);
  const [lastWin, setLastWin] = useState<{ amount: number; multiplier: number } | null>(null);
  
  // UI State
  const [showRules, setShowRules] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false); // Mobile Drawer State

  const visualBalance = balance - pendingWins - optimisticDebit;

  // Theming Logic - Gradient definitions for balls
  const theme = useMemo(() => {
     if (game.id === 'plinko-x') return { 
         title: 'PLINKO X', 
         color: 'text-red-500', 
         ballGradient: 'from-red-500 to-orange-600', 
         border: 'border-red-500/50', 
         bucket: 'red',
         pegColor: 'bg-red-400',
         glow: 'shadow-[0_0_15px_rgba(239,68,68,0.6)]'
     };
     if (game.id === 'plinko-party') return { 
         title: 'PLINKO PARTY', 
         color: 'text-purple-500', 
         ballGradient: 'from-fuchsia-500 to-indigo-500', 
         border: 'border-purple-500/50', 
         bucket: 'purple',
         pegColor: 'bg-purple-400',
         glow: 'shadow-[0_0_15px_rgba(168,85,247,0.6)]'
     };
     return { 
         title: 'PLINKO', 
         color: 'text-pink-500', 
         ballGradient: 'from-pink-400 to-rose-500', 
         border: 'border-pink-500/50', 
         bucket: 'pink',
         pegColor: 'bg-slate-400',
         glow: 'shadow-[0_0_10px_rgba(244,114,182,0.4)]'
     };
  }, [game.id]);

  useEffect(() => {
     onVisualBalanceChange(visualBalance);
     return () => onVisualBalanceChange(null);
  }, [visualBalance, onVisualBalanceChange]);

  const multipliers = useMemo(() => {
      return supabaseService.game.getPlinkoMultipliers(rowCount, riskLevel);
  }, [rowCount, riskLevel]);
  
  const gameStateRef = useRef({ balls: [] as Ball[], pegs: [] as ActivePeg[] });
  const [renderState, setRenderState] = useState(gameStateRef.current);
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const ballIdCounter = useRef(0);

  const currentWager = WAGER_LEVELS[currency][wagerIndex];

  // Canvas / Coordinate Logic
  const startX = 50; 
  const startY = 10; 
  const rowHeight = 75 / rowCount; 
  const colSpacing = 60 / rowCount;

  const dropBall = async () => {
      if (visualBalance < currentWager) { alert("Insufficient funds"); return; }
      setOptimisticDebit(prev => prev + currentWager);
      try {
          const wagerForThisDrop = currentWager;
          const winResult = await onSpin(wagerForThisDrop, false, { rows: rowCount, risk: riskLevel });
          const outcome = winResult.plinkoOutcome;
          if (outcome) {
              const winAmount = winResult.totalWin;
              setOptimisticDebit(prev => prev - wagerForThisDrop);
              setPendingWins(prev => prev + winAmount);
              const newBall: Ball = { 
                  id: ballIdCounter.current++, 
                  path: outcome.path, 
                  currentStep: 0, 
                  progress: 0, 
                  finished: false, 
                  rotation: Math.random() * 360, 
                  winAmount: winAmount, 
                  multiplier: outcome.multiplier,
                  trails: [] 
              };
              gameStateRef.current.balls.push(newBall);
              gameStateRef.current.pegs.push({ r: 0, c: 0, opacity: 1.0 });
          }
      } catch (e) {
          console.error(e);
          setOptimisticDebit(prev => prev - currentWager);
      }
  };

  const updatePhysics = (deltaTime: number) => {
      const state = gameStateRef.current;
      const speed = (0.0035 * (12 / rowCount)) * deltaTime; 
      let ballsFinishedThisFrame: Ball[] = [];

      state.balls.forEach(ball => {
          if (ball.finished) return;
          
          // Current Position Logic for Trails
          const r = ball.currentStep;
          const c = ball.path.slice(0, ball.currentStep).reduce((a, b) => a + b, 0); 
          const startPos = getCoordinates(r, c);
          const nextDir = ball.path[ball.currentStep] || 0; 
          const endPos = getCoordinates(r + 1, c + nextDir);
          const p = ball.progress;
          const cx = startPos.x + (endPos.x - startPos.x) * p;
          const cy = startPos.y + (endPos.y - startPos.y) * (p * p) - Math.sin(p * Math.PI) * (20 / rowCount);

          // Add Trail
          if (Math.random() > 0.6) {
              ball.trails.push({ x: cx, y: cy, opacity: 0.5 });
          }

          ball.progress += speed;
          ball.rotation += 15 * deltaTime * (nextDir === 1 ? 1 : -1);
          
          if (ball.progress >= 1) {
              ball.progress = 0;
              ball.currentStep++;
              if (ball.currentStep >= rowCount) {
                  ball.finished = true;
                  ballsFinishedThisFrame.push(ball);
              } else {
                  const col = ball.path.slice(0, ball.currentStep).reduce((a, b) => a + b, 0);
                  state.pegs.push({ r: ball.currentStep, c: col, opacity: 1.0 });
              }
          }

          // Fade Trails
          ball.trails.forEach(t => t.opacity -= 0.05);
          ball.trails = ball.trails.filter(t => t.opacity > 0);
      });

      if (ballsFinishedThisFrame.length > 0) {
          let totalReleasedWin = 0;
          let latestWinInfo = null;
          ballsFinishedThisFrame.forEach(ball => {
               totalReleasedWin += ball.winAmount;
               if (ball.winAmount > 0) latestWinInfo = { amount: ball.winAmount, multiplier: ball.multiplier };
          });
          if (totalReleasedWin > 0) setPendingWins(prev => prev - totalReleasedWin);
          if (latestWinInfo) {
               setLastWin(latestWinInfo);
               setTimeout(() => setLastWin(null), 1500);
          }
      }
      state.balls = state.balls.filter(b => !b.finished);
      state.pegs.forEach(peg => { peg.opacity -= 0.05 * (deltaTime / 16); });
      state.pegs = state.pegs.filter(p => p.opacity > 0);
  };

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      const clampedDelta = Math.min(deltaTime, 50); 
      if (!isPaused) { updatePhysics(clampedDelta); setRenderState({ ...gameStateRef.current }); }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [currentWager, isPaused, rowCount, riskLevel]); 

  const getCoordinates = (r: number, c: number) => {
      const xOffset = (c - r / 2) * colSpacing;
      return { x: startX + xOffset, y: startY + r * rowHeight };
  };

  const renderPegs = () => {
      const pegs = [];
      for (let r = 0; r <= rowCount; r++) {
          for (let c = 0; c <= r; c++) {
              const { x, y } = getCoordinates(r, c);
              const active = renderState.pegs.find(p => p.r === r && p.c === c);
              if (r < rowCount) {
                  const pegSize = rowCount > 12 ? 'w-1 h-1' : 'w-2 h-2';
                  pegs.push(
                    <div key={`peg-${r}-${c}`} className="absolute w-0 h-0" style={{ left: `${x}%`, top: `${y}%` }}>
                         <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${pegSize} rounded-full shadow-sm transition-colors duration-300 ${theme.pegColor} opacity-50`} />
                         <div className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full blur-md bg-white transition-opacity duration-75`} style={{ opacity: active ? active.opacity : 0 }} />
                    </div>
                  );
              }
          }
      }
      return pegs;
  };

  const renderBuckets = () => multipliers.map((mult, i) => {
      const { x, y } = getCoordinates(rowCount, i);
      const center = rowCount / 2;
      const dist = Math.abs(i - center);
      const ratio = dist / (rowCount / 2);
      let colorClass = ratio < 0.3 ? 'bg-green-500' : ratio < 0.7 ? 'bg-yellow-500' : ratio < 0.9 ? 'bg-orange-500' : 'bg-red-600'; 
      if (theme.bucket === 'purple') {
          colorClass = ratio < 0.3 ? 'bg-indigo-500' : ratio < 0.7 ? 'bg-purple-500' : ratio < 0.9 ? 'bg-fuchsia-600' : 'bg-pink-600';
      }
      
      let widthClass = 'w-8 h-8 text-[9px]';
      if (rowCount > 14) widthClass = 'w-3 h-5 text-[5px]'; 
      else if (rowCount > 12) widthClass = 'w-5 h-6 text-[7px]';
      
      return (
          <div key={`bucket-${i}`} className={`absolute ${widthClass} -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-sm sm:rounded-md font-bold text-slate-900 shadow-lg ${colorClass} border border-white/20 transition-all duration-300 overflow-hidden`} style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="scale-90">{mult}x</span>
          </div>
      );
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
        <div className={`relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-3xl border-4 shadow-2xl flex flex-col overflow-hidden ${theme.border} ${theme.glow}`}>
             
             {/* TOP BAR */}
             {(user?.isGuest || currency === 'GC') && (
                <div className="w-full bg-yellow-500/90 text-black text-[10px] sm:text-xs font-bold text-center py-1 uppercase tracking-widest shrink-0 z-30">
                    {user?.isGuest ? "GUEST MODE - PROGRESS NOT SAVED" : "FUN PLAY MODE - NO REAL PRIZES"}
                </div>
             )}

             {isPaused && <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"><h2 className="text-3xl font-bold text-white font-display">PAUSED</h2></div>}
             {showRules && <GameRulesModal onClose={() => setShowRules(false)} gameTitle={theme.title} />}

             <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* SETTINGS */}
                <div className={`
                    md:w-72 bg-slate-950 p-6 flex flex-col gap-6 border-r border-slate-800 z-20 
                    absolute md:relative inset-y-0 left-0 w-64 transform transition-transform duration-300
                    ${showSettingsDrawer ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="flex items-center justify-between">
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 group">
                            <svg className="w-6 h-6 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h2 className={`text-xl font-bold font-display tracking-wider ${theme.color}`}>{theme.title}</h2>
                    </div>

                    <button onClick={() => setShowSettingsDrawer(false)} className="md:hidden absolute top-4 right-4 text-slate-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Current Balance</div>
                        <div className="text-2xl font-black text-white font-display tabular-nums tracking-tight">
                            {currency === 'GC' ? Math.floor(visualBalance).toLocaleString() : visualBalance.toFixed(2)}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 font-bold uppercase block mb-2">Risk Level</label>
                            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg">
                                {(['Low', 'Medium', 'High'] as const).map(lvl => (
                                    <button key={lvl} onClick={() => setRiskLevel(lvl)} className={`py-2 rounded text-xs font-bold transition-all ${riskLevel === lvl ? `bg-slate-700 text-white shadow` : 'text-slate-400 hover:text-white'}`}>{lvl}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2"><label className="text-xs text-slate-400 font-bold uppercase block">Rows</label><span className="text-xs font-bold text-white">{rowCount}</span></div>
                            <input type="range" min="8" max="16" step="1" value={rowCount} onChange={(e) => setRowCount(parseInt(e.target.value))} className={`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-${theme.bucket}`} />
                            <div className="flex justify-between text-[10px] text-slate-600 font-bold mt-1"><span>8</span><span>12</span><span>16</span></div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold uppercase block mb-2">Bet Amount</label>
                            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-1">
                                <button disabled={wagerIndex === 0} onClick={() => setWagerIndex(i => i - 1)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 text-white font-bold">-</button>
                                <div className="flex-1 text-center font-bold text-white tabular-nums">{currency === 'GC' ? currentWager.toLocaleString() : currentWager.toFixed(2)}</div>
                                <button disabled={wagerIndex === WAGER_LEVELS[currency].length - 1} onClick={() => setWagerIndex(i => i + 1)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 text-white font-bold">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto space-y-2">
                        <button onClick={dropBall} className={`w-full py-4 text-white font-black text-xl rounded-xl shadow-lg transform active:scale-[0.98] transition-all bg-gradient-to-r ${theme.ballGradient}`}>DROP BALL</button>
                        <button onClick={() => setShowRules(true)} className="w-full py-2 text-slate-500 hover:text-white text-xs font-bold">GAME RULES & PAYOUTS</button>
                    </div>
                </div>
                
                {/* Mobile Toggle */}
                <div className="absolute top-4 left-4 md:hidden z-30">
                    <button onClick={() => setShowSettingsDrawer(true)} className="bg-slate-800 p-2 rounded-lg border border-slate-700 text-white shadow-lg">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>

                {/* GAME CANVAS */}
                <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col">
                    <div className="flex-1 relative">
                        {/* Background Effect based on Theme */}
                        <div className={`absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${game.id === 'plinko-x' ? 'from-red-900 via-slate-950 to-black' : game.id === 'plinko-party' ? 'from-indigo-900 via-slate-950 to-black' : 'from-pink-900 via-slate-950 to-black'}`}></div>
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                        
                        {renderPegs()}
                        {renderBuckets()}
                        
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
                            <button 
                                onClick={dropBall} 
                                className={`bg-gradient-to-r ${theme.ballGradient} hover:brightness-110 text-white font-black py-3 px-10 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/20`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                DROP
                            </button>
                        </div>

                        {renderState.balls.map(ball => {
                            const r = ball.currentStep;
                            const c = ball.path.slice(0, ball.currentStep).reduce((a, b) => a + b, 0); 
                            const startPos = getCoordinates(r, c);
                            const nextDir = ball.path[ball.currentStep] || 0; 
                            const endPos = getCoordinates(r + 1, c + nextDir);
                            const p = ball.progress;
                            const x = startPos.x + (endPos.x - startPos.x) * p;
                            const y = startPos.y + (endPos.y - startPos.y) * (p * p) - Math.sin(p * Math.PI) * (20 / rowCount);
                            const ballSize = rowCount > 12 ? 'w-2 h-2' : 'w-3 h-3';
                            return (
                                <React.Fragment key={ball.id}>
                                    {ball.trails.map((t, i) => (
                                        <div key={i} className={`absolute ${ballSize} rounded-full z-0`} style={{ left: `${t.x}%`, top: `${t.y}%`, transform: `translate(-50%, -50%)`, backgroundColor: theme.color.replace('text-', '').replace('500', '400'), opacity: t.opacity * 0.5 }}></div>
                                    ))}
                                    <div className={`absolute ${ballSize} bg-gradient-to-br ${theme.ballGradient} rounded-full shadow-lg z-10 will-change-transform`} style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${ball.rotation}deg)` }}>
                                        <div className="w-full h-full bg-white/30 rounded-full scale-50 ml-[1px] mt-[1px]"></div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        {lastWin && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-green-500 px-8 py-6 rounded-2xl text-center animate-in zoom-in fade-in duration-200 shadow-[0_0_50px_rgba(34,197,94,0.4)] z-50 pointer-events-none">
                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-600 font-display mb-2 drop-shadow-sm">{lastWin.multiplier}x</div>
                                <div className="text-white font-bold text-xl">+{currency === 'GC' ? Math.floor(lastWin.amount).toLocaleString() : lastWin.amount.toFixed(2)}</div>
                            </div>
                        )}
                    </div>
                </div>
             </div>
        </div>
    </div>
  );
};

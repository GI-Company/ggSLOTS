
import React, { useState, useEffect, useRef } from 'react';
import { GameConfig, CurrencyType, ScratchTicket, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';

interface ScratchGameProps {
  game: GameConfig;
  user: UserProfile;
  onClose: () => void;
  onUpdateUser: (user: UserProfile) => void;
  isPaused: boolean;
}

export const ScratchGame: React.FC<ScratchGameProps> = ({ game, user, onClose, onUpdateUser, isPaused }) => {
  const [currencyMode, setCurrencyMode] = useState<CurrencyType>(CurrencyType.GC);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<ScratchTicket | null>(null);
  const [revealedPercent, setRevealedPercent] = useState(0);
  const [isFullyRevealed, setIsFullyRevealed] = useState(false);
  const [isAutoScratching, setIsAutoScratching] = useState(false);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Canvas when ticket is loaded
  useEffect(() => {
    if (ticket && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset state
        setIsFullyRevealed(false);
        setIsAutoScratching(false);
        setRevealedPercent(0);

        // Draw Scratch Layer
        ctx.globalCompositeOperation = 'source-over';
        
        // Create Gradient for the foil
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (ticket.currency === CurrencyType.GC) {
            gradient.addColorStop(0, '#f59e0b'); // Amber
            gradient.addColorStop(0.5, '#fcd34d');
            gradient.addColorStop(1, '#d97706');
        } else {
            gradient.addColorStop(0, '#10b981'); // Emerald
            gradient.addColorStop(0.5, '#34d399');
            gradient.addColorStop(1, '#059669');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add Pattern/Text
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=0; i<20; i++) {
            ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 50, 50);
        }

        ctx.fillStyle = '#000';
        ctx.font = 'bold 30px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ticket.currency === 'GC' ? 'GOLD COINS' : 'SWEEPS CASH', canvas.width/2, canvas.height/2);
        
        ctx.font = 'bold 16px Inter';
        ctx.fillText('SCRATCH TO REVEAL', canvas.width/2, canvas.height/2 + 30);
    }
  }, [ticket]);

  // Scratch Logic
  const handleScratch = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ticket || isFullyRevealed || isAutoScratching || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        if (e.buttons !== 1) return; // Only scratch on click-drag
        x = (e as React.MouseEvent).clientX - rect.left;
        y = (e as React.MouseEvent).clientY - rect.top;
    }

    // Adjust for canvas scale
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    x *= scaleX;
    y *= scaleY;

    // Erase
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Check Progress (throttled)
    if (Math.random() < 0.1) {
        checkRevealProgress();
    }
  };

  const checkRevealProgress = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Sample pixels to see how much alpha is 0
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let transparent = 0;
      
      // Check every 10th pixel for performance
      for (let i = 0; i < data.length; i += 40) {
          if (data[i + 3] === 0) transparent++;
      }
      
      const totalPixels = data.length / 40;
      const percent = (transparent / totalPixels) * 100;
      setRevealedPercent(percent);

      if (percent > 80 && !isFullyRevealed) {
          revealAll();
      }
  };

  const revealAll = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsFullyRevealed(true);
      setIsAutoScratching(false);
      setRevealedPercent(100);
      setCursorPos(null); // Hide cursor
  };

  const autoScratch = () => {
      if (!canvasRef.current || isFullyRevealed || isAutoScratching) return;
      
      setIsAutoScratching(true);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let count = 0;
      const maxCount = 25; // How many frames of scratching
      
      const interval = setInterval(() => {
          count++;
          ctx.globalCompositeOperation = 'destination-out';
          
          // Scratch randomly in multiple spots per frame
          for (let i = 0; i < 4; i++) {
             const x = Math.random() * canvas.width;
             const y = Math.random() * canvas.height;
             ctx.beginPath();
             ctx.arc(x, y, 50, 0, Math.PI * 2);
             ctx.fill();
          }

          if (count >= maxCount) {
              clearInterval(interval);
              revealAll();
          }
      }, 20); // Fast animation (20ms per frame)
  };

  const buyTicket = async () => {
      setLoading(true);
      setTicket(null);
      try {
          const { user: updatedUser, result } = await supabaseService.game.buyScratchTicket(user, currencyMode);
          onUpdateUser(updatedUser);
          setTicket(result.scratchOutcome || null);
      } catch (e: any) {
          alert(e.message);
      }
      setLoading(false);
  };

  const resetGame = () => {
      setTicket(null);
  };

  const renderSymbol = (sym: string) => {
      return (
          <div className="w-full h-full flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700 text-4xl shadow-inner">
              {sym}
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
         <div className="relative w-full max-w-4xl h-[90vh] bg-slate-900 rounded-3xl border-4 border-indigo-500/50 shadow-2xl flex flex-col items-center overflow-hidden">
            
             {/* DEMO / GUEST BANNER */}
             {(user.isGuest || currencyMode === 'GC') && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-500/90 text-black text-[10px] sm:text-xs font-bold text-center py-1 uppercase tracking-widest z-30">
                    {user.isGuest ? "GUEST MODE - PROGRESS NOT SAVED" : "FUN PLAY MODE - NO REAL PRIZES"}
                </div>
             )}

             {/* Header */}
             <div className="w-full h-16 sm:h-20 bg-slate-950 border-b border-indigo-900 flex justify-between items-center px-4 sm:px-6 z-20 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-lg sm:text-xl font-bold text-white font-display tracking-wider truncate">COSMIC SCRATCH</h2>
                </div>
                
                {/* Balance Display */}
                <div className="flex gap-2 sm:gap-4">
                     <div className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg border flex items-center gap-1 sm:gap-2 ${currencyMode === 'GC' ? 'bg-yellow-900/20 border-yellow-500/50' : 'bg-slate-800 border-slate-700 opacity-50'}`}>
                        <span className="text-yellow-500 font-bold text-[10px] sm:text-xs">GC</span>
                        <span className="text-white font-bold text-sm sm:text-base">{Math.floor(user.gcBalance).toLocaleString()}</span>
                     </div>
                     <div className={`hidden sm:flex px-4 py-2 rounded-lg border items-center gap-2 ${currencyMode === 'SC' ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-800 border-slate-700 opacity-50'}`}>
                        <span className="text-green-500 font-bold text-xs">SC</span>
                        <span className="text-white font-bold">{user.scBalance.toFixed(2)}</span>
                     </div>
                </div>
            </div>

            {/* Main Game Area */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-4 relative bg-[#0b0f19] overflow-y-auto">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black pointer-events-none"></div>

                {!ticket ? (
                    // BUY SCREEN
                    <div className="z-10 flex flex-col items-center gap-4 sm:gap-8 animate-in zoom-in-95 duration-300 w-full">
                         {/* Toggle Switch */}
                         <div className="flex bg-slate-950 p-1 rounded-full border border-slate-700 shadow-xl scale-90 sm:scale-100 origin-center">
                            <button 
                                onClick={() => setCurrencyMode(CurrencyType.GC)}
                                className={`px-6 sm:px-8 py-2 sm:py-3 rounded-full font-bold transition-all text-sm sm:text-base ${currencyMode === 'GC' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' : 'text-slate-500 hover:text-white'}`}
                            >
                                GOLD COINS
                            </button>
                            <div className="relative ml-1">
                                <button 
                                    disabled
                                    className="px-6 sm:px-8 py-2 sm:py-3 rounded-full font-bold transition-all text-slate-700 bg-slate-900 border border-slate-800 cursor-not-allowed text-sm sm:text-base"
                                >
                                    SWEEPS CASH
                                </button>
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-tighter shadow-sm border border-red-400 rotate-12">
                                    SOON
                                </div>
                            </div>
                         </div>

                         <div className={`
                            w-full max-w-[320px] sm:max-w-xs h-auto aspect-[3/4] sm:aspect-auto sm:w-80 sm:h-96 
                            rounded-2xl border-4 flex flex-col items-center justify-center gap-4 sm:gap-6 shadow-2xl transition-colors duration-500 p-4
                            ${currencyMode === 'GC' ? 'bg-amber-900/20 border-amber-500 shadow-amber-500/10' : 'bg-emerald-900/20 border-emerald-500 shadow-emerald-500/10'}
                         `}>
                             <div className="text-center">
                                 <div className="text-xs sm:text-sm font-bold uppercase text-slate-400 mb-1">Ticket Cost</div>
                                 <div className={`text-3xl sm:text-4xl font-black font-display ${currencyMode === 'GC' ? 'text-yellow-400' : 'text-green-400'}`}>
                                     {currencyMode === 'GC' ? '500 GC' : '1.00 SC'}
                                 </div>
                             </div>

                             <div className="text-center space-y-1">
                                 <div className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold">Top Prize</div>
                                 <div className="text-xl sm:text-2xl font-bold text-white">
                                     {currencyMode === 'GC' ? '1,000,000 GC' : '500.00 SC'}
                                 </div>
                             </div>

                             <button 
                                onClick={buyTicket}
                                disabled={loading}
                                className={`
                                    w-full sm:w-64 py-3 sm:py-4 rounded-xl font-black text-lg sm:text-xl shadow-lg transform active:scale-95 transition-all
                                    ${currencyMode === 'GC' ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-green-600 hover:bg-green-500 text-white'}
                                    disabled:opacity-50 disabled:grayscale
                                `}
                             >
                                 {loading ? 'PURCHASING...' : 'BUY TICKET'}
                             </button>
                         </div>
                    </div>
                ) : (
                    // SCRATCH SCREEN
                    <div className="relative z-10 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                        <div 
                            ref={containerRef}
                            className={`relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-xl overflow-hidden shadow-2xl border-4 ${ticket.currency === 'GC' ? 'border-amber-500' : 'border-emerald-500'} cursor-none touch-none`}
                            onMouseMove={(e) => setCursorPos({x: e.clientX, y: e.clientY})}
                            onTouchMove={(e) => setCursorPos({x: e.touches[0].clientX, y: e.touches[0].clientY})}
                            onMouseLeave={() => setCursorPos(null)}
                        >
                            {/* Underlying Grid (The Prize) */}
                            <div className="absolute inset-0 bg-slate-900 p-2 grid grid-cols-3 gap-2">
                                {ticket.grid.map((sym, i) => (
                                    <div key={i} className="flex items-center justify-center bg-slate-800 rounded text-2xl sm:text-4xl shadow-inner border border-slate-700/50">
                                        {sym}
                                    </div>
                                ))}
                            </div>

                            {/* Canvas Layer (The Foil) */}
                            <canvas 
                                ref={canvasRef}
                                width={320}
                                height={320}
                                className={`absolute inset-0 w-full h-full cursor-none touch-none transition-opacity duration-1000 ${isFullyRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                onMouseMove={handleScratch}
                                onTouchMove={handleScratch}
                                onMouseDown={handleScratch}
                            />

                            {/* Custom Coin Cursor */}
                            {cursorPos && !isFullyRevealed && (
                                <div 
                                    className="fixed pointer-events-none z-[100] w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white/80"
                                    style={{ 
                                        left: cursorPos.x, 
                                        top: cursorPos.y,
                                        transform: 'translate(-50%, -50%)',
                                        mixBlendMode: 'difference' 
                                    }}
                                >
                                    <div className="w-8 h-8 rounded-full border border-black/30"></div>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-4">
                            {!isFullyRevealed ? (
                                <button 
                                    onClick={autoScratch}
                                    disabled={isAutoScratching}
                                    className="px-5 py-2 sm:px-6 sm:py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full font-bold text-white transition-colors flex items-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-wait text-[10px] sm:text-sm"
                                >
                                    {isAutoScratching ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            SCRATCHING...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            AUTO SCRATCH
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button 
                                    onClick={resetGame}
                                    className="px-6 py-2 sm:px-8 sm:py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-black text-white shadow-lg animate-pulse text-sm sm:text-base"
                                >
                                    PLAY AGAIN
                                </button>
                            )}
                        </div>

                        {/* Win Notification */}
                        {isFullyRevealed && ticket.isWin && (
                             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 w-full text-center">
                                <h1 className={`text-4xl sm:text-6xl font-black drop-shadow-[0_5px_5px_rgba(0,0,0,1)] animate-bounce font-display ${ticket.currency === 'GC' ? 'text-yellow-400' : 'text-green-400'}`}>
                                    WINNER!
                                </h1>
                                <div className="text-2xl sm:text-4xl font-bold text-white drop-shadow-md mt-2">
                                     +{ticket.currency === 'GC' ? ticket.prize.toLocaleString() : ticket.prize.toFixed(2)} {ticket.currency}
                                </div>
                             </div>
                        )}
                    </div>
                )}
            </div>
         </div>
    </div>
  );
};

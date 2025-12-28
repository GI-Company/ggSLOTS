
import React from 'react';
import { Symbol } from './Symbol';

interface SlotReelProps {
  symbols: string[];
  targetIndex: number;
  isSpinning: boolean;
  reelIndex: number;
  quickSpin: boolean;
}

export const SlotReel: React.FC<SlotReelProps> = ({ symbols, targetIndex, isSpinning, reelIndex, quickSpin }) => {
  // We replicate the strip 3 times to allow for smooth looping and buffer
  const displaySymbols = [...symbols, ...symbols, ...symbols];
  const stripLength = symbols.length;
  
  // The container holds 'totalLength' symbols.
  const totalLength = displaySymbols.length;
  const symbolHeightPercent = 100 / totalLength;

  // ANIMATION LOGIC:
  // 1. Spinning State: Translate from 0% to -33.33% (one full set).
  // 2. Stopped State: Translate to the exact target in the middle set.
  const finalIndex = stripLength + targetIndex;
  const finalTranslateY = -(finalIndex * symbolHeightPercent);

  // Quick Spin timings vs Normal
  const baseDuration = quickSpin ? 0.15 : 0.8;
  const stagger = quickSpin ? 0.05 : 0.2;
  const transitionDuration = baseDuration + (reelIndex * stagger);

  return (
    <div className="relative overflow-hidden w-full h-full bg-slate-900 rounded-lg shadow-inner border border-slate-700/50">
      {/* Glossy Overlay & CRT Scanline effect */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
      <div className="absolute inset-0 pointer-events-none z-10 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')] opacity-10 bg-repeat"></div>
      
      <div 
        className="w-full will-change-transform"
        style={{
            transform: isSpinning ? 'none' : `translateY(${finalTranslateY}%)`,
            animation: isSpinning ? `spinLoop ${quickSpin ? 0.1 : 0.4}s linear infinite` : 'none',
            transition: isSpinning ? 'none' : `transform ${transitionDuration}s cubic-bezier(0.19, 1, 0.22, 1)`
        }}
      >
         {displaySymbols.map((char, i) => (
            <div 
                key={i} 
                className="w-full flex items-center justify-center"
                style={{ 
                    height: `calc(100% / 3)` // Fits 3 visible items per viewport height of the container
                }}
            >
                {/* Symbol Wrapper for glow effects */}
                <div className="w-[70%] h-[70%] flex items-center justify-center">
                    <Symbol name={char} className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                </div>
            </div>
        ))}
      </div>

      <style>{`
        @keyframes spinLoop {
            0% { transform: translateY(0%); filter: blur(2px); }
            100% { transform: translateY(-${100 / 3}%); filter: blur(2px); }
        }
      `}</style>
    </div>
  );
};

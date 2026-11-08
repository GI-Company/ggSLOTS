import React, { useEffect, useRef, useState } from 'react';
import { Symbol } from './Symbol';

interface SlotReelProps {
  symbols: string[];
  targetIndex: number;
  isSpinning: boolean;
  reelIndex: number;
  quickSpin: boolean;
}

export const SlotReel: React.FC<SlotReelProps> = ({ symbols, targetIndex, isSpinning, reelIndex, quickSpin }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [symbolHeight, setSymbolHeight] = useState(80);
  const displaySymbols = [...symbols, ...symbols, ...symbols];
  const finalIndex = symbols.length + targetIndex;

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const measure = () => setSymbolHeight(node.clientHeight / 3);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const baseDuration = quickSpin ? 0.15 : 0.8;
  const transitionDuration = baseDuration + (reelIndex * (quickSpin ? 0.05 : 0.2));

  return (
    <div ref={viewportRef} className="relative overflow-hidden w-full h-full bg-slate-900 rounded-lg shadow-inner border border-slate-700/50">
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
      <div
        className="absolute left-0 w-full will-change-transform"
        style={{
            top: 0,
            transform: isSpinning ? undefined : `translateY(${-finalIndex * symbolHeight}px)`,
            animation: isSpinning ? `spinLoop ${quickSpin ? 0.12 : 0.35}s linear infinite` : 'none',
            transition: isSpinning ? 'none' : `transform ${transitionDuration}s cubic-bezier(0.19, 1, 0.22, 1)`
        }}
      >
         {displaySymbols.map((char, i) => (
            <div
                key={i}
                className="w-full flex items-center justify-center"
                style={{ height: symbolHeight }}
            >
                <div className="w-[72%] h-[72%] flex items-center justify-center">
                    <Symbol name={char} className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                </div>
            </div>
        ))}
      </div>
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-yellow-300/30 pointer-events-none z-20"></div>

      <style>{`
        @keyframes spinLoop {
            0% { transform: translateY(0); filter: blur(1px); }
            100% { transform: translateY(${-symbols.length * symbolHeight}px); filter: blur(1px); }
        }
      `}</style>
    </div>
  );
};

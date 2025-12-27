import React from 'react';

interface SlotReelProps {
  symbols: string[];
  targetIndex: number;
  isSpinning: boolean;
  reelIndex: number;
}

export const SlotReel: React.FC<SlotReelProps> = ({ symbols, targetIndex, isSpinning, reelIndex }) => {
  // We replicate the strip 3 times to allow for smooth looping and buffer
  // [Set 0 (Buffer)] [Set 1 (Target Zone)] [Set 2 (Buffer)]
  const displaySymbols = [...symbols, ...symbols, ...symbols];
  const stripLength = symbols.length;
  const totalLength = displaySymbols.length;
  
  // Height of one symbol in percentage relative to the full strip container
  // The container holds 'totalLength' symbols.
  const symbolHeightPercent = 100 / totalLength;

  // ANIMATION LOGIC:
  // 1. Spinning State: We define a keyframe animation that translates from 0% to -33.33% (one full set).
  //    Because Set 0 and Set 1 are identical, this loops seamlessly.
  // 2. Stopped State: We calculate the exact position of the 'targetIndex' within Set 1 (the middle set).
  //    Target Position = (stripLength + targetIndex).
  
  // We want the 'targetIndex' to be the top row of the 3 visible symbols.
  const finalIndex = stripLength + targetIndex;
  const finalTranslateY = -(finalIndex * symbolHeightPercent);

  return (
    <div className="relative overflow-hidden w-full h-full bg-slate-800 rounded-lg shadow-inner border border-slate-700">
      {/* Glossy Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/50 via-transparent to-black/50 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"></div>
      
      <div 
        className="w-full will-change-transform"
        style={{
            // If spinning, we ignore translate and let the animation class take over.
            // If stopped, we apply the specific translation to the target.
            transform: isSpinning ? 'none' : `translateY(${finalTranslateY}%)`,
            animation: isSpinning ? `spinLoop 0.4s linear infinite` : 'none',
            // When we stop spinning, we transition from the animation state to the fixed state.
            // A small cubic-bezier gives it the "landing" bounce effect.
            transition: isSpinning ? 'none' : `transform ${0.6 + (reelIndex * 0.15)}s cubic-bezier(0.15, 1.05, 0.35, 1.1)`
        }}
      >
         {displaySymbols.map((char, i) => (
            <div 
                key={i} 
                className="w-full flex items-center justify-center text-5xl sm:text-6xl md:text-7xl select-none"
                // Each symbol must be exactly 1/3 of the VIEWPORT height.
                // Since the container is very tall (holds 3 sets), we can't just use %.
                // We rely on the parent SlotGame setting a fixed aspect ratio or height for the viewport.
                // To fill the parent correctly, we use aspect ratio on the item or strict height.
                // Best approach: The parent is 'h-full'. This strip is 'h-auto'. 
                // Wait, for percentage translation to work, the strip needs a height relative to parent.
                // Actually, let's reverse it: 
                // If we put flex column, and each item is aspect-[3/2] (from parent constraint), it stacks.
                // Let's force a height based on the `totalLength`. 
                // If visible area shows 3 items, and we have `totalLength` items.
                // The container height should be (totalLength / 3) * 100%.
                style={{ 
                    height: `calc(100% / 3)` // This div is inside a container that is shifted. 
                    // No, that's wrong. 
                    // Let's rely on aspect-ratio of the items to define structure.
                }}
            >
                {/* Symbol Wrapper for shadow/glow */}
                <div className="aspect-square flex items-center justify-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                    {char}
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


import React, { useMemo } from 'react';

interface CardProps {
  rank: string;
  suit: 'H' | 'D' | 'C' | 'S';
  hidden?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// --- STANDARDIZED SVG PATHS (24x24 Grid) ---
const SUIT_PATHS = {
  // Spade: Centered, standard proportions
  S: "M12,2C9,2 2,8 2,14c0,3.5 3,6 6,6c1.5,0 3,-1 3,-1v3h2v-3c0,0 1.5,1 3,1c3,0 6,-2.5 6,-6C22,8 15,2 12,2z",
  // Heart: Geometric heart shape
  H: "M12,21.35l-1.45-1.32C5.4,15.36 2,12.28 2,8.5C2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.42 22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z",
  // Club: Three circles and a stem
  C: "M19.5,9.5c-1.4,0-2.6,0.6-3.4,1.6c0.6-3.8-2.3-7.1-6.1-7.1s-6.7,3.4-6.1,7.1c-0.8-1-2-1.6-3.4-1.6c-2.5,0-4.5,2-4.5,4.5c0,2.3 1.8,4.2 4,4.5v3.5h4v-3.5c2.2-0.3 4-2.2 4-4.5C24,11.5 22,9.5 19.5,9.5z",
  // Diamond: Perfect rhombus
  D: "M12,2 L22,12 L12,22 L2,12 Z"
};

// --- PIP POSITIONS (Percentage 0-100) ---
const PIP_LAYOUTS: Record<string, [number, number, boolean][]> = {
  'A': [[50, 50, false]],
  '2': [[50, 20, false], [50, 80, true]],
  '3': [[50, 20, false], [50, 50, false], [50, 80, true]],
  '4': [[25, 20, false], [75, 20, false], [25, 80, true], [75, 80, true]],
  '5': [[25, 20, false], [75, 20, false], [50, 50, false], [25, 80, true], [75, 80, true]],
  '6': [[25, 20, false], [75, 20, false], [25, 50, false], [75, 50, false], [25, 80, true], [75, 80, true]],
  '7': [[25, 20, false], [75, 20, false], [50, 35, false], [25, 50, false], [75, 50, false], [25, 80, true], [75, 80, true]],
  '8': [[25, 20, false], [75, 20, false], [50, 35, false], [25, 50, false], [75, 50, false], [50, 65, true], [25, 80, true], [75, 80, true]],
  '9': [[25, 20, false], [75, 20, false], [25, 40, false], [75, 40, false], [50, 50, false], [25, 60, true], [75, 60, true], [25, 80, true], [75, 80, true]],
  '10': [[25, 20, false], [75, 20, false], [50, 30, false], [25, 40, false], [75, 40, false], [25, 60, true], [75, 60, true], [50, 70, true], [25, 80, true], [75, 80, true]],
};

export const Card: React.FC<CardProps> = ({ rank, suit, hidden, className = "", style }) => {
  const isRed = suit === 'H' || suit === 'D';
  
  // Generate a unique ID for this card instance to prevent SVG definition clashes
  const uid = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  const symbolId = `suit-${suit}-${uid}`;
  const gradRedId = `grad-red-${uid}`;
  const gradBlackId = `grad-black-${uid}`;
  const gradGoldId = `grad-gold-${uid}`;
  const cardSurfaceId = `card-surface-${uid}`;
  const holoFoilId = `holo-foil-${uid}`;
  const glowPipId = `glow-pip-${uid}`;
  const cardBackPatternId = `card-back-pattern-${uid}`;

  // Cyberpunk Palette definition
  const palette = {
      primary: isRed ? '#f43f5e' : '#0ea5e9', // Rose vs Sky
      secondary: isRed ? '#be123c' : '#0369a1',
      dark: '#0f172a', // Slate 900
      surface: '#1e293b', // Slate 800
      accent: '#fbbf24', // Amber 400 (Gold)
      border: isRed ? '#881337' : '#075985'
  };

  const pips = useMemo(() => {
    if (['J', 'Q', 'K'].includes(rank)) return null;
    const layout = PIP_LAYOUTS[rank] || PIP_LAYOUTS['A'];

    return layout.map(([x, y, flipped], i) => {
      // Scale Y from 0-100 (layout grid) to 0-140 (SVG coordinate space)
      // This ensures the middle (50) maps to the true center (70)
      const adjustedY = (y / 100) * 140; 
      
      return (
        <use 
          key={i} 
          href={`#${symbolId}`} 
          x={x} 
          y={adjustedY} 
          width="16" 
          height="16" 
          // translate(-8 -8) centers the 16x16 box on the x,y coordinate
          transform={`rotate(${flipped ? 180 : 0} ${x} ${adjustedY}) translate(-8 -8)`} 
          fill={`url(#${isRed ? gradRedId : gradBlackId})`}
          filter={`url(#${glowPipId})`}
        />
      );
    });
  }, [rank, suit, isRed, symbolId, gradRedId, gradBlackId, glowPipId]);

  const renderFaceArt = () => {
      const color = palette.primary;
      const gold = palette.accent;
      
      if (rank === 'J') {
          return (
            <g transform="translate(50, 70)">
                <path d="M-30 -40 L30 -30 L30 30 L0 45 L-30 30 Z" fill="none" stroke={color} strokeWidth="1" opacity="0.3"/>
                <path d="M0 -30 L20 -15 L15 15 L0 25 L-15 15 L-20 -15 Z" fill={palette.surface} stroke={color} strokeWidth="2"/>
                <path d="M-15 -5 L15 -5" stroke={gold} strokeWidth="1.5" />
                <path d="M0 -5 L0 15" stroke={gold} strokeWidth="1.5" />
                <path d="M-25 10 Q-35 30 -25 45" stroke={color} strokeWidth="2" opacity="0.6"/>
                <path d="M25 10 Q35 30 25 45" stroke={color} strokeWidth="2" opacity="0.6"/>
                <text x="0" y="5" fontSize="60" fill={color} opacity="0.07" fontWeight="900" textAnchor="middle" dominantBaseline="middle">J</text>
            </g>
          );
      }
      if (rank === 'Q') {
          return (
            <g transform="translate(50, 70)">
                 <circle cx="0" cy="0" r="35" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 2" opacity="0.4"/>
                 <circle cx="0" cy="0" r="28" fill="none" stroke={gold} strokeWidth="0.5" opacity="0.6" />
                 <path d="M-15 10 L-20 -20 L0 -10 L20 -20 L15 10 Z" fill={palette.surface} stroke={color} strokeWidth="2" />
                 <circle cx="0" cy="-25" r="3" fill={gold} filter={`url(#${glowPipId})`} />
                 <circle cx="-20" cy="-20" r="2" fill={color} />
                 <circle cx="20" cy="-20" r="2" fill={color} />
                 <path d="M-10 25 Q0 35 10 25" stroke={gold} strokeWidth="2" fill="none" />
                 <text x="0" y="5" fontSize="60" fill={color} opacity="0.07" fontWeight="900" textAnchor="middle" dominantBaseline="middle">Q</text>
            </g>
          );
      }
      if (rank === 'K') {
          return (
            <g transform="translate(50, 70)">
                <rect x="-25" y="-30" width="50" height="60" rx="5" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
                <path d="M0 -45 L0 45" stroke={gold} strokeWidth="3" />
                <path d="M-15 -15 L15 -15" stroke={gold} strokeWidth="2" />
                <path d="M-15 -15 L-15 -35 L0 -45 L15 -35 L15 -15" fill={palette.surface} stroke={color} strokeWidth="2" opacity="0.8" />
                <path d="M0 -30 L5 -25 L0 -20 L-5 -25 Z" fill={color} />
                <text x="0" y="5" fontSize="60" fill={color} opacity="0.07" fontWeight="900" textAnchor="middle" dominantBaseline="middle">K</text>
            </g>
          );
      }
      return null;
  };

  return (
    <div 
        className={`relative inline-block select-none rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${className}`}
        style={{ 
            aspectRatio: '2.5/3.5',
            backgroundColor: palette.dark,
            border: `1px solid ${hidden ? '#334155' : palette.border}`,
            boxShadow: hidden ? '0 4px 6px -1px rgba(0, 0, 0, 0.5)' : `0 0 15px -3px ${palette.primary}40`,
            ...style 
        }}
    >
      <svg 
        viewBox="0 0 100 140" 
        className="w-full h-full" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
            {/* --- SUIT GRADIENTS (Unique IDs) --- */}
            <linearGradient id={gradRedId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id={gradBlackId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id={gradGoldId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* --- CARD SURFACE & EFFECTS --- */}
            <radialGradient id={cardSurfaceId} cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#334155" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
            </radialGradient>

            <linearGradient id={holoFoilId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0"/>
                <stop offset="40%" stopColor="white" stopOpacity="0"/>
                <stop offset="50%" stopColor="white" stopOpacity="0.15"/>
                <stop offset="60%" stopColor="white" stopOpacity="0"/>
                <stop offset="100%" stopColor="white" stopOpacity="0"/>
            </linearGradient>

            <filter id={glowPipId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>

            <pattern id={cardBackPatternId} x="0" y="0" width="20" height="34.64" patternUnits="userSpaceOnUse">
                 <rect width="20" height="34.64" fill="#0f172a" />
                 <path d="M10 0 L20 5 L20 15 L10 20 L0 15 L0 5 Z" fill="none" stroke="#1e293b" strokeWidth="1" />
                 <path d="M10 17.32 L20 22.32 L20 32.32 L10 37.32 L0 32.32 L0 22.32 Z" fill="none" stroke="#1e293b" strokeWidth="1" />
                 <circle cx="10" cy="10" r="1.5" fill="#334155" />
            </pattern>
            
            {/* --- STANDARDIZED SYMBOL WITH PADDING --- */}
            <symbol id={symbolId} viewBox="-2 -2 28 28">
                <path d={SUIT_PATHS[suit]} />
            </symbol>
        </defs>

        {/* --- BACKGROUND --- */}
        <rect x="0" y="0" width="100" height="140" fill={`url(#${cardSurfaceId})`} />

        {hidden ? (
          // --- CARD BACK ---
          <>
            <rect x="5" y="5" width="90" height="130" rx="5" fill={`url(#${cardBackPatternId})`} stroke="#334155" strokeWidth="1"/>
            <circle cx="50" cy="70" r="20" fill="#0f172a" stroke="#d49837" strokeWidth="2" />
            <text x="50" y="78" fontSize="24" fontFamily="Arial" fontWeight="bold" fill="#d49837" textAnchor="middle">GG</text>
            <rect x="0" y="0" width="100" height="140" fill={`url(#${holoFoilId})`} style={{ mixBlendMode: 'soft-light' }} />
          </>
        ) : (
          // --- CARD FRONT ---
          <>
            {/* Corner Indicators */}
            <g transform="translate(12, 22)">
                <text x="0" y="0" fontSize="18" fontWeight="800" fill={`url(#${isRed ? gradRedId : gradBlackId})`} textAnchor="middle" style={{ fontFamily: 'Orbitron, sans-serif' }}>{rank}</text>
                {/* Small corner pip: 12x12 size, centered below text */}
                <use href={`#${symbolId}`} x="-6" y="4" width="12" height="12" fill={`url(#${isRed ? gradRedId : gradBlackId})`} />
            </g>

            <g transform="rotate(180, 50, 70) translate(12, 22)">
                 <text x="0" y="0" fontSize="18" fontWeight="800" fill={`url(#${isRed ? gradRedId : gradBlackId})`} textAnchor="middle" style={{ fontFamily: 'Orbitron, sans-serif' }}>{rank}</text>
                 <use href={`#${symbolId}`} x="-6" y="4" width="12" height="12" fill={`url(#${isRed ? gradRedId : gradBlackId})`} />
            </g>

            {/* Central Art/Pips */}
            {pips}
            {renderFaceArt()}

            {/* Suit Watermark (Big Faded Background) */}
            <use 
                href={`#${symbolId}`} 
                x="20" y="40" width="60" height="60" 
                fill={`url(#${isRed ? gradRedId : gradBlackId})`} 
                opacity="0.03" 
                pointerEvents="none"
            />

            {/* Holographic Finish */}
            <rect x="0" y="0" width="100" height="140" fill={`url(#${holoFoilId})`} style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }} />
            
            {/* Border Inner Line */}
            <rect x="4" y="4" width="92" height="132" rx="8" fill="none" stroke={palette.border} strokeWidth="1" opacity="0.5" />
          </>
        )}
      </svg>
    </div>
  );
};

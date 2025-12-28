
import React from 'react';

export const Symbol: React.FC<{ name: string; className?: string }> = ({ name, className = "" }) => {
    
    // --- SPECIALS ---
    if (name === 'SCATTER') {
        return (
            <svg viewBox="0 0 100 100" className={className}>
                <defs>
                    <radialGradient id="gradBonus" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" style={{stopColor:'#fff', stopOpacity:1}} />
                        <stop offset="100%" style={{stopColor:'#ffd700', stopOpacity:1}} />
                    </radialGradient>
                    <filter id="glowBonus"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                <g filter="url(#glowBonus)">
                    <circle cx="50" cy="50" r="40" fill="url(#gradBonus)" stroke="#b8860b" strokeWidth="4" />
                    <text x="50" y="55" fontSize="18" fontFamily="Arial" fontWeight="900" textAnchor="middle" fill="#b8860b">BONUS</text>
                    <path d="M50 10 L55 35 L80 35 L60 55 L70 80 L50 65 L30 80 L40 55 L20 35 L45 35 Z" fill="none" stroke="#b8860b" strokeWidth="2" opacity="0.5"/>
                </g>
            </svg>
        );
    }

    // --- EGYPTIAN THEME ---
    switch (name) {
        case 'PHARAOH':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M30 90 L30 30 Q50 0 70 30 L70 90 Z" fill="#FFD700" stroke="#B8860B" strokeWidth="3"/>
                    <rect x="35" y="40" width="30" height="40" fill="#0000CD" rx="5"/>
                    <circle cx="50" cy="30" r="15" fill="#FFD700" stroke="#000"/>
                </svg>
            );
        case 'ANKH':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M50 85 L50 45 M30 45 L70 45" stroke="#FFD700" strokeWidth="8" strokeLinecap="round"/>
                    <ellipse cx="50" cy="30" rx="15" ry="20" stroke="#FFD700" strokeWidth="8" fill="none"/>
                </svg>
            );
        case 'SCARAB':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <ellipse cx="50" cy="50" rx="25" ry="35" fill="#40E0D0" stroke="#000" strokeWidth="2"/>
                    <path d="M25 50 L5 30 M75 50 L95 30 M25 70 L5 90 M75 70 L95 90" stroke="#FFD700" strokeWidth="4"/>
                </svg>
            );
        case 'EYE':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M20 50 Q50 20 80 50 Q50 80 20 50 Z" stroke="#000" strokeWidth="3" fill="#FFF"/>
                    <circle cx="50" cy="50" r="10" fill="#000"/>
                    <path d="M50 80 L50 90 M20 50 L10 50" stroke="#000" strokeWidth="3"/>
                </svg>
            );
        
        // --- VIKING THEME ---
        case 'ODIN':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="50" r="35" fill="#C0C0C0" stroke="#555" strokeWidth="3"/>
                    <path d="M35 50 L65 50 M50 35 L50 75" stroke="#555" strokeWidth="3"/>
                    <circle cx="40" cy="45" r="4" fill="#000"/> 
                </svg>
            );
        case 'AXE':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                     <path d="M45 90 L55 20" stroke="#8B4513" strokeWidth="6" strokeLinecap="round"/>
                     <path d="M55 20 Q80 10 80 40 Q55 35 55 20 Q30 35 20 40 Q20 10 55 20" fill="#C0C0C0" stroke="#555" strokeWidth="2"/>
                </svg>
            );
        case 'SHIELD':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="50" r="35" fill="#8B0000" stroke="#C0C0C0" strokeWidth="5"/>
                    <circle cx="50" cy="50" r="8" fill="#C0C0C0"/>
                </svg>
            );
        case 'HELMET':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M30 60 Q50 10 70 60 L70 80 L30 80 Z" fill="#778899" stroke="#000" strokeWidth="2"/>
                    <path d="M30 60 L20 40 M70 60 L80 40" stroke="#FFF" strokeWidth="4"/>
                </svg>
            );
            
        // --- TEXT SYMBOLS (Low Value) ---
        case '10': case 'J': case 'Q': case 'K': case 'A':
        case 'RUNE1': case 'RUNE2': case 'RUNE3':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <text x="50" y="65" fontSize="50" fontFamily="serif" fontWeight="bold" textAnchor="middle" fill="#FFF" stroke="#000" strokeWidth="2">
                        {name.replace('RUNE', 'ᚱ')}
                    </text>
                </svg>
            );
    }

    // --- COSMIC THEME (Legacy) ---
    switch (name) {
        case '💎':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs><filter id="glow1"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                    <g filter="url(#glow1)">
                        <path d="M20 30 L35 40 L25 55 L40 70 L50 50 L65 65 L75 50 L80 35" stroke="#ff4dea" strokeWidth="3" fill="none" strokeLinecap="round"/>
                        <circle cx="20" cy="30" r="3" fill="#ff4dea"/><circle cx="35" cy="40" r="3" fill="#ff4dea"/><circle cx="25" cy="55" r="3" fill="#ff4dea"/><circle cx="40" cy="70" r="3" fill="#ff4dea"/><circle cx="50" cy="50" r="3" fill="#ff4dea"/><circle cx="65" cy="65" r="3" fill="#ff4dea"/><circle cx="75" cy="50" r="3" fill="#ff4dea"/><circle cx="80" cy="35" r="3" fill="#ff4dea"/>
                    </g>
                </svg>
            );
        case '🔔':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs><filter id="glow2"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                    <g filter="url(#glow2)">
                        <path d="M25 25 L40 40 L20 50 L45 60 L60 45 L75 75 L80 55" stroke="#00d4ff" strokeWidth="3" fill="none" strokeLinecap="round"/>
                        <circle cx="25" cy="25" r="3" fill="#00d4ff"/><circle cx="40" cy="40" r="3" fill="#00d4ff"/><circle cx="20" cy="50" r="3" fill="#00d4ff"/><circle cx="45" cy="60" r="3" fill="#00d4ff"/><circle cx="60" cy="45" r="3" fill="#00d4ff"/><circle cx="75" cy="75" r="3" fill="#00d4ff"/><circle cx="80" cy="55" r="3" fill="#00d4ff"/>
                    </g>
                </svg>
            );
        case '🍉':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs><filter id="glow3"><feGaussianBlur stdDeviation="5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="grad3" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" style={{stopColor:'#ff00ff', stopOpacity:1}} /><stop offset="100%" style={{stopColor:'#4a00e0', stopOpacity:0}} /></radialGradient></defs>
                    <g filter="url(#glow3)"><path d="M 20,50 C 20,20 80,20 80,50 C 80,80 20,80 20,50 Z M 30,50 C 30,30 70,30 70,50 C 70,70 30,70 30,50 Z" fill="url(#grad3)"/></g>
                </svg>
            );
        case '🍒':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs><filter id="glow4"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="grad4" cx="30%" cy="30%" r="65%"><stop offset="0%" stopColor="#ff99ff"/><stop offset="100%" stopColor="#e040fb"/></radialGradient></defs>
                    <g filter="url(#glow4)"><circle cx="30" cy="30" r="15" fill="url(#grad4)"/><circle cx="60" cy="25" r="10" fill="url(#grad4)"/><circle cx="35" cy="55" r="18" fill="url(#grad4)"/><circle cx="65" cy="60" r="20" fill="url(#grad4)"/></g>
                </svg>
            );
        case '🍋':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs><filter id="glow5"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                    <g filter="url(#glow5)"><ellipse cx="50" cy="50" rx="40" ry="15" stroke="#f0f" strokeWidth="3" fill="none"/><ellipse cx="50" cy="50" rx="40" ry="15" stroke="#f0f" strokeWidth="3" fill="none" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="40" ry="15" stroke="#f0f" strokeWidth="3" fill="none" transform="rotate(120 50 50)"/><circle cx="50" cy="50" r="8" fill="#ff99ff"/></g>
                </svg>
            );
        case '🍊':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs><filter id="glow7"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                    <g filter="url(#glow7)"><path d="M50 50 C 70 30, 80 40, 70 60 S 30 70, 40 40 S 60 20, 50 50" stroke="#00f5d4" strokeWidth="3" fill="none"/><path d="M50 50 C 30 70, 20 60, 30 40 S 70 30, 60 60 S 40 80, 50 50" stroke="#00f5d4" strokeWidth="3" fill="none"/></g>
                </svg>
            );
        case '⭐':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs><filter id="glow8"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                    <g filter="url(#glow8)"><path d="M10,50 C 25,25 40,75 50,50 S 75,25 90,50" stroke="#9b59b6" strokeWidth="4" fill="none"/><path d="M10,50 C 25,75 40,25 50,50 S 75,75 90,50" stroke="#8e44ad" strokeWidth="4" fill="none"/></g>
                </svg>
            );
        default:
            return <div className="text-4xl text-white font-bold flex items-center justify-center h-full w-full">{name}</div>;
    }
}

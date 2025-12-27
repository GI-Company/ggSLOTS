
import React from 'react';

export const Symbol: React.FC<{ name: string; className?: string }> = ({ name, className = "" }) => {
    // We map the logic symbols (emojis) to the original Neon SVG designs
    switch (name) {
        case '💎': // Previously Constellation1
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs>
                        <filter id="glow1"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    <g filter="url(#glow1)">
                        <path d="M20 30 L35 40 L25 55 L40 70 L50 50 L65 65 L75 50 L80 35" stroke="#ff4dea" strokeWidth="3" fill="none" strokeLinecap="round"/>
                        <circle cx="20" cy="30" r="3" fill="#ff4dea"/><circle cx="35" cy="40" r="3" fill="#ff4dea"/>
                        <circle cx="25" cy="55" r="3" fill="#ff4dea"/><circle cx="40" cy="70" r="3" fill="#ff4dea"/>
                        <circle cx="50" cy="50" r="3" fill="#ff4dea"/><circle cx="65" cy="65" r="3" fill="#ff4dea"/>
                        <circle cx="75" cy="50" r="3" fill="#ff4dea"/><circle cx="80" cy="35" r="3" fill="#ff4dea"/>
                    </g>
                </svg>
            );
        case '🔔': // Previously Constellation2
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs>
                        <filter id="glow2"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    <g filter="url(#glow2)">
                        <path d="M25 25 L40 40 L20 50 L45 60 L60 45 L75 75 L80 55" stroke="#00d4ff" strokeWidth="3" fill="none" strokeLinecap="round"/>
                        <circle cx="25" cy="25" r="3" fill="#00d4ff"/><circle cx="40" cy="40" r="3" fill="#00d4ff"/>
                        <circle cx="20" cy="50" r="3" fill="#00d4ff"/><circle cx="45" cy="60" r="3" fill="#00d4ff"/>
                        <circle cx="60" cy="45" r="3" fill="#00d4ff"/><circle cx="75" cy="75" r="3" fill="#00d4ff"/>
                        <circle cx="80" cy="55" r="3" fill="#00d4ff"/>
                    </g>
                </svg>
            );
        case '🍉': // Previously Nebula
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs>
                        <filter id="glow3"><feGaussianBlur stdDeviation="5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        <radialGradient id="grad3" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" style={{stopColor:'#ff00ff', stopOpacity:1}} />
                            <stop offset="100%" style={{stopColor:'#4a00e0', stopOpacity:0}} />
                        </radialGradient>
                    </defs>
                    <g filter="url(#glow3)">
                        <path d="M 20,50 C 20,20 80,20 80,50 C 80,80 20,80 20,50 Z M 30,50 C 30,30 70,30 70,50 C 70,70 30,70 30,50 Z" fill="url(#grad3)"/>
                    </g>
                </svg>
            );
        case '🍒': // Previously Spheres
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs>
                        <filter id="glow4"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        <radialGradient id="grad4" cx="30%" cy="30%" r="65%">
                            <stop offset="0%" stopColor="#ff99ff"/><stop offset="100%" stopColor="#e040fb"/>
                        </radialGradient>
                    </defs>
                    <g filter="url(#glow4)">
                        <circle cx="30" cy="30" r="15" fill="url(#grad4)"/><circle cx="60" cy="25" r="10" fill="url(#grad4)"/>
                        <circle cx="35" cy="55" r="18" fill="url(#grad4)"/><circle cx="65" cy="60" r="20" fill="url(#grad4)"/>
                    </g>
                </svg>
            );
        case '🍋': // Previously Atom
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs>
                        <filter id="glow5"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    <g filter="url(#glow5)">
                        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="#f0f" strokeWidth="3" fill="none"/>
                        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="#f0f" strokeWidth="3" fill="none" transform="rotate(60 50 50)"/>
                        <ellipse cx="50" cy="50" rx="40" ry="15" stroke="#f0f" strokeWidth="3" fill="none" transform="rotate(120 50 50)"/>
                        <circle cx="50" cy="50" r="8" fill="#ff99ff"/>
                    </g>
                </svg>
            );
        case 'BONUS': // Previously Blackhole
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs>
                        <filter id="glow6"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        <linearGradient id="grad6" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ffc107"/><stop offset="100%" stopColor="#ff8f00"/>
                        </linearGradient>
                    </defs>
                    <g filter="url(#glow6)">
                        <path d="M10 50 C 20 20, 80 20, 90 50 C 80 80, 20 80, 10 50" stroke="url(#grad6)" strokeWidth="5" fill="none"/>
                        <circle cx="50" cy="50" r="15" fill="black"/>
                    </g>
                </svg>
            );
        case '🍊': // Previously Galaxy1
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs>
                        <filter id="glow7"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    <g filter="url(#glow7)">
                        <path d="M50 50 C 70 30, 80 40, 70 60 S 30 70, 40 40 S 60 20, 50 50" stroke="#00f5d4" strokeWidth="3" fill="none"/>
                        <path d="M50 50 C 30 70, 20 60, 30 40 S 70 30, 60 60 S 40 80, 50 50" stroke="#00f5d4" strokeWidth="3" fill="none"/>
                    </g>
                </svg>
            );
        case '⭐': // Previously Wave/Galaxy2
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <defs>
                        <filter id="glow8"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    <g filter="url(#glow8)">
                        <path d="M10,50 C 25,25 40,75 50,50 S 75,25 90,50" stroke="#9b59b6" strokeWidth="4" fill="none"/>
                        <path d="M10,50 C 25,75 40,25 50,50 S 75,75 90,50" stroke="#8e44ad" strokeWidth="4" fill="none"/>
                    </g>
                </svg>
            );
        default:
            return <div className="text-4xl text-white font-bold">{name}</div>;
    }
}

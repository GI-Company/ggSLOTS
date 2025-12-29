
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

    switch (name) {
        // --- EGYPTIAN ---
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
        
        // --- WILD WEST ---
        case 'SHERIFF': case '🤠':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <polygon points="50,10 60,35 85,35 65,55 75,80 50,65 25,80 35,55 15,35 40,35" fill="#FFD700" stroke="#DAA520" strokeWidth="2"/>
                    <circle cx="50" cy="50" r="5" fill="#DAA520" />
                    <circle cx="50" cy="50" r="2" fill="#000" />
                </svg>
            );
        case 'GUN': case '🔫':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M10 60 L30 60 L30 40 L80 40 L80 50 L30 50 L30 80 L10 80 Z" fill="#708090" stroke="#000" strokeWidth="2"/>
                    <rect x="35" y="35" width="40" height="10" fill="#2F4F4F"/>
                </svg>
            );
        case 'CACTUS': case '🌵':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M45 90 L45 30 Q45 10 55 30 L55 90" stroke="#228B22" strokeWidth="15" strokeLinecap="round" fill="none"/>
                    <path d="M45 60 Q20 60 20 40" stroke="#228B22" strokeWidth="10" strokeLinecap="round" fill="none"/>
                    <path d="M55 50 Q80 50 80 30" stroke="#228B22" strokeWidth="10" strokeLinecap="round" fill="none"/>
                </svg>
            );
        case 'MONEY': case '💰':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M20 30 Q50 10 80 30 L90 80 Q50 95 10 80 Z" fill="#DEB887" stroke="#8B4513" strokeWidth="2"/>
                    <text x="50" y="65" fontSize="40" textAnchor="middle" fill="#006400" fontWeight="bold">$</text>
                </svg>
            );

        // --- HORROR ---
        case 'GHOST': case '👻':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M20 90 L20 40 Q50 0 80 40 L80 90 L70 80 L60 90 L50 80 L40 90 L30 80 Z" fill="#E0FFFF" stroke="#ADD8E6" strokeWidth="2"/>
                    <circle cx="35" cy="40" r="5" fill="#000"/>
                    <circle cx="65" cy="40" r="5" fill="#000"/>
                    <ellipse cx="50" cy="60" rx="10" ry="15" fill="#000"/>
                </svg>
            );
        case 'VAMPIRE': case '🧛':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M30 30 Q50 10 70 30 L70 70 Q50 90 30 70 Z" fill="#FFF0F5" stroke="#000" strokeWidth="1"/>
                    <path d="M30 30 L20 20 L30 50 Z" fill="#000"/>
                    <path d="M70 30 L80 20 L70 50 Z" fill="#000"/>
                    <path d="M40 75 L45 85 L55 85 L60 75" fill="none" stroke="#8B0000" strokeWidth="2"/>
                    <path d="M42 65 L45 75 L55 75 L58 65" fill="#FFF" stroke="#000"/>
                </svg>
            );
        case 'SPIDER': case '🕷️':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="50" r="15" fill="#000"/>
                    <path d="M50 50 L20 20 M50 50 L80 20 M50 50 L20 50 M50 50 L80 50 M50 50 L20 80 M50 50 L80 80" stroke="#000" strokeWidth="3"/>
                    <circle cx="45" cy="45" r="2" fill="red"/>
                    <circle cx="55" cy="45" r="2" fill="red"/>
                </svg>
            );

        // --- ZEUS / GREEK ---
        case 'ZEUS': case '⚡':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M55 10 L25 50 L45 50 L35 90 L65 50 L45 50 Z" fill="#00BFFF" stroke="#FFD700" strokeWidth="2" filter="url(#glowBonus)"/>
                </svg>
            );
        case 'TEMPLE': case '🏛️':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <rect x="10" y="80" width="80" height="10" fill="#FFF8DC" stroke="#8B4513"/>
                    <rect x="20" y="30" width="10" height="50" fill="#FFF8DC" stroke="#8B4513"/>
                    <rect x="45" y="30" width="10" height="50" fill="#FFF8DC" stroke="#8B4513"/>
                    <rect x="70" y="30" width="10" height="50" fill="#FFF8DC" stroke="#8B4513"/>
                    <path d="M10 30 L50 10 L90 30 Z" fill="#FFF8DC" stroke="#8B4513"/>
                </svg>
            );

        // --- OCEAN ---
        case 'SHARK': case '🦈':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M20 50 Q50 20 80 50 Q50 80 20 50" fill="#708090" />
                    <path d="M50 20 L40 5 L60 20" fill="#708090"/>
                    <circle cx="35" cy="45" r="3" fill="#000"/>
                    <path d="M60 50 L70 45 L70 55 Z" fill="#FFF"/>
                </svg>
            );
        case 'TRIDENT': case '🔱':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M50 90 L50 30 M30 30 L30 20 Q50 40 70 20 L70 30" stroke="#FFD700" strokeWidth="5" strokeLinecap="round" fill="none"/>
                    <path d="M30 20 L30 10 M50 30 L50 10 M70 20 L70 10" stroke="#FFD700" strokeWidth="5" strokeLinecap="round"/>
                </svg>
            );
        case 'OCTOPUS': case '🐙':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="40" r="20" fill="#800080"/>
                    <path d="M30 50 Q20 80 40 80 M50 60 Q50 90 50 90 M70 50 Q80 80 60 80" stroke="#800080" strokeWidth="5" fill="none"/>
                    <circle cx="45" cy="40" r="3" fill="#FFF"/>
                    <circle cx="55" cy="40" r="3" fill="#FFF"/>
                </svg>
            );

        // --- JUNGLE ---
        case 'MONKEY': case '🐵':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="30" cy="40" r="10" fill="#8B4513" />
                    <circle cx="70" cy="40" r="10" fill="#8B4513" />
                    <circle cx="50" cy="50" r="30" fill="#8B4513" />
                    <ellipse cx="50" cy="60" rx="15" ry="10" fill="#F4A460" />
                    <circle cx="40" cy="45" r="4" fill="#000" />
                    <circle cx="60" cy="45" r="4" fill="#000" />
                </svg>
             );
        case 'TIGER': case '🐯':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="50" r="35" fill="#FF8C00" />
                    <path d="M20 50 L30 60 M80 50 L70 60" stroke="#000" strokeWidth="2" />
                    <path d="M45 80 L55 80" stroke="#000" strokeWidth="3" />
                    <circle cx="35" cy="45" r="4" fill="#000" />
                    <circle cx="65" cy="45" r="4" fill="#000" />
                    <path d="M50 20 L50 35 M30 30 L40 40 M70 30 L60 40" stroke="#000" strokeWidth="2" />
                </svg>
             );
        case 'PARROT': case '🦜':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M40 20 Q70 20 60 50 L50 80" stroke="#FF0000" strokeWidth="20" strokeLinecap="round" fill="none" />
                    <circle cx="50" cy="30" r="15" fill="#FF0000" />
                    <path d="M50 30 L65 35 L50 40" fill="#FFFF00" />
                    <circle cx="45" cy="25" r="3" fill="#000" />
                </svg>
             );

        // --- VIKING ---
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

        // --- DOGS ---
        case 'DOG': case '🐕': case '🐶':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="50" r="35" fill="#A0522D" />
                    <circle cx="35" cy="40" r="5" fill="#fff" />
                    <circle cx="65" cy="40" r="5" fill="#fff" />
                    <ellipse cx="50" cy="65" rx="10" ry="8" fill="#000" />
                    <path d="M20 30 Q10 50 30 60" fill="#A0522D" stroke="#555" strokeWidth="2" />
                    <path d="M80 30 Q90 50 70 60" fill="#A0522D" stroke="#555" strokeWidth="2" />
                </svg>
            );
        case 'BONE': case '🦴':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M20 40 Q10 40 10 50 Q10 60 20 60 L80 60 Q90 60 90 50 Q90 40 80 40 Z" fill="#FFF" stroke="#CCC" strokeWidth="2" />
                    <circle cx="15" cy="45" r="8" fill="#FFF" stroke="#CCC" />
                    <circle cx="15" cy="55" r="8" fill="#FFF" stroke="#CCC" />
                    <circle cx="85" cy="45" r="8" fill="#FFF" stroke="#CCC" />
                    <circle cx="85" cy="55" r="8" fill="#FFF" stroke="#CCC" />
                </svg>
            );
        case 'HOUSE':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M20 50 L50 20 L80 50 L80 90 L20 90 Z" fill="#B22222" stroke="#000" strokeWidth="2" />
                    <rect x="40" y="60" width="20" height="30" fill="#000" rx="10" />
                </svg>
             );

        // --- CANDY ---
        case 'CANDY': case '🍬':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="50" r="25" fill="#FF69B4" />
                    <path d="M25 50 L5 30 L5 70 Z" fill="#FF1493" />
                    <path d="M75 50 L95 30 L95 70 Z" fill="#FF1493" />
                </svg>
             );
        case 'LOLLIPOP': case '🍭':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="50" cy="40" r="30" fill="#FF4500" />
                    <circle cx="50" cy="40" r="20" fill="#FFFF00" />
                    <circle cx="50" cy="40" r="10" fill="#00CED1" />
                    <rect x="45" y="70" width="10" height="30" fill="#FFF" />
                </svg>
             );

        // --- CHILLI ---
        case 'CHILLI': case '🌶️':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M60 20 Q90 20 80 50 Q60 90 40 80 Q20 70 60 20 Z" fill="#FF0000" stroke="#8B0000" strokeWidth="2" />
                    <path d="M60 20 Q50 10 70 10" stroke="#006400" strokeWidth="4" fill="none" />
                </svg>
             );
        case 'HOTSAUCE':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M35 90 L35 40 L45 30 L55 30 L65 40 L65 90 Z" fill="#FF4500" stroke="#000" strokeWidth="2" />
                    <rect x="40" y="50" width="20" height="30" fill="#FFF" />
                    <circle cx="50" cy="65" r="5" fill="red" />
                </svg>
             );

        // --- AZTEC ---
        case 'MASK': case '👺':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <rect x="30" y="20" width="40" height="60" fill="#CD853F" rx="5" stroke="#8B4513" strokeWidth="2" />
                    <circle cx="40" cy="40" r="5" fill="#000" />
                    <circle cx="60" cy="40" r="5" fill="#000" />
                    <path d="M40 70 Q50 80 60 70" stroke="#000" strokeWidth="2" fill="none" />
                </svg>
             );
        case 'TEMPLE':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M10 90 L90 90 L80 70 L20 70 Z" fill="#8B4513" />
                    <path d="M20 70 L80 70 L70 50 L30 50 Z" fill="#A0522D" />
                    <path d="M30 50 L70 50 L60 30 L40 30 Z" fill="#CD853F" />
                    <rect x="45" y="30" width="10" height="10" fill="#000" />
                </svg>
             );

        // --- ASIAN ---
        case 'DRAGON':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M20 50 Q30 20 50 30 Q70 20 80 50 Q70 80 50 70 Q30 80 20 50" fill="#DC143C" stroke="#FFD700" strokeWidth="2"/>
                    <circle cx="40" cy="45" r="3" fill="#FFF"/>
                    <circle cx="60" cy="45" r="3" fill="#FFF"/>
                </svg>
             );
        case 'PANDA': case '🐼':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <circle cx="30" cy="30" r="10" fill="#000"/>
                    <circle cx="70" cy="30" r="10" fill="#000"/>
                    <circle cx="50" cy="50" r="30" fill="#FFF" stroke="#000" strokeWidth="2"/>
                    <circle cx="40" cy="45" r="5" fill="#000"/>
                    <circle cx="60" cy="45" r="5" fill="#000"/>
                    <ellipse cx="50" cy="60" rx="5" ry="3" fill="#000"/>
                </svg>
             );
        case 'LANTERN': case '🏮':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <rect x="45" y="10" width="10" height="10" fill="#FFD700"/>
                    <rect x="25" y="20" width="50" height="60" rx="10" fill="#DC143C"/>
                    <path d="M25 35 L75 35 M25 50 L75 50 M25 65 L75 65" stroke="#8B0000" strokeWidth="2"/>
                    <path d="M40 80 L40 90 M50 80 L50 90 M60 80 L60 90" stroke="#FFD700" strokeWidth="2"/>
                </svg>
             );

        // --- NEON / CLASSIC ---
        case '7':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <text x="50" y="80" fontSize="80" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" fill="none" stroke="#FF0000" strokeWidth="4" filter="url(#glowBonus)">7</text>
                    <text x="50" y="80" fontSize="80" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" fill="#FF0000">7</text>
                </svg>
             );
        case 'BAR':
             return (
                <svg viewBox="0 0 100 100" className={className}>
                    <rect x="10" y="35" width="80" height="30" rx="5" fill="#FFD700" stroke="#000" strokeWidth="2"/>
                    <text x="50" y="58" fontSize="20" fontWeight="900" textAnchor="middle" fill="#000">BAR</text>
                </svg>
             );

        // --- TEXT SYMBOLS (Low Value) ---
        case '10': case 'J': case 'Q': case 'K': case 'A': case 'B': case 'C':
        case 'RUNE1': case 'RUNE2': case 'RUNE3':
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <text x="50" y="65" fontSize="50" fontFamily="serif" fontWeight="bold" textAnchor="middle" fill="#FFF" stroke="#000" strokeWidth="2">
                        {name.replace('RUNE', 'ᚱ')}
                    </text>
                </svg>
            );
            
        // --- COSMIC THEME (Legacy) ---
        case '💎':
        case 'DIAMOND':
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
        case 'BELL':
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
            return <div className="text-2xl sm:text-4xl text-white font-bold flex items-center justify-center h-full w-full opacity-80">{name}</div>;
    }
}

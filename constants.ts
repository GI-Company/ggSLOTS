
import { GameConfig, CoinPackage } from './types';
import coinPackages from './shared/coin-packages.json';

/** Stable catalog RNG so the lobby does not reshuffle on every refresh. */
function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rng = mulberry32(0x651075);

export const REEL_COUNT = 3;

// 5 Paylines: Top, Middle, Bottom, Diagonal TL-BR, Diagonal BL-TR
export const PAYLINES = [ 
  [[0,0], [0,1], [0,2]], 
  [[1,0], [1,1], [1,2]], 
  [[2,0], [2,1], [2,2]], 
  [[0,0], [1,1], [2,2]], 
  [[2,0], [1,1], [0,2]] 
];

export const WAGER_LEVELS = {
  SC: [0.10, 0.20, 0.50, 1.00, 2.00, 5.00, 10.00, 20.00, 50.00, 100.00],
  GC: [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]
};

// Plinko Constants
export const PLINKO_ROWS = 16; // Max rows supported by UI/Logic

export const COIN_PACKAGES: CoinPackage[] = coinPackages;

export const REDEMPTION_UNLOCK_PRICE = 49.99; // Adjusted for higher tiers
export const MIN_REDEMPTION = 50.00;

// --- GAME SPECIFIC ASSETS ---

interface GameData {
    strips: string[][];
    payouts: Record<string, number>;
}

// THEME GENERATORS
const BASE_SYMBOLS = ['🍒', '🍋', '🍊', '🍉', '🔔', '⭐', '💎', 'SCATTER'];
const EGYPT_SYMBOLS = ['10', 'J', 'Q', 'K', 'A', 'SCARAB', 'PHARAOH', 'SCATTER'];
const WILD_SYMBOLS = ['🌵', '🔫', '🤠', '💰', '🐴', '🥃', 'SHERIFF', 'SCATTER'];
const CANDY_SYMBOLS = ['🍬', '🍭', '🍫', '🍩', '🍪', '🧁', '🎂', 'SCATTER'];
const FRUIT_SYMBOLS = ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', 'SCATTER'];
const HORROR_SYMBOLS = ['🕯️', '⚰️', '🕷️', '🕸️', '🧛', '🧟', '👻', 'SCATTER'];
const JUNGLE_SYMBOLS = ['🌿', '🐍', '🦜', '🐵', '🐯', '🗿', '🏝️', 'SCATTER'];
const OCEAN_SYMBOLS = ['🐚', '🦀', '🐠', '🐙', '🦈', '🧜‍♀️', '🔱', 'SCATTER'];
const ZEUS_SYMBOLS = ['🏺', '🛡️', '⚔️', '🏛️', '⚡', '🦅', 'ZEUS', 'SCATTER'];
const NEON_SYMBOLS = ['A', 'B', 'C', '7', 'BAR', 'BELL', 'DIAMOND', 'SCATTER'];
const ASIAN_SYMBOLS = ['🎋', '🏮', '💴', '🧧', '🐢', '🐼', 'DRAGON', 'SCATTER'];
const AZTEC_SYMBOLS = ['🌽', '🗿', '🐆', '🦅', '👺', '🔥', 'TEMPLE', 'SCATTER'];
const DOG_SYMBOLS = ['🦴', '🎾', '🐕', '🐩', '🐶', '🥩', 'HOUSE', 'SCATTER'];
const CHILLI_SYMBOLS = ['🌮', '🌵', '🌶️', '🎸', '☀️', '💃', 'HOTSAUCE', 'SCATTER'];

const generateStrips = (symbols: string[], volatility: 'Low' | 'Medium' | 'High'): string[][] => {
    // Basic logic: Higher volatility = fewer high value symbols in strips
    const strips: string[][] = [[], [], []];
    const len = 60; // Increased strip length for more variance

    for(let r=0; r<3; r++) {
        for(let i=0; i<len; i++) {
            const roll = rng();
            if (roll < 0.035) {
                strips[r].push('WILD');
                continue;
            }
            let symIndex = 0;

            if (volatility === 'High') {
                if (roll < 0.07) symIndex = 7;
                else if (roll < 0.13) symIndex = 6;
                else if (roll < 0.22) symIndex = 5;
                else symIndex = Math.floor(rng() * 5);
            } else if (volatility === 'Medium') {
                 if (roll < 0.11) symIndex = 7;
                 else if (roll < 0.20) symIndex = 6;
                 else symIndex = Math.floor(rng() * 6);
            } else {
                 if (roll < 0.15) symIndex = 7;
                 else if (roll < 0.28) symIndex = 6;
                 else symIndex = Math.floor(rng() * 6);
            }
            strips[r].push(symbols[symIndex]);
        }
    }
    return strips;
};

const generatePayouts = (symbols: string[], volatility: 'Low' | 'Medium' | 'High') => {
    const mult = volatility === 'High' ? 1.5 : (volatility === 'Low' ? 0.8 : 1);
    return {
        [symbols[0]]: 2 * mult,
        [symbols[1]]: 4 * mult,
        [symbols[2]]: 5 * mult,
        [symbols[3]]: 8 * mult,
        [symbols[4]]: 15 * mult,
        [symbols[5]]: 40 * mult,
        [symbols[6]]: 150 * mult, // Jackpot Symbol
        'WILD': 80 * mult,
        'SCATTER': 0
    };
};

// Initial Mapped Game Data
const BASE_GAME_DATA: Record<string, GameData> = {
    'cosmic-cash': { strips: generateStrips(BASE_SYMBOLS, 'Medium'), payouts: generatePayouts(BASE_SYMBOLS, 'Medium') },
    'default': { strips: generateStrips(BASE_SYMBOLS, 'Medium'), payouts: generatePayouts(BASE_SYMBOLS, 'Medium') }
};

// Initial List with Categories
const INITIAL_GAMES_LIST: GameConfig[] = [
  // --- ADVANCED ORIGINALS ---
  { id: 'mines', title: 'Nebula Mines', image: '', tag: 'New', category: 'Instant', volatility: 'High', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'Pool', isDemo: true },
  { id: 'crash', title: 'Orbit Crash', image: '', tag: 'New', category: 'Instant', volatility: 'High', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'Pool', isDemo: true },
  { id: 'roulette', title: 'Solar Roulette', image: '', tag: 'New', category: 'Table', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x35', isDemo: true },

  // --- TABLE GAMES ---
  { id: 'blackjack', title: 'Cosmic Blackjack', image: '', tag: 'Table', category: 'Table', volatility: 'Low', minWager: '100 GC', maxWager: '500k GC', maxMultiplier: 'x2.5', isDemo: true },
  { id: 'video-poker', title: 'Jacks or Better', image: '', tag: 'Table', category: 'Table', volatility: 'Medium', minWager: '100 GC', maxWager: '50k GC', maxMultiplier: 'x800', isDemo: true },
  
  // --- INSTANT GAMES ---
  { id: 'bingo-blast', title: 'Bingo Blast', image: '', tag: 'Instant', category: 'Instant', volatility: 'Low', minWager: '500 GC', maxWager: '50k GC', maxMultiplier: 'x1,000', isDemo: true },
  { id: 'plinko', title: 'Plinko Classic', image: '', tag: 'Original', category: 'Instant', volatility: 'Variable', minWager: '100 GC', maxWager: '10M GC', maxMultiplier: 'x1,000', isDemo: true },
  { id: 'plinko-x', title: 'Plinko X', image: '', tag: 'High Risk', category: 'Instant', volatility: 'High', minWager: '100 GC', maxWager: '10M GC', maxMultiplier: 'x10,000', isDemo: true },
  { id: 'plinko-party', title: 'Plinko Party', image: '', tag: 'Fun', category: 'Instant', volatility: 'Low', minWager: '100 GC', maxWager: '10M GC', maxMultiplier: 'x500', isDemo: true },
  { id: 'scratch-cosmic', title: 'Cosmic Scratch', image: '', tag: 'Instant', category: 'Instant', volatility: 'Variable', minWager: '500 GC', maxWager: 'GC demo only', maxMultiplier: 'x2,000', isDemo: true },
  { id: 'scratch-777', title: 'Lucky 7s', image: '', tag: 'Instant', category: 'Instant', volatility: 'High', minWager: '1k GC', maxWager: 'GC demo only', maxMultiplier: 'x5,000', isDemo: true },
  { id: 'scratch-gold', title: 'Gold Rush', image: '', tag: 'Instant', category: 'Instant', volatility: 'Medium', minWager: '500 GC', maxWager: 'GC demo only', maxMultiplier: 'x1,000', isDemo: true },
  { id: 'scratch-neon', title: 'Neon Scratch', image: '', tag: 'Instant', category: 'Instant', volatility: 'Low', minWager: '200 GC', maxWager: 'GC demo only', maxMultiplier: 'x500', isDemo: true },
  { id: 'scratch-zombie', title: 'Zombie Scratch', image: '', tag: 'Instant', category: 'Instant', volatility: 'High', minWager: '500 GC', maxWager: 'GC demo only', maxMultiplier: 'x10,000', isDemo: true },
  { id: 'scratch-diamond', title: 'Diamond Dreams', image: '', tag: 'Instant', category: 'Instant', volatility: 'Very High', minWager: '2k GC', maxWager: 'GC demo only', maxMultiplier: 'x20,000', isDemo: true },

  // --- SLOTS ---
  { id: 'cosmic-cash', title: 'Cosmic Cash', image: '', tag: 'Popular', category: 'Slots', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x1,200', isDemo: true, style: { background: 'linear-gradient(to bottom, #1e1b4b, #312e81, #0f172a)', accentColor: '#6366f1' } },
  { id: 'pyramid-riches', title: 'Pyramid Riches', image: '', tag: 'Hot', category: 'Slots', volatility: 'High', minWager: '200 GC', maxWager: '2M GC', maxMultiplier: 'x2,500', isDemo: false, style: { background: 'linear-gradient(to bottom, #451a03, #78350f, #0f172a)', accentColor: '#f59e0b' } },
  { id: 'viking-victory', title: 'Viking Victory', image: '', tag: '', category: 'Slots', volatility: 'Medium', minWager: '50 GC', maxWager: '500k GC', maxMultiplier: 'x800', isDemo: false, style: { background: 'linear-gradient(to bottom, #1e293b, #334155, #020617)', accentColor: '#94a3b8' } },
];

// --- PROCEDURAL GENERATION ENGINE ---
const generateGames = () => {
    const adjectives = ['Golden', 'Mystic', 'Super', 'Mega', 'Royal', 'Wild', 'Cyber', 'Neon', 'Ancient', 'Lucky', 'Epic', 'Magic', 'Turbo', 'Shadow', 'Solar'];
    const nouns = ['Fortune', 'Dragon', 'Joker', 'Fruits', 'Quest', 'Kingdom', 'Empire', 'Legends', 'Bonanza', 'Riches', 'Diamond', 'Storm', 'Thunder', 'Wolf', 'Tiger'];
    const themes = [
        { id: 'egypt', symbols: EGYPT_SYMBOLS, bg: ['#451a03', '#78350f'] },
        { id: 'wild', symbols: WILD_SYMBOLS, bg: ['#422006', '#713f12'] },
        { id: 'candy', symbols: CANDY_SYMBOLS, bg: ['#f9a8d4', '#ec4899'] },
        { id: 'fruit', symbols: FRUIT_SYMBOLS, bg: ['#be123c', '#e11d48'] },
        { id: 'horror', symbols: HORROR_SYMBOLS, bg: ['#312e81', '#1e1b4b'] },
        { id: 'jungle', symbols: JUNGLE_SYMBOLS, bg: ['#14532d', '#166534'] },
        { id: 'ocean', symbols: OCEAN_SYMBOLS, bg: ['#0c4a6e', '#0284c7'] },
        { id: 'zeus', symbols: ZEUS_SYMBOLS, bg: ['#1e3a8a', '#2563eb'] },
        { id: 'neon', symbols: NEON_SYMBOLS, bg: ['#2e1065', '#7e22ce'] },
        { id: 'asian', symbols: ASIAN_SYMBOLS, bg: ['#7f1d1d', '#b91c1c'] },
        { id: 'aztec', symbols: AZTEC_SYMBOLS, bg: ['#78350f', '#d97706'] },
        { id: 'dog', symbols: DOG_SYMBOLS, bg: ['#065f46', '#10b981'] },
        { id: 'chilli', symbols: CHILLI_SYMBOLS, bg: ['#991b1b', '#ef4444'] }
    ];

    const newGames: GameConfig[] = [];
    const newGameData: Record<string, GameData> = {};

    // Generate 50 Unique Slots
    for (let i = 0; i < 50; i++) {
        const theme = themes[Math.floor(rng() * themes.length)];
        const adj = adjectives[Math.floor(rng() * adjectives.length)];
        const noun = nouns[Math.floor(rng() * nouns.length)];
        const title = `${adj} ${noun}`;
        const id = `${adj}-${noun}-${theme.id}-${i}`.toLowerCase();

        const vol = rng() > 0.6 ? 'High' : (rng() > 0.3 ? 'Medium' : 'Low');
        const maxMult = vol === 'High' ? 'x5,000' : (vol === 'Medium' ? 'x2,000' : 'x800');

        // Config
        newGames.push({
            id,
            title,
            image: '',
            tag: i % 7 === 0 ? 'New' : (i % 5 === 0 ? 'Hot' : undefined),
            category: 'Slots',
            volatility: vol,
            minWager: '100 GC',
            maxWager: '100k GC',
            maxMultiplier: maxMult,
            isDemo: rng() > 0.35,
            style: {
                background: `linear-gradient(to bottom, ${theme.bg[0]}, ${theme.bg[1]}, #020617)`,
                accentColor: theme.bg[1],
                symbolSet: theme.id
            }
        });

        // Data
        newGameData[id] = {
            strips: generateStrips(theme.symbols, vol as any),
            payouts: generatePayouts(theme.symbols, vol as any)
        };
    }

    return { newGames, newGameData };
};

const generated = generateGames();

export const GAMES_LIST = [...INITIAL_GAMES_LIST, ...generated.newGames];
export const GAME_DATA = { ...BASE_GAME_DATA, ...generated.newGameData };

// Export current strips for the component to use (default fallback)
export const REEL_STRIPS = GAME_DATA['cosmic-cash'].strips; 
export const PAYOUTS = GAME_DATA['cosmic-cash'].payouts;

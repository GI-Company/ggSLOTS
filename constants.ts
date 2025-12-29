
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

export const COIN_PACKAGES = [ 
  { price: 2.99, gcAmount: 3000, scAmount: 3.00, isBestValue: false }, 
  { price: 9.99, gcAmount: 10000, scAmount: 10.00, isBestValue: false }, 
  { price: 19.99, gcAmount: 22000, scAmount: 21.00, isBestValue: true }, 
  { price: 49.99, gcAmount: 55000, scAmount: 52.00, isBestValue: false }, 
  { price: 99.99, gcAmount: 120000, scAmount: 105.00, isBestValue: false }
];

export const REDEMPTION_UNLOCK_PRICE = 9.99;
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
// New Sets
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
            const rand = Math.random();
            let symIndex = 0;
            
            if (volatility === 'High') {
                if (rand < 0.04) symIndex = 7; // Scatter (Very Rare)
                else if (rand < 0.10) symIndex = 6; // Jackpot Symbol
                else if (rand < 0.20) symIndex = 5;
                else symIndex = Math.floor(Math.random() * 5); // Low symbols mostly
            } else if (volatility === 'Medium') {
                 if (rand < 0.08) symIndex = 7; // Scatter
                 else if (rand < 0.18) symIndex = 6;
                 else symIndex = Math.floor(Math.random() * 6);
            } else {
                 // Low Volatility: More balanced
                 if (rand < 0.12) symIndex = 7; // Scatter (Common)
                 else if (rand < 0.25) symIndex = 6;
                 else symIndex = Math.floor(Math.random() * 6);
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
        'SCATTER': 0
    };
};

// FULLY MAPPED GAME DATA
export const GAME_DATA: Record<string, GameData> = {
    // Existing
    'cosmic-cash': { strips: generateStrips(BASE_SYMBOLS, 'Medium'), payouts: generatePayouts(BASE_SYMBOLS, 'Medium') },
    'pyramid-riches': { strips: generateStrips(EGYPT_SYMBOLS, 'High'), payouts: generatePayouts(EGYPT_SYMBOLS, 'High') },
    'viking-victory': { strips: generateStrips(['RUNE1', 'RUNE2', 'RUNE3', 'HELMET', 'SHIELD', 'AXE', 'ODIN', 'SCATTER'], 'Medium'), payouts: generatePayouts(['RUNE1', 'RUNE2', 'RUNE3', 'HELMET', 'SHIELD', 'AXE', 'ODIN', 'SCATTER'], 'Medium') },
    'ocean-fortune': { strips: generateStrips(OCEAN_SYMBOLS, 'Low'), payouts: generatePayouts(OCEAN_SYMBOLS, 'Low') },
    'dragon-hoard': { strips: generateStrips(ASIAN_SYMBOLS, 'High'), payouts: generatePayouts(ASIAN_SYMBOLS, 'High') },

    // New Mappings
    'neon-nights': { strips: generateStrips(NEON_SYMBOLS, 'High'), payouts: generatePayouts(NEON_SYMBOLS, 'High') },
    'buffalo-stampede': { strips: generateStrips(WILD_SYMBOLS, 'High'), payouts: generatePayouts(WILD_SYMBOLS, 'High') },
    'fruit-frenzy': { strips: generateStrips(FRUIT_SYMBOLS, 'Low'), payouts: generatePayouts(FRUIT_SYMBOLS, 'Low') },
    'jokers-jewels': { strips: generateStrips(BASE_SYMBOLS, 'Medium'), payouts: generatePayouts(BASE_SYMBOLS, 'Medium') },
    'wolf-run': { strips: generateStrips(JUNGLE_SYMBOLS, 'Medium'), payouts: generatePayouts(JUNGLE_SYMBOLS, 'Medium') },
    'cleos-gold': { strips: generateStrips(EGYPT_SYMBOLS, 'High'), payouts: generatePayouts(EGYPT_SYMBOLS, 'High') },
    'zeus-thunder': { strips: generateStrips(ZEUS_SYMBOLS, 'High'), payouts: generatePayouts(ZEUS_SYMBOLS, 'High') },
    '777-deluxe': { strips: generateStrips(BASE_SYMBOLS, 'Low'), payouts: generatePayouts(BASE_SYMBOLS, 'Low') },
    'panda-fortune': { strips: generateStrips(ASIAN_SYMBOLS, 'Medium'), payouts: generatePayouts(ASIAN_SYMBOLS, 'Medium') },
    'chilli-heat': { strips: generateStrips(CHILLI_SYMBOLS, 'Medium'), payouts: generatePayouts(CHILLI_SYMBOLS, 'Medium') },
    'sweet-bonanza': { strips: generateStrips(CANDY_SYMBOLS, 'High'), payouts: generatePayouts(CANDY_SYMBOLS, 'High') },
    'dead-or-alive': { strips: generateStrips(WILD_SYMBOLS, 'High'), payouts: generatePayouts(WILD_SYMBOLS, 'High') },
    'starburst-xx': { strips: generateStrips(BASE_SYMBOLS, 'Low'), payouts: generatePayouts(BASE_SYMBOLS, 'Low') },
    'gonzos-quest': { strips: generateStrips(AZTEC_SYMBOLS, 'Medium'), payouts: generatePayouts(AZTEC_SYMBOLS, 'Medium') },
    'book-of-dead': { strips: generateStrips(EGYPT_SYMBOLS, 'High'), payouts: generatePayouts(EGYPT_SYMBOLS, 'High') },
    'rise-of-olympus': { strips: generateStrips(ZEUS_SYMBOLS, 'High'), payouts: generatePayouts(ZEUS_SYMBOLS, 'High') },
    'fire-joker': { strips: generateStrips(BASE_SYMBOLS, 'Medium'), payouts: generatePayouts(BASE_SYMBOLS, 'Medium') },
    'legacy-of-dead': { strips: generateStrips(EGYPT_SYMBOLS, 'High'), payouts: generatePayouts(EGYPT_SYMBOLS, 'High') },
    'mustang-gold': { strips: generateStrips(WILD_SYMBOLS, 'Medium'), payouts: generatePayouts(WILD_SYMBOLS, 'Medium') },
    'the-dog-house': { strips: generateStrips(DOG_SYMBOLS, 'High'), payouts: generatePayouts(DOG_SYMBOLS, 'High') },
    'underwater-gold': { strips: generateStrips(OCEAN_SYMBOLS, 'Medium'), payouts: generatePayouts(OCEAN_SYMBOLS, 'Medium') },
    'halloween-fortune': { strips: generateStrips(HORROR_SYMBOLS, 'Medium'), payouts: generatePayouts(HORROR_SYMBOLS, 'Medium') },
    
    // Default fallback
    'default': { strips: generateStrips(BASE_SYMBOLS, 'Medium'), payouts: generatePayouts(BASE_SYMBOLS, 'Medium') }
};

export const GAMES_LIST = [
  // --- TABLE GAMES ---
  { id: 'blackjack', title: 'Cosmic Blackjack', image: '', tag: 'Table', volatility: 'Low', minWager: '100 GC', maxWager: '500k GC', maxMultiplier: 'x2.5', isDemo: true },
  { id: 'video-poker', title: 'Jacks or Better', image: '', tag: 'Table', volatility: 'Medium', minWager: '100 GC', maxWager: '50k GC', maxMultiplier: 'x800', isDemo: true },
  
  // --- PLINKO ---
  { id: 'plinko', title: 'Plinko Classic', image: '', tag: 'Original', volatility: 'Variable', minWager: '100 GC', maxWager: '10M GC', maxMultiplier: 'x1,000', isDemo: true },
  { id: 'plinko-x', title: 'Plinko X', image: '', tag: 'High Risk', volatility: 'High', minWager: '100 GC', maxWager: '10M GC', maxMultiplier: 'x10,000', isDemo: true },
  { id: 'plinko-party', title: 'Plinko Party', image: '', tag: 'Fun', volatility: 'Low', minWager: '100 GC', maxWager: '10M GC', maxMultiplier: 'x500', isDemo: true },
  
  // --- SCRATCHERS ---
  { id: 'scratch-cosmic', title: 'Cosmic Scratch', image: '', tag: 'Instant', volatility: 'Variable', minWager: '500 GC', maxWager: '1 SC', maxMultiplier: 'x2,000', isDemo: true },
  { id: 'scratch-777', title: 'Lucky 7s', image: '', tag: 'Instant', volatility: 'High', minWager: '1k GC', maxWager: '5 SC', maxMultiplier: 'x5,000', isDemo: true },
  { id: 'scratch-gold', title: 'Gold Rush', image: '', tag: 'Instant', volatility: 'Medium', minWager: '500 GC', maxWager: '2 SC', maxMultiplier: 'x1,000', isDemo: true },
  { id: 'scratch-neon', title: 'Neon Scratch', image: '', tag: 'Instant', volatility: 'Low', minWager: '200 GC', maxWager: '1 SC', maxMultiplier: 'x500', isDemo: true },
  { id: 'scratch-zombie', title: 'Zombie Scratch', image: '', tag: 'Instant', volatility: 'High', minWager: '500 GC', maxWager: '2 SC', maxMultiplier: 'x10,000', isDemo: true },
  { id: 'scratch-diamond', title: 'Diamond Dreams', image: '', tag: 'Instant', volatility: 'Very High', minWager: '2k GC', maxWager: '10 SC', maxMultiplier: 'x20,000', isDemo: true },

  // --- SLOTS (EXISTING) ---
  { id: 'cosmic-cash', title: 'Cosmic Cash', image: '', tag: 'Popular', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x1,200', isDemo: true },
  { id: 'pyramid-riches', title: 'Pyramid Riches', image: '', tag: 'Hot', volatility: 'High', minWager: '200 GC', maxWager: '2M GC', maxMultiplier: 'x2,500', isDemo: false },
  { id: 'viking-victory', title: 'Viking Victory', image: '', tag: '', volatility: 'Medium', minWager: '50 GC', maxWager: '500k GC', maxMultiplier: 'x800', isDemo: false },
  { id: 'ocean-fortune', title: 'Ocean\'s Fortune', image: '', tag: 'Jackpot', volatility: 'Low', minWager: '100 GC', maxWager: '1.5M GC', maxMultiplier: 'x500', isDemo: false },
  { id: 'dragon-hoard', title: 'Dragon\'s Hoard', image: '', tag: 'Hot', volatility: 'Very High', minWager: '1k GC', maxWager: '10M GC', maxMultiplier: 'x5,000', isDemo: false },

  // --- SLOTS (NEW) ---
  { id: 'neon-nights', title: 'Neon Nights', image: '', tag: 'New', volatility: 'High', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x5,000', isDemo: true },
  { id: 'buffalo-stampede', title: 'Buffalo Stampede', image: '', tag: 'Trending', volatility: 'High', minWager: '200 GC', maxWager: '200k GC', maxMultiplier: 'x4,000', isDemo: false },
  { id: 'fruit-frenzy', title: 'Fruit Frenzy', image: '', tag: 'Classic', volatility: 'Low', minWager: '50 GC', maxWager: '50k GC', maxMultiplier: 'x500', isDemo: true },
  { id: 'jokers-jewels', title: 'Joker\'s Jewels', image: '', tag: 'Classic', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x1,000', isDemo: false },
  { id: 'wolf-run', title: 'Wolf Run', image: '', tag: 'Nature', volatility: 'Medium', minWager: '100 GC', maxWager: '150k GC', maxMultiplier: 'x2,000', isDemo: false },
  { id: 'cleos-gold', title: 'Cleo\'s Gold', image: '', tag: 'Egypt', volatility: 'High', minWager: '200 GC', maxWager: '500k GC', maxMultiplier: 'x3,000', isDemo: false },
  { id: 'zeus-thunder', title: 'Zeus Thunder', image: '', tag: 'Gods', volatility: 'High', minWager: '500 GC', maxWager: '1M GC', maxMultiplier: 'x5,000', isDemo: false },
  { id: '777-deluxe', title: '777 Deluxe', image: '', tag: 'Classic', volatility: 'Low', minWager: '100 GC', maxWager: '50k GC', maxMultiplier: 'x800', isDemo: true },
  { id: 'panda-fortune', title: 'Panda Fortune', image: '', tag: 'Asian', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x1,500', isDemo: false },
  { id: 'chilli-heat', title: 'Chilli Heat', image: '', tag: 'Spicy', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x2,500', isDemo: false },
  { id: 'sweet-bonanza', title: 'Sweet Bonanza', image: '', tag: 'Candy', volatility: 'High', minWager: '200 GC', maxWager: '200k GC', maxMultiplier: 'x21,000', isDemo: false },
  { id: 'dead-or-alive', title: 'Dead or Alive', image: '', tag: 'Wild West', volatility: 'High', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x10,000', isDemo: false },
  { id: 'starburst-xx', title: 'Starburst XX', image: '', tag: 'Space', volatility: 'Low', minWager: '50 GC', maxWager: '50k GC', maxMultiplier: 'x500', isDemo: true },
  { id: 'gonzos-quest', title: 'Gonzo\'s Quest', image: '', tag: 'Adventure', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x2,500', isDemo: false },
  { id: 'book-of-dead', title: 'Book of Dead', image: '', tag: 'Egypt', volatility: 'High', minWager: '200 GC', maxWager: '500k GC', maxMultiplier: 'x5,000', isDemo: false },
  { id: 'rise-of-olympus', title: 'Rise of Olympus', image: '', tag: 'Gods', volatility: 'High', minWager: '200 GC', maxWager: '500k GC', maxMultiplier: 'x5,000', isDemo: false },
  { id: 'fire-joker', title: 'Fire Joker', image: '', tag: 'Classic', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x800', isDemo: false },
  { id: 'legacy-of-dead', title: 'Legacy of Dead', image: '', tag: 'Egypt', volatility: 'High', minWager: '200 GC', maxWager: '500k GC', maxMultiplier: 'x5,000', isDemo: false },
  { id: 'mustang-gold', title: 'Mustang Gold', image: '', tag: 'Nature', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x2,000', isDemo: false },
  { id: 'the-dog-house', title: 'The Dog House', image: '', tag: 'Cute', volatility: 'High', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x6,750', isDemo: false },
  { id: 'underwater-gold', title: 'Underwater Gold', image: '', tag: 'Ocean', volatility: 'Medium', minWager: '100 GC', maxWager: '200k GC', maxMultiplier: 'x1,000', isDemo: false },
  { id: 'halloween-fortune', title: 'Halloween Fortune', image: '', tag: 'Spooky', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x1,000', isDemo: false }
];

// Export current strips for the component to use
export const REEL_STRIPS = GAME_DATA['cosmic-cash'].strips; 
export const PAYOUTS = GAME_DATA['cosmic-cash'].payouts;

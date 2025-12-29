
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
export const PLINKO_ROWS = 12;
// 13 Buckets for 12 Rows. Ends are high risk/reward.
export const PLINKO_MULTIPLIERS = [100, 25, 10, 5, 2, 0.5, 0.2, 0.5, 2, 5, 10, 25, 100];

export const GAMES_LIST = [
  { id: 'scratch-cosmic', title: 'Cosmic Scratch', image: '400x500/0f172a/f59e0b?text=Scratch', tag: 'Instant', volatility: 'Variable', minWager: '500 GC', maxWager: '1 SC', maxMultiplier: 'x2,000', isDemo: true },
  { id: 'plinko', title: 'Plinko', image: '400x500/0f172a/ec4899?text=Plinko', tag: 'New', volatility: 'Variable', minWager: '100 GC', maxWager: '10M GC', maxMultiplier: 'x100', isDemo: true },
  { id: 'blackjack', title: 'Cosmic Blackjack', image: '400x500/0f172a/10b981?text=Blackjack', tag: 'Table', volatility: 'Low', minWager: '100 GC', maxWager: '500k GC', maxMultiplier: 'x2.5', isDemo: true },
  { id: 'cosmic-cash', title: 'Cosmic Cash', image: '400x500/1e293b/4f46e5?text=Cosmic+Cash', tag: 'Popular', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x5,000', isDemo: true },
  { id: 'pyramid-riches', title: 'Pyramid Riches', image: '400x500/1e293b/f59e0b?text=Pyramid+Riches', tag: 'Hot', volatility: 'High', minWager: '200 GC', maxWager: '2M GC', maxMultiplier: 'x10,000', isDemo: false },
  { id: 'viking-victory', title: 'Viking Victory', image: '400x500/1e293b/be185d?text=Viking+Victory', tag: '', volatility: 'Medium', minWager: '50 GC', maxWager: '500k GC', maxMultiplier: 'x2,500', isDemo: false },
  { id: 'ocean-fortune', title: 'Ocean\'s Fortune', image: '400x500/1e293b/10b981?text=Ocean\'s+Fortune', tag: 'Jackpot', volatility: 'Low', minWager: '100 GC', maxWager: '1.5M GC', maxMultiplier: 'x1,500', isDemo: false },
  { id: 'dragon-hoard', title: 'Dragon\'s Hoard', image: '400x500/1e293b/dc2626?text=Dragon\'s+Hoard', tag: 'Hot', volatility: 'Very High', minWager: '1k GC', maxWager: '10M GC', maxMultiplier: 'x50,000', isDemo: false },
];

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

// Fallback / Cosmic Theme
const COSMIC_STRIPS = [
  ['💎','SCATTER','🍒','🍊','🍋','🔔','🍒','⭐','🍉','🍒','🍋','🍊','SCATTER','🍒','💎','🍉','🔔','🍊','🍋','🍒','⭐', '🍒', '🍋', '🍊', 'SCATTER'],
  ['🍒','🍊','🍋','🔔','SCATTER','🍒','⭐','🍉','🍒','🍋','💎','🍊','SCATTER','🍒','💎','🍉','🔔','🍊','🍋','🍒','⭐', '🍒', '🍋', '🍊', 'SCATTER'],
  ['💎','SCATTER','🍒','🍊','🍋','🔔','🍒','⭐','🍉','🍒','🍋','🍊','SCATTER','🍒','💎','🍉','🔔','🍊','🍋','🍒','⭐', '🍒', '🍋', '🍊', 'SCATTER']
];
const COSMIC_PAYOUTS = { '🍒': 2, '🍋': 4, '🍊': 6, '🍉': 8, '🔔': 20, '⭐': 40, '💎': 80, 'SCATTER': 0 };

// Egyptian Theme
const PYRAMID_STRIPS = [
    ['PHARAOH', 'SCATTER', 'ANKH', 'SCARAB', 'EYE', '10', 'J', 'Q', 'K', 'A', 'PHARAOH', 'SCARAB', 'SCATTER', 'ANKH'],
    ['SCARAB', 'EYE', '10', 'J', 'Q', 'SCATTER', 'K', 'A', 'PHARAOH', 'ANKH', 'SCARAB', 'EYE', 'SCATTER', '10'],
    ['EYE', 'SCATTER', '10', 'J', 'Q', 'K', 'A', 'PHARAOH', 'ANKH', 'SCARAB', 'SCATTER', 'EYE', 'PHARAOH', 'J']
];
const PYRAMID_PAYOUTS = { '10': 2, 'J': 3, 'Q': 4, 'K': 5, 'A': 6, 'SCARAB': 15, 'EYE': 25, 'ANKH': 50, 'PHARAOH': 100, 'SCATTER': 0 };

// Viking Theme
const VIKING_STRIPS = [
    ['ODIN', 'SCATTER', 'AXE', 'SHIELD', 'HELMET', 'RUNE1', 'RUNE2', 'RUNE3', 'ODIN', 'AXE', 'SCATTER', 'SHIELD'],
    ['SHIELD', 'HELMET', 'RUNE1', 'SCATTER', 'RUNE2', 'RUNE3', 'ODIN', 'AXE', 'SHIELD', 'HELMET', 'SCATTER', 'RUNE1'],
    ['AXE', 'SCATTER', 'SHIELD', 'HELMET', 'RUNE1', 'RUNE2', 'RUNE3', 'ODIN', 'SCATTER', 'AXE', 'HELMET', 'RUNE2']
];
const VIKING_PAYOUTS = { 'RUNE1': 2, 'RUNE2': 3, 'RUNE3': 4, 'HELMET': 12, 'SHIELD': 20, 'AXE': 45, 'ODIN': 90, 'SCATTER': 0 };

export const GAME_DATA: Record<string, GameData> = {
    'cosmic-cash': { strips: COSMIC_STRIPS, payouts: COSMIC_PAYOUTS },
    'pyramid-riches': { strips: PYRAMID_STRIPS, payouts: PYRAMID_PAYOUTS },
    'viking-victory': { strips: VIKING_STRIPS, payouts: VIKING_PAYOUTS },
    // Fallbacks for others
    'ocean-fortune': { strips: COSMIC_STRIPS, payouts: COSMIC_PAYOUTS },
    'dragon-hoard': { strips: COSMIC_STRIPS, payouts: COSMIC_PAYOUTS },
    'default': { strips: COSMIC_STRIPS, payouts: COSMIC_PAYOUTS }
};

// Export current strips for the component to use
export const REEL_STRIPS = COSMIC_STRIPS; 
export const PAYOUTS = COSMIC_PAYOUTS;

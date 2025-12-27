export const REEL_COUNT = 3;

// Exact Reel Strips from original design
export const REEL_STRIPS = [
  ['💎','BONUS','🍒','🍊','🍋','🔔','🍒','⭐','🍉','🍒','🍋','🍊','BONUS','🍒','💎','🍉','🔔','🍊','🍋','🍒','⭐', '🍒', '🍋', '🍊', 'BONUS'],
  ['🍒','🍊','🍋','🔔','BONUS','🍒','⭐','🍉','🍒','🍋','💎','🍊','BONUS','🍒','💎','🍉','🔔','🍊','🍋','🍒','⭐', '🍒', '🍋', '🍊', 'BONUS'],
  ['💎','BONUS','🍒','🍊','🍋','🔔','🍒','⭐','🍉','🍒','🍋','🍊','BONUS','🍒','💎','🍉','🔔','🍊','🍋','🍒','⭐', '🍒', '🍋', '🍊', 'BONUS']
];

export const PAYOUTS: Record<string, number> = { 
  '🍒': 2, '🍋': 4, '🍊': 6, '🍉': 8, '🔔': 20, '⭐': 40, '💎': 80, 'BONUS': 10 
};

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

export const GAMES_LIST = [
  // isDemo: true allows play without account
  { id: 'cosmic-cash', title: 'Cosmic Cash', image: '400x500/1e293b/4f46e5?text=Cosmic+Cash', tag: 'New', volatility: 'Medium', minWager: '100 GC', maxWager: '100k GC', maxMultiplier: 'x5,000', isDemo: true },
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

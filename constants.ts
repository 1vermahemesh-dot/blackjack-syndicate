
import { Theme, Rank, Suit } from './types';

export const THEMES: Theme[] = [
  {
    id: 'crimson',
    name: 'Crimson Vipers',
    primaryColor: '#ef4444', // red-500
    secondaryColor: '#450a0a', // red-950
    gradient: 'from-red-600 via-red-900 to-black',
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
    powerUpName: 'Blood Swap',
    powerUpDescription: 'Swap your last card with the next one in the deck.',
    powerUpId: 'swap',
    icon: '🐍',
    chargeCost: 3,
    voiceGender: 'male',
  },
  {
    id: 'sapphire',
    name: 'Sapphire Sentinels',
    primaryColor: '#3b82f6', // blue-500
    secondaryColor: '#172554', // blue-950
    gradient: 'from-blue-600 via-blue-900 to-black',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500',
    powerUpName: 'Ice Shield',
    powerUpDescription: 'If you lose, recover 50% of your bet.',
    powerUpId: 'shield',
    icon: '🛡️',
    chargeCost: 2,
    voiceGender: 'female',
  },
  {
    id: 'emerald',
    name: 'Emerald Enforcers',
    primaryColor: '#22c55e', // green-500
    secondaryColor: '#052e16', // green-950
    gradient: 'from-green-600 via-green-900 to-black',
    textColor: 'text-green-500',
    borderColor: 'border-green-500',
    powerUpName: 'Greed Multiplier',
    powerUpDescription: 'Win 2x payout on this hand (excluding Blackjack).',
    powerUpId: 'greed',
    icon: '💎',
    chargeCost: 5,
    voiceGender: 'male',
  },
  {
    id: 'neon',
    name: 'Neon Drifters',
    primaryColor: '#06b6d4', // cyan-500
    secondaryColor: '#083344', // cyan-950
    gradient: 'from-cyan-500 via-cyan-900 to-black',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-400',
    powerUpName: 'Quantum Reset',
    powerUpDescription: 'Mulligan: Discard your hand and draw 2 fresh cards.',
    powerUpId: 'mulligan',
    icon: '💠',
    chargeCost: 4,
    voiceGender: 'female',
  },
  {
    id: 'void',
    name: 'Void Walkers',
    primaryColor: '#a855f7', // purple-500
    secondaryColor: '#3b0764', // purple-950
    gradient: 'from-purple-600 via-purple-900 to-black',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500',
    powerUpName: 'True Sight',
    powerUpDescription: 'Reveal the Dealer\'s hole card immediately.',
    powerUpId: 'vision',
    icon: '👁️',
    chargeCost: 1,
    voiceGender: 'male',
  },
  {
    id: 'amber',
    name: 'Amber Ascendants',
    primaryColor: '#f97316', // orange-500
    secondaryColor: '#431407', // orange-950
    gradient: 'from-orange-500 via-orange-900 to-black',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
    powerUpName: 'Time Warp',
    powerUpDescription: 'Rewind time: Undo your last HIT if you bust or regret it.',
    powerUpId: 'undo',
    icon: '⏳',
    chargeCost: 5,
    voiceGender: 'male',
  },
  {
    id: 'solar',
    name: 'Solar Flares',
    primaryColor: '#eab308', // yellow-500
    secondaryColor: '#422006', // yellow-950
    gradient: 'from-yellow-500 via-yellow-900 to-black',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500',
    powerUpName: 'AI Oracle',
    powerUpDescription: 'Ask Gemini AI for the statistically best move.',
    powerUpId: 'oracle',
    icon: '☀️',
    chargeCost: 1,
    voiceGender: 'female',
  },
  {
    id: 'shadow',
    name: 'Amoled Syndicate',
    primaryColor: '#ffffff', // white
    secondaryColor: '#000000', // black
    gradient: 'from-gray-800 via-gray-900 to-black',
    textColor: 'text-white',
    borderColor: 'border-white',
    powerUpName: 'Shadow Step',
    powerUpDescription: 'Busting on 22 counts as a Push instead of a Loss.',
    powerUpId: 'shadow',
    icon: '🌑',
    chargeCost: 2,
    voiceGender: 'male',
  },
];

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const VALUES: Record<Rank, number> = {
  'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10
};

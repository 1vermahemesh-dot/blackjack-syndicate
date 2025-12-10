
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  isHidden?: boolean;
}

export type GameStatus = 'betting' | 'playing' | 'dealerTurn' | 'gameOver';

export interface Theme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  gradient: string;
  textColor: string;
  borderColor: string;
  powerUpName: string;
  powerUpDescription: string;
  powerUpId: 'swap' | 'shield' | 'greed' | 'vision' | 'oracle' | 'shadow' | 'undo' | 'mulligan';
  icon: string;
  chargeCost: number;
  voiceGender: 'male' | 'female';
}

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  status: GameStatus;
  bet: number;
  balance: number;
  message: string;
  powerUpUsed: boolean;
  history: string[];
}

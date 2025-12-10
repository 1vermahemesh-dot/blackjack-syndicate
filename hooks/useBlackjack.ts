
import { useState, useCallback } from 'react';
import { Card, GameStatus, Rank, Suit } from '../types';
import { RANKS, SUITS, VALUES } from '../constants';

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 9)}`,
        suit,
        rank,
        value: VALUES[rank],
      });
    });
  });
  return shuffle(deck);
};

const shuffle = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const calculateScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;
  hand.forEach(card => {
    if (card.isHidden) return;
    score += card.value;
    if (card.rank === 'A') aces += 1;
  });
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
};

export const useBlackjack = () => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [status, setStatus] = useState<GameStatus>('betting');
  const [bet, setBet] = useState(0);
  const [balance, setBalance] = useState(1000);
  const [message, setMessage] = useState('');
  const [powerUpUsed, setPowerUpUsed] = useState(false);
  const [winner, setWinner] = useState<'player' | 'dealer' | 'push' | null>(null);
  const [charges, setCharges] = useState(3); // Start with 3 charges to allow early play

  const initGame = useCallback(() => {
    setDeck(createDeck());
    setPlayerHand([]);
    setDealerHand([]);
    setStatus('betting');
    setBet(0);
    setMessage('Place your bet to start');
    setPowerUpUsed(false);
    setWinner(null);
  }, []);

  const placeBet = (amount: number) => {
    if (balance >= amount) {
      setBet(amount);
      setBalance(prev => prev - amount);
      dealInitialCards(createDeck());
    } else {
      setMessage("Insufficient funds!");
    }
  };

  const dealInitialCards = (newDeck: Card[]) => {
    const pHand = [newDeck.pop()!, newDeck.pop()!];
    const dHand = [newDeck.pop()!, { ...newDeck.pop()!, isHidden: true }];
    
    setDeck(newDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setStatus('playing');
    setMessage('Your move');

    // Check for natural blackjack
    const pScore = calculateScore(pHand);
    if (pScore === 21) {
      handleStand(pHand, dHand, newDeck); 
    }
  };

  const hit = () => {
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(newDeck);

    if (calculateScore(newHand) > 21) {
      endGame(newHand, dealerHand, 'bust');
    }
  };

  const undoHit = () => {
    if (playerHand.length <= 2 || powerUpUsed) return false;
    
    const newHand = [...playerHand];
    newHand.pop(); // Remove the last card
    setPlayerHand(newHand);
    setPowerUpUsed(true);

    // Check if we need to revert game over state (if we were busted)
    if (status === 'gameOver' || winner === 'dealer') {
        setStatus('playing');
        setWinner(null);
        setMessage("Time rewound. Your move.");
    } else {
        setMessage("Time rewound.");
    }
    return true;
  };

  const stand = () => {
    handleStand(playerHand, dealerHand, deck);
  };

  const handleStand = async (pHand: Card[], dHand: Card[], currentDeck: Card[]) => {
    setStatus('dealerTurn');
    let currentDealerHand = [...dHand];
    
    // Reveal hidden card
    currentDealerHand[1].isHidden = false;
    setDealerHand([...currentDealerHand]);
    
    // Slight delay for dramatic effect
    await new Promise(r => setTimeout(r, 600));

    let dScore = calculateScore(currentDealerHand);
    let deckCopy = [...currentDeck];

    while (dScore < 17) {
      const card = deckCopy.pop()!;
      currentDealerHand = [...currentDealerHand, card];
      setDealerHand(currentDealerHand);
      setDeck(deckCopy);
      dScore = calculateScore(currentDealerHand);
      await new Promise(r => setTimeout(r, 800));
    }

    determineWinner(pHand, currentDealerHand, false);
  };

  const determineWinner = (pHand: Card[], dHand: Card[], playerBusted: boolean) => {
    const pScore = calculateScore(pHand);
    const dScore = calculateScore(dHand);
    
    let result = '';
    let winType: 'player' | 'dealer' | 'push' = 'push';

    if (playerBusted) {
      result = 'Bust! You lost.';
      winType = 'dealer';
    } else if (dScore > 21) {
      result = 'Dealer Bust! You win!';
      winType = 'player';
    } else if (pScore > dScore) {
      result = 'You win!';
      winType = 'player';
    } else if (dScore > pScore) {
      result = 'Dealer wins.';
      winType = 'dealer';
    } else {
      result = 'Push.';
      winType = 'push';
    }

    // Payout and Charge Logic
    let payout = 0;
    if (winType === 'player') {
        const isBlackjack = pScore === 21 && pHand.length === 2;
        if (isBlackjack) {
             payout = Math.floor(bet * 2.5); // 3:2 payout
             result = 'Blackjack! You win!';
             setCharges(prev => Math.min(prev + 2, 10));
        } else {
             payout = bet * 2;
             setCharges(prev => Math.min(prev + 1, 10));
        }
    } else if (winType === 'push') {
        payout = bet;
    }

    if (payout > 0) {
        setBalance(prev => prev + payout);
    }

    setWinner(winType);
    setMessage(result);
    setStatus('gameOver');
  };

  const endGame = (pHand: Card[], dHand: Card[], reason: string) => {
    if (reason === 'bust') {
       // Reveal dealer card for visual completeness
       const finalDealer = [...dHand];
       finalDealer[1].isHidden = false;
       setDealerHand(finalDealer);
       determineWinner(pHand, finalDealer, true);
    }
  };

  const spendCharge = (amount: number): boolean => {
      if (charges >= amount) {
          setCharges(prev => prev - amount);
          return true;
      }
      return false;
  };

  // Power Up Logics
  const swapCard = () => {
    if (playerHand.length < 2 || powerUpUsed) return;
    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand];
    newHand.pop(); // Remove last
    newHand.push(newCard); // Add new
    
    setPlayerHand(newHand);
    setDeck(newDeck);
    setPowerUpUsed(true);
    
    if (calculateScore(newHand) > 21) endGame(newHand, dealerHand, 'bust');
  };

  const mulliganHand = () => {
      if (powerUpUsed) return;
      const newDeck = [...deck];
      // Discard current hand (conceptually)
      const c1 = newDeck.pop()!;
      const c2 = newDeck.pop()!;
      const newHand = [c1, c2];
      
      setPlayerHand(newHand);
      setDeck(newDeck);
      setPowerUpUsed(true);
      setMessage("Quantum Reset Activated!");
      
      if (calculateScore(newHand) === 21) {
          // If mulligan into blackjack, we don't auto-win immediately in this logic to keep it simple, 
          // but user can Stand to win.
      }
  };

  const revealDealerCard = () => {
    if (powerUpUsed) return;
    const newDealerHand = [...dealerHand];
    newDealerHand[1].isHidden = false;
    setDealerHand(newDealerHand);
    setPowerUpUsed(true);
  };

  return {
    deck, playerHand, dealerHand, status, bet, balance, message, powerUpUsed, winner, charges,
    setBalance, initGame, placeBet, hit, stand, swapCard, revealDealerCard, undoHit, mulliganHand, setPowerUpUsed, setWinner, setMessage, spendCharge
  };
};

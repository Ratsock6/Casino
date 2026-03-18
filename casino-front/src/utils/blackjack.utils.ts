export const SUIT_SYMBOLS: Record<string, string> = {
  HEARTS:   '♥',
  DIAMONDS: '♦',
  CLUBS:    '♣',
  SPADES:   '♠',
};

export const isRed = (suit: string): boolean =>
  suit === 'HEARTS' || suit === 'DIAMONDS';

export const getCardLabel = (rank: string): string => {
  if (rank === 'HIDDEN') return '?';
  return rank;
};

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PLAYER_TURN:     { label: 'Votre tour',          color: '#5cc8e0' },
  DEALER_TURN:     { label: 'Tour du croupier',     color: '#e0a85c' },
  PLAYER_BUST:     { label: 'Bust ! Vous perdez',   color: '#e05c5c' },
  DEALER_BUST:     { label: 'Croupier bust ! Vous gagnez', color: '#4caf7d' },
  PLAYER_BLACKJACK:{ label: 'Blackjack ! 🎉',       color: '#c9a84c' },
  PLAYER_WIN:      { label: 'Vous gagnez ! 🎉',     color: '#4caf7d' },
  DEALER_WIN:      { label: 'Le croupier gagne',    color: '#e05c5c' },
  PUSH:            { label: 'Égalité — remboursé',  color: '#888' },
  FINISHED:        { label: 'Partie terminée',      color: '#888' },
};

export const isGameOver = (status: string): boolean =>
  ['PLAYER_BUST', 'DEALER_BUST', 'PLAYER_BLACKJACK',
   'PLAYER_WIN', 'DEALER_WIN', 'PUSH', 'FINISHED'].includes(status);
import React, { useEffect, useState } from 'react';
import { getRecentWinnersApi, type RecentWinner } from '../../api/profile.api';
import '../../styles/components/winners-ticker.scss';

const GAME_ICONS: Record<string, string> = {
  SLOTS: '🎰', ROULETTE: '🎡', BLACKJACK: '🃏',
};

const WinnersTicker = () => {
  const [winners, setWinners] = useState<RecentWinner[]>([]);

  useEffect(() => {
    getRecentWinnersApi().then(setWinners).catch(console.error);
  }, []);

  if (winners.length === 0) return null;

  // Duplique pour boucle infinie
  const items = [...winners, ...winners];

  return (
    <div className="winners-ticker">
      <div className="winners-ticker__label">🏆 Derniers gagnants</div>
      <div className="winners-ticker__track">
        <div className="winners-ticker__inner">
          {items.map((w, i) => (
            <div key={i} className="winners-ticker__item">
              <span className="winners-ticker__icon">
                {GAME_ICONS[w.gameType] || '🎮'}
              </span>
              <span className="winners-ticker__username">{w.username}</span>
              <span className="winners-ticker__payout">
                +{w.payout.toLocaleString()} 🪙
              </span>
              {w.multiplier && (
                <span className="winners-ticker__multiplier">
                  x{w.multiplier}
                </span>
              )}
              <span className="winners-ticker__separator">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WinnersTicker;
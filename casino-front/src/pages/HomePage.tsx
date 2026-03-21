import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useWalletStore } from '../store/wallet.store';
import {
  getRecentWinnersApi,
  getPublicStatsApi,
  type RecentWinner,
  type PublicStats,
} from '../api/profile.api';
import '../styles/pages/home.scss';

const GAME_ICONS: Record<string, string> = {
  SLOTS: '🎰', ROULETTE: '🎡', BLACKJACK: '🃏',
};

const GAME_COLORS: Record<string, string> = {
  SLOTS: '#c9a84c', ROULETTE: '#e05c5c', BLACKJACK: '#4caf7d',
};

const games = [
  {
    key: 'slots',
    title: 'Machines à Sous',
    description: 'Tentez votre chance sur nos machines à sous. Jusqu\'à x20 votre mise.',
    icon: '🎰',
    path: '/slots',
    color: '#c9a84c',
    multiplier: 'x20',
  },
  {
    key: 'roulette',
    title: 'Roulette',
    description: 'Roulette européenne complète. Tous les types de paris disponibles.',
    icon: '🎡',
    path: '/roulette',
    color: '#e05c5c',
    multiplier: 'x36',
  },
  {
    key: 'blackjack',
    title: 'Blackjack',
    description: 'Battez le croupier sans dépasser 21. Blackjack naturel payé x2.5.',
    icon: '🃏',
    path: '/blackjack',
    color: '#4caf7d',
    multiplier: 'x2.5',
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { balance } = useWalletStore();
  const [winners, setWinners] = useState<RecentWinner[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [w, s] = await Promise.allSettled([
          getRecentWinnersApi(),
          getPublicStatsApi(),
        ]);
        if (w.status === 'fulfilled') setWinners(w.value);
        if (s.status === 'fulfilled') setStats(s.value);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  return (
    <div className="home">

      {/* ── HERO ── */}
      <div className="home__hero">
        <div className="home__hero-content">
          <p className="home__hero-eyebrow">✦ Bienvenue au</p>
          <h1 className="home__hero-title">
            Bellagio <span>Casino</span>
          </h1>
          <p className="home__hero-slogan">
            "Où la fortune sourit aux audacieux."
          </p>
          <p className="home__hero-balance">
            Votre solde : <strong>{balance.toLocaleString()} jetons</strong>
          </p>
        </div>
        <div className="home__hero-deco">
          <span className="home__hero-card">🃏</span>
          <span className="home__hero-card">🎰</span>
          <span className="home__hero-card">🎡</span>
        </div>
      </div>

      {/* ── STATS GLOBALES ── */}
      {stats && (
        <div className="home__stats">
          {[
            { label: 'Joueurs inscrits', value: stats.totalUsers.toLocaleString(), icon: '👥' },
            { label: 'Parties jouées', value: stats.totalRounds.toLocaleString(), icon: '🎮' },
            { label: 'Total distribué', value: `${stats.totalPaidOut.toLocaleString()} 🪙`, icon: '💰' },
          ].map((stat) => (
            <div key={stat.label} className="home__stat">
              <span className="home__stat-icon">{stat.icon}</span>
              <span className="home__stat-value">{stat.value}</span>
              <span className="home__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── JEUX ── */}
      <div className="home__section">
        <h2 className="home__section-title">Nos jeux</h2>
        <div className="home__games">
          {games.map((game) => (
            <div
              key={game.key}
              className="game-card"
              onClick={() => navigate(game.path)}
              style={{ '--game-color': game.color } as React.CSSProperties}
            >
              <div className="game-card__icon">{game.icon}</div>
              <div className="game-card__content">
                <h2 className="game-card__title">{game.title}</h2>
                <p className="game-card__description">{game.description}</p>
              </div>
              <div className="game-card__right">
                <span className="game-card__multiplier">{game.multiplier}</span>
                <span className="game-card__arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default HomePage;
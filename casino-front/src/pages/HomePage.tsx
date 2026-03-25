import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useWalletStore } from '../store/wallet.store';
import axiosInstance from '../utils/axios.instance';
import {
  getRecentWinnersApi,
  getPublicStatsApi,
  type RecentWinner,
  type PublicStats,
} from '../api/profile.api';
import '../styles/pages/home.scss';
import { getJackpotHistoryApi, type JackpotHistoryEntry } from '../api/jackpot.api';
import JackpotBanner from '../components/ui/JackpotBanner';

const HomePage = () => {
  const navigate = useNavigate();
  const { balance } = useWalletStore();

  const [winners, setWinners] = useState<RecentWinner[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    global: false, SLOTS: false, ROULETTE: false, BLACKJACK: false, BATTLE_BOX: false,
  });
  const [jackpotHistory, setJackpotHistory] = useState<JackpotHistoryEntry[]>([]);
  const [battleBoxEnabled, setBattleBoxEnabled] = useState(false);

  useEffect(() => {
    axiosInstance.get('/public/maintenance')
      .then((res) => setMaintenanceStatus(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axiosInstance.get('/public/battlebox-status')
      .then((res) => setBattleBoxEnabled(res.data.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [w, s, h] = await Promise.allSettled([
          getRecentWinnersApi(),
          getPublicStatsApi(),
          getJackpotHistoryApi(),
        ]);
        if (w.status === 'fulfilled') setWinners(w.value);
        if (s.status === 'fulfilled') setStats(s.value);
        if (h.status === 'fulfilled') setJackpotHistory(h.value);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const maintenanceMap: Record<string, boolean> = {
    slots:      maintenanceStatus.global || maintenanceStatus.SLOTS,
    roulette:   maintenanceStatus.global || maintenanceStatus.ROULETTE,
    blackjack:  maintenanceStatus.global || maintenanceStatus.BLACKJACK,
    'battle-box': maintenanceStatus.global || maintenanceStatus.BATTLE_BOX,
  };

  const games = [
    {
      key: 'slots',
      title: 'Machines à Sous',
      description: "Tentez votre chance sur nos machines à sous. Jusqu'à x20 votre mise.",
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
    ...(battleBoxEnabled ? [{
      key: 'battle-box',
      title: 'Battle Box',
      description: "Affrontez un adversaire en ouvrant des box. Le plus grand total l'emporte !",
      icon: '⚔️',
      path: '/battle-box',
      color: '#e05c5c',
      multiplier: 'x2',
    }] : []),
  ];

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

      <JackpotBanner />

      {/* ── JEUX ── */}
      <div className="home__games">
        {games.map((game) => (
          <div
            key={game.key}
            className={`game-card ${maintenanceMap[game.key] ? 'game-card--maintenance' : ''}`}
            onClick={() => !maintenanceMap[game.key] && navigate(game.path)}
            style={{ '--game-color': game.color } as React.CSSProperties}
          >
            {maintenanceMap[game.key] && (
              <div className="game-card__maintenance-badge">🔧 Maintenance</div>
            )}
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

      {/* ── JACKPOT HISTORY ── */}
      {jackpotHistory.length > 0 && (
        <div className="home__section">
          <h2 className="home__section-title">🏆 Hall of Fame — Gagnants du Jackpot</h2>
          <div className="home__jackpot-history">
            {jackpotHistory.map((entry, i) => (
              <div key={i} className="home__jackpot-entry">
                <div className="home__jackpot-entry-left">
                  <span className="home__jackpot-entry-rank">
                    {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div>
                    <p className="home__jackpot-entry-username">{entry.firstName} {entry.lastName}</p>
                    <p className="home__jackpot-entry-game">
                      {entry.gameType === 'SLOTS' ? '🎰' : entry.gameType === 'ROULETTE' ? '🎡' : '🃏'} {entry.gameType}
                    </p>
                  </div>
                </div>
                <div className="home__jackpot-entry-right">
                  <span className="home__jackpot-entry-amount">
                    +{entry.amount.toLocaleString()} 🪙
                  </span>
                  <span className="home__jackpot-entry-date">
                    {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useWalletStore } from '../store/wallet.store';
import '../styles/pages/home.scss';

const games = [
  {
    key: 'slots',
    title: 'Machines à Sous',
    description: 'Tentez votre chance sur nos machines à sous.',
    icon: '🎰',
    path: '/slots',
  },
  {
    key: 'roulette',
    title: 'Roulette',
    description: 'Misez sur vos numéros favoris.',
    icon: '🎡',
    path: '/roulette',
  },
  {
    key: 'blackjack',
    title: 'Blackjack',
    description: 'Battez le croupier sans dépasser 21.',
    icon: '🃏',
    path: '/blackjack',
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { balance } = useWalletStore();

  return (
    <div className="home">
      <div className="home__hero">
        <h1 className="home__title">
          Bienvenue, <span>{user?.firstName}</span>
        </h1>
        <p className="home__subtitle">
          Vous disposez de{' '}
          <strong>{balance.toLocaleString()} jetons</strong>.
          Bonne chance !
        </p>
      </div>

      <div className="home__games">
        {games.map((game) => (
          <div
            key={game.key}
            className="game-card"
            onClick={() => navigate(game.path)}
          >
            <div className="game-card__icon">{game.icon}</div>
            <div className="game-card__content">
              <h2 className="game-card__title">{game.title}</h2>
              <p className="game-card__description">{game.description}</p>
            </div>
            <span className="game-card__arrow">→</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
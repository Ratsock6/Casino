import React, { useEffect, useState } from 'react';
import { useWalletStore } from '../store/wallet.store';
import { startBlackjackApi, blackjackActionApi, getActiveBlackjackApi } from '../api/blackjack.api';
import type { BlackjackGame, BlackjackCard } from '../api/blackjack.api';
import {
  SUIT_SYMBOLS, isRed, getCardLabel,
  STATUS_LABELS, isGameOver,
} from '../utils/blackjack.utils';
import '../styles/pages/blackjack.scss';

// Composant carte
const Card = ({ card, hidden = false, index = 0 }: {
  card: BlackjackCard;
  hidden?: boolean;
  index?: number;
}) => {
  const isHidden = hidden || card.rank === 'HIDDEN';
  const red = isRed(card.suit);

  return (
    <div
      className={`bj-card ${isHidden ? 'bj-card--hidden' : ''} ${red ? 'bj-card--red' : 'bj-card--black'}`}
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      {isHidden ? (
        <span className="bj-card__back">🂠</span>
      ) : (
        <>
          <span className="bj-card__rank-top">{getCardLabel(card.rank)}</span>
          <span className="bj-card__suit">{SUIT_SYMBOLS[card.suit] || card.suit}</span>
          <span className="bj-card__rank-bottom">{getCardLabel(card.rank)}</span>
        </>
      )}
    </div>
  );
};

const BlackjackPage = () => {
  const { balance, setBalance } = useWalletStore();

  const [bet, setBet] = useState<number>(100);
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingActive, setLoadingActive] = useState(true);

  const handleStart = async () => {
    if (loading) return;
    if (bet <= 0) return setError('La mise doit être supérieure à 0.');
    if (bet > balance) return setError('Solde insuffisant.');

    setError('');
    setLoading(true);

    try {
      const idempotencyKey = crypto.randomUUID();
      const data = await startBlackjackApi(bet, idempotencyKey);
      setGame(data);
      setBalance(balance - Number(data.betAmount));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'HIT' | 'STAND') => {
    if (!game || actionLoading) return;
    setActionLoading(true);

    try {
      const data = await blackjackActionApi(game.gameId, action);
      setGame(data);

      if (isGameOver(data.status)) {
        const bet = Number(data.betAmount);
        const status = data.status;

        if (status === 'PLAYER_WIN' || status === 'DEALER_BUST') {
          setBalance(balance - bet + bet * 2);
        } else if (status === 'PLAYER_BLACKJACK') {
          setBalance(balance - bet + bet * 2.5);
        } else if (status === 'PUSH') {
          setBalance(balance);
        }
        // Pour PLAYER_BUST et DEALER_WIN, le bet est déjà déduit
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNewGame = () => {
    setGame(null);
    setError('');
  };

  const gameOver = game ? isGameOver(game.status) : false;
  const statusInfo = game ? STATUS_LABELS[game.status] : null;

  useEffect(() => {
    const checkActiveGame = async () => {
      try {
        const activeGame = await getActiveBlackjackApi();
        if (activeGame) {
          setGame(activeGame);
        }
      } catch (err) {
        console.error('Erreur récupération partie active:', err);
      } finally {
        setLoadingActive(false);
      }
    };
    checkActiveGame();
  }, []);


  if (loadingActive) {
    return (
      <div className="blackjack">
        <div className="blackjack__header">
          <h1 className="blackjack__title">Blackjack</h1>
        </div>
        <div className="blackjack__loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="blackjack">

      <div className="blackjack__header">
        <h1 className="blackjack__title">Blackjack</h1>
        <p className="blackjack__balance">
          Solde : <strong>{balance.toLocaleString()} jetons</strong>
        </p>
      </div>

      {!game ? (
        /* ── Mise initiale ── */
        <div className="blackjack__start">
          <div className="blackjack__start-card">
            <h2>Nouvelle partie</h2>
            <p>Battez le croupier sans dépasser 21</p>

            <div className="blackjack__bet">
              <label>Votre mise</label>
              <div className="blackjack__bet-inputs">
                <button onClick={() => setBet(Math.max(10, bet - 100))}>−</button>
                <input
                  type="number"
                  value={bet}
                  min={10}
                  onChange={(e) => setBet(Number(e.target.value))}
                />
                <button onClick={() => setBet(bet + 100)}>+</button>
              </div>
              <div className="blackjack__bet-presets">
                {[100, 500, 1000, 5000].map((preset) => (
                  <button
                    key={preset}
                    className={bet === preset ? 'active' : ''}
                    onClick={() => setBet(preset)}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="blackjack__error">{error}</p>}

            <button
              className="blackjack__deal-btn"
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? 'Distribution...' : '🃏 Distribuer les cartes'}
            </button>
          </div>

          {/* Règles */}
          <div className="blackjack__rules">
            <h3>Règles</h3>
            <div className="blackjack__rules-list">
              {[
                { label: 'Objectif', value: 'Approcher 21 sans le dépasser' },
                { label: 'Blackjack', value: 'As + figure = x2.5' },
                { label: 'Victoire', value: 'Plus proche de 21 = x2' },
                { label: 'Égalité', value: 'Mise remboursée' },
                { label: 'As', value: 'Vaut 1 ou 11' },
                { label: 'Figures', value: 'Valent 10' },
                { label: 'Croupier', value: 'Tir à 16 et reste à 17' },
              ].map((rule) => (
                <div key={rule.label} className="blackjack__rule-row">
                  <span className="blackjack__rule-label">{rule.label}</span>
                  <span className="blackjack__rule-value">{rule.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Table de jeu ── */
        <div className="blackjack__table">

          {/* Croupier */}
          <div className="blackjack__side blackjack__side--dealer">
            <div className="blackjack__side-header">
              <span className="blackjack__side-label">Croupier</span>
              <span className="blackjack__side-score">
                {gameOver ? game.dealerScore : '?'}
              </span>
            </div>
            <div className="blackjack__cards">
              {game.dealerCards.map((card, i) => (
                <Card key={i} card={card} index={i} />
              ))}
            </div>
          </div>

          {/* Statut */}
          {statusInfo && (
            <div
              className="blackjack__status"
              style={{ color: statusInfo.color, borderColor: statusInfo.color }}
            >
              {statusInfo.label}
              {gameOver && (
                <span className="blackjack__status-bet">
                  {game.status === 'PLAYER_WIN' || game.status === 'DEALER_BUST'
                    ? ` — +${Number(game.betAmount).toLocaleString()} jetons`
                    : game.status === 'PLAYER_BLACKJACK'
                      ? ` — +${(Number(game.betAmount) * 1.5).toLocaleString()} jetons`
                      : game.status === 'PUSH'
                        ? ` — Mise remboursée`
                        : ` — -${Number(game.betAmount).toLocaleString()} jetons`}
                </span>
              )}
            </div>
          )}

          {/* Joueur */}
          <div className="blackjack__side blackjack__side--player">
            <div className="blackjack__side-header">
              <span className="blackjack__side-label">Vous</span>
              <span className="blackjack__side-score">{game.playerScore}</span>
            </div>
            <div className="blackjack__cards">
              {game.playerCards.map((card, i) => (
                <Card key={i} card={card} index={i} />
              ))}
            </div>
          </div>

          {/* Mise */}
          <div className="blackjack__bet-display">
            Mise : <strong>{Number(game.betAmount).toLocaleString()} jetons</strong>
          </div>

          {/* Actions */}
          {!gameOver ? (
            <div className="blackjack__actions">
              <button
                className="blackjack__action-btn blackjack__action-btn--hit"
                onClick={() => handleAction('HIT')}
                disabled={actionLoading}
              >
                {actionLoading ? '...' : '👆 Tirer'}
              </button>
              <button
                className="blackjack__action-btn blackjack__action-btn--stand"
                onClick={() => handleAction('STAND')}
                disabled={actionLoading}
              >
                {actionLoading ? '...' : '✋ Rester'}
              </button>
            </div>
          ) : (
            <div className="blackjack__actions">
              <button
                className="blackjack__action-btn blackjack__action-btn--new"
                onClick={handleNewGame}
              >
                🃏 Nouvelle partie
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default BlackjackPage;
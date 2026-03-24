import React, { useState, useEffect, useCallback, act } from 'react';
import { useWalletStore } from '../store/wallet.store';
import { useAuthStore } from '../store/auth.store';
import { useSocket } from '../hooks/useSocket';
import axiosInstance from '../utils/axios.instance';
import { useSound } from '../hooks/useSound';
import { useCountUp } from '../hooks/useCountUp';
import Confetti from '../components/ui/Confetti';
import {
  getBattleBoxCatalogApi, getBattleBoxLobbyApi, getBattleBoxGameApi,
  createBattleBoxGameApi, joinBattleBoxGameApi, cancelBattleBoxGameApi,
  type BoxConfig, type LobbyGame, type BattleBoxGame,
} from '../api/battle-box.api';
import '../styles/pages/battle-box.scss';

type View = 'lobby' | 'create' | 'waiting' | 'playing' | 'result' | 'join-private';

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#888888',
  UNCOMMON: '#4caf7d',
  RARE: '#5cc8e0',
  EPIC: '#c9a84c',
  LEGENDARY: '#e05c5c',
};

const BattleBoxPage = () => {
  const { balance, setBalance } = useWalletStore();
  const { user } = useAuthStore();
  const { connect, on, off } = useSocket();

  const [view, setView] = useState<View>('lobby');
  const [catalog, setCatalog] = useState<BoxConfig[]>([]);
  const [lobby, setLobby] = useState<LobbyGame[]>([]);
  const [currentGame, setCurrentGame] = useState<BattleBoxGame | null>(null);
  const [boxSelection, setBoxSelection] = useState<Record<string, number>>({});
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [privateCode, setPrivateCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [lobbyInterval, setLobbyInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [activeGame, setActiveGame] = useState<BattleBoxGame | null>(null);
  const { playBoxOpen, playReveal, playVictory, playDefeat, playCountdown } = useSound();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [revealedItems, setRevealedItems] = useState<Record<string, boolean[]>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatingValues, setAnimatingValues] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [runningTotals, setRunningTotals] = useState<Record<string, number>>({});
  const [revealComplete, setRevealComplete] = useState(false);

  // Vérifie si le Battle Box est activé
  useEffect(() => {
    axiosInstance.get('/public/maintenance')
      .then((res) => setIsVisible(!res.data.global))
      .catch(() => { });
  }, []);

  // Charge le catalogue et le lobby
  useEffect(() => {
    getBattleBoxCatalogApi().then(setCatalog).catch(console.error);
    refreshLobby();
  }, []);

  // Rafraîchit le lobby toutes les 5 secondes
  useEffect(() => {
    if (view === 'lobby') {
      const interval = setInterval(refreshLobby, 5000);
      setLobbyInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (lobbyInterval) clearInterval(lobbyInterval);
    }
  }, [view]);

  useEffect(() => {
    axiosInstance.get('/battle-box/active')
      .then((res) => {
        if (res.data) setActiveGame(res.data);
      })
      .catch(() => { });
  }, []);

  // Socket.io — écoute les événements de jeu
  useEffect(() => {
    if (!currentGame) return;
    const socket = connect();

    on(`battlebox:game_start_${currentGame.id}`, async () => {
      const game = await getBattleBoxGameApi(currentGame.id);
      setCurrentGame(game);
      setView('playing');
    });

    on(`battlebox:result_${currentGame.id}`, async (data: any) => {
      setResult(data);
      setView('result');
      axiosInstance.get('/wallet/me').then((res) => setBalance(parseFloat(res.data.balance)));
      // Lance l'animation
      await animateReveal(data);
    });

    return () => {
      off(`battlebox:game_start_${currentGame.id}`);
      off(`battlebox:result_${currentGame.id}`);
    };
  }, [currentGame]);

  const refreshLobby = async () => {
    try {
      const games = await getBattleBoxLobbyApi();
      setLobby(games);
    } catch { }
  };

  const calculateTotalStake = () => {
    return Object.entries(boxSelection).reduce((total, [type, count]) => {
      const box = catalog.find((b) => b.type === type);
      return total + (box ? box.price * count : 0);
    }, 0);
  };

  const handleBoxChange = (type: string, delta: number) => {
    setBoxSelection((prev) => {
      const current = prev[type] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [type]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [type]: next };
    });
  };

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await createBattleBoxGameApi(boxSelection, isPrivate, maxPlayers);
      if (res.inviteCode) setInviteCode(res.inviteCode);
      const game = await getBattleBoxGameApi(res.gameId);
      setCurrentGame(game);
      setBalance(balance - res.stake);
      setView('waiting');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (gameId: string, code?: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await joinBattleBoxGameApi(gameId, code);
      const game = await getBattleBoxGameApi(res.gameId);
      setCurrentGame(game);
      setBalance(balance - res.stake);
      setView('waiting');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la participation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentGame) return;
    try {
      await cancelBattleBoxGameApi(currentGame.id);
      setCurrentGame(null);
      setView('lobby');
      refreshLobby();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur');
    }
  };

  const animateReveal = async (resultData: any) => {
    // Compte à rebours 3-2-1
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      playCountdown(i);
      await new Promise((r) => setTimeout(r, 1000)); // 👈 1s par chiffre
    }
    setCountdown(null);

    await new Promise((r) => setTimeout(r, 300));

    playBoxOpen();

    const itemCount = resultData.players[0].items.length;

    for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
      const delay = 1000 + (itemIndex / itemCount) * 1000;
      await new Promise((r) => setTimeout(r, delay));

      for (const player of resultData.players) {
        const item = player.items[itemIndex];
        if (item) {
          playReveal(item.rarity);

          // Révèle l'item
          setRevealedItems((prev) => ({
            ...prev,
            [player.userId]: [...(prev[player.userId] || []), true],
          }));

          // Incrémente le total progressivement
          const steps = 20;
          const increment = item.value / steps;
          for (let s = 1; s <= steps; s++) {
            await new Promise((r) => setTimeout(r, 30));
            setRunningTotals((prev) => ({
              ...prev,
              [player.userId]: Math.floor((prev[player.userId] || 0) + increment),
            }));
          }
        }
      }

      const isLastItem = itemIndex === itemCount - 1;
      const rarity = resultData.players[0].items[itemIndex]?.rarity;
      if (rarity === 'LEGENDARY' || rarity === 'EPIC' || isLastItem) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    // Pause dramatique avant le résultat
    await new Promise((r) => setTimeout(r, 600));
    setAnimatingValues(true);

    await new Promise((r) => setTimeout(r, 1500));

    const winnerData = resultData.players.find((p: any) => p.isWinner);
    const iWon = winnerData?.username === user?.username;
    setIsWinner(iWon);
    setRevealComplete(true);

    if (iWon) {
      playVictory();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    } else {
      playDefeat();
    }
  };

  const totalStake = calculateTotalStake();
  const isVip = user?.role === 'VIP' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const maxStake = isVip ? 100000 : 50000;

  // ── Vue lobby ──
  if (view === 'lobby') return (
    <div className="battlebox">
      <div className="battlebox__header">
        <div>
          <h1 className="battlebox__title">⚔️ Battle Box</h1>
          <p className="battlebox__subtitle">Affrontez un adversaire en ouvrant des box. Le plus grand total l'emporte !</p>
        </div>
        <div className="battlebox__header-actions">
          <button className="battlebox__btn battlebox__btn--secondary" onClick={() => setView('join-private')}>
            🔑 Rejoindre (code)
          </button>
          <button className="battlebox__btn battlebox__btn--primary" onClick={() => setView('create')}>
            ⚔️ Créer une partie
          </button>
        </div>
      </div>

      {error && <p className="battlebox__error">{error}</p>}

      {activeGame && (
        <div className="battlebox__active-banner">
          <div className="battlebox__active-banner-left">
            <span>⚔️</span>
            <div>
              <p className="battlebox__active-banner-title">Vous avez une partie en cours</p>
              <p className="battlebox__active-banner-status">
                {activeGame.status === 'WAITING'
                  ? `En attente — ${activeGame.players.length}/${activeGame.maxPlayers} joueurs`
                  : 'Partie en cours'}
              </p>
            </div>
          </div>
          <button
            className="battlebox__btn battlebox__btn--primary battlebox__btn--sm"
            onClick={() => {
              setCurrentGame(activeGame);
              setInviteCode(activeGame.inviteCode || '');
              setView(activeGame.status === 'WAITING' ? 'waiting' : 'playing');
            }}
          >
            🔄 Reprendre la partie
          </button>
        </div>
      )}

      <div className="battlebox__lobby">
        <h2 className="battlebox__section-title">
          🏟️ Parties disponibles
          <span className="battlebox__lobby-count">{lobby.length}</span>
        </h2>

        {lobby.length === 0 ? (
          <div className="battlebox__empty">
            <span>⚔️</span>
            <p>Aucune partie en attente. Créez la première !</p>
          </div>
        ) : (
          <div className="battlebox__lobby-list">
            {lobby.map((game) => {
              const boxDesc = Object.entries(game.boxTypes)
                .map(([type, count]) => {
                  const box = catalog.find((b) => b.type === type);
                  return `${count}× ${box?.emoji || ''} ${box?.label || type}`;
                }).join(' + ');

              return (
                <div key={game.id} className="battlebox__lobby-row">
                  <div className="battlebox__lobby-info">
                    <div className="battlebox__lobby-players">
                      {game.players.map((p) => (
                        <span key={p.username} className="battlebox__lobby-player">
                          {p.role === 'VIP' ? '👑' : '👤'} {p.username}
                        </span>
                      ))}
                      {Array.from({ length: game.maxPlayers - game.playerCount }).map((_, i) => (
                        <span key={i} className="battlebox__lobby-player battlebox__lobby-player--empty">
                          ⏳ En attente...
                        </span>
                      ))}
                    </div>
                    <p className="battlebox__lobby-boxes">{boxDesc}</p>
                  </div>
                  <div className="battlebox__lobby-stake">
                    <span>{(game.totalStake / game.playerCount).toLocaleString()} 🪙</span>
                    <span className="battlebox__lobby-stake-label">par joueur</span>
                  </div>
                  <button
                    className="battlebox__btn battlebox__btn--primary battlebox__btn--sm"
                    onClick={() => handleJoin(game.id)}
                    disabled={loading}
                  >
                    Rejoindre
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Vue rejoindre par code privé ──
  if (view === 'join-private') return (
    <div className="battlebox">
      <button className="battlebox__back" onClick={() => {
        setView('lobby');
        setPrivateCode('');
        setError('');
      }}>← Retour</button>

      <div className="battlebox__private-join">
        <h2>🔑 Rejoindre une partie privée</h2>
        <p>Entrez le code d'invitation fourni par l'hôte.</p>
        <div className="battlebox__private-form">
          <input
            type="text"
            value={privateCode}
            onChange={(e) => setPrivateCode(e.target.value.toUpperCase())}
            placeholder="Code (ex: AB1234)"
            maxLength={6}
          />
        </div>
        {error && <p className="battlebox__error">{error}</p>}
        <button
          className="battlebox__btn battlebox__btn--primary"
          disabled={privateCode.length < 4 || loading}
          onClick={async () => {
            setError('');
            setLoading(true);
            try {
              const res = await axiosInstance.get(`/battle-box/by-code/${privateCode}`);
              await handleJoin(res.data.id, privateCode);
            } catch (err: any) {
              setError(err.response?.data?.message || 'Code invalide ou partie introuvable.');
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Connexion...' : 'Rejoindre'}
        </button>
      </div>
    </div>
  );

  // ── Vue création ──
  if (view === 'create') return (
    <div className="battlebox">
      <button className="battlebox__back" onClick={() => setView('lobby')}>← Retour</button>
      <h2 className="battlebox__section-title">⚔️ Créer une partie</h2>

      <div className="battlebox__create">
        {/* Sélection des box */}
        <div className="battlebox__catalog">
          <h3>📦 Choisissez vos box</h3>
          <div className="battlebox__boxes">
            {catalog.filter((b) => !b.vipOnly || isVip).map((box) => (
              <div key={box.type} className={`battlebox__box ${(boxSelection[box.type] || 0) > 0 ? 'battlebox__box--selected' : ''}`}>
                <div className="battlebox__box-header">
                  <span className="battlebox__box-emoji">{box.emoji}</span>
                  <div>
                    <p className="battlebox__box-name">{box.label}</p>
                    <p className="battlebox__box-price">{box.price.toLocaleString()} 🪙</p>
                  </div>
                  {box.vipOnly && <span className="battlebox__box-vip">VIP</span>}
                </div>
                <p className="battlebox__box-desc">{box.description}</p>
                <div className="battlebox__box-items">
                  {box.items.slice(0, 3).map((item) => (
                    <span key={item.name} className="battlebox__box-item" style={{ color: RARITY_COLORS[item.rarity] }}>
                      {item.emoji} {item.name}
                    </span>
                  ))}
                  {box.items.length > 3 && <span className="battlebox__box-more">+{box.items.length - 3} autres...</span>}
                </div>
                <div className="battlebox__box-counter">
                  <button onClick={() => handleBoxChange(box.type, -1)} disabled={(boxSelection[box.type] || 0) === 0}>−</button>
                  <span>{boxSelection[box.type] || 0}</span>
                  <button onClick={() => handleBoxChange(box.type, 1)} disabled={totalStake + box.price > maxStake}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="battlebox__options">
          <h3>⚙️ Options</h3>
          <div className="battlebox__option-row">
            <label>Nombre de joueurs</label>
            <div className="battlebox__option-btns">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={`battlebox__option-btn ${maxPlayers === n ? 'battlebox__option-btn--active' : ''}`}
                  onClick={() => setMaxPlayers(n)}
                >
                  {n} joueurs
                </button>
              ))}
            </div>
          </div>
          <div className="battlebox__option-row">
            <label>Partie privée</label>
            <button
              className={`battlebox__toggle ${isPrivate ? 'battlebox__toggle--on' : 'battlebox__toggle--off'}`}
              onClick={() => setIsPrivate(!isPrivate)}
            >
              <span className="battlebox__toggle-dot" />
            </button>
          </div>
        </div>

        {/* Résumé */}
        <div className="battlebox__summary">
          <div className="battlebox__summary-row">
            <span>Mise totale</span>
            <strong style={{ color: totalStake > balance ? '#e05c5c' : '#c9a84c' }}>
              {totalStake.toLocaleString()} 🪙
            </strong>
          </div>
          <div className="battlebox__summary-row">
            <span>Votre solde</span>
            <strong>{balance.toLocaleString()} 🪙</strong>
          </div>
          <div className="battlebox__summary-row">
            <span>Pot potentiel</span>
            <strong style={{ color: '#4caf7d' }}>
              {(totalStake * maxPlayers).toLocaleString()} 🪙
            </strong>
          </div>
        </div>

        {error && <p className="battlebox__error">{error}</p>}

        <button
          className="battlebox__btn battlebox__btn--primary battlebox__btn--lg"
          onClick={handleCreate}
          disabled={loading || totalStake === 0 || totalStake > balance || totalStake > maxStake}
        >
          {loading ? 'Création...' : `⚔️ Créer la partie (${totalStake.toLocaleString()} 🪙)`}
        </button>
      </div>
    </div>
  );

  // ── Vue attente ──
  if (view === 'waiting' && currentGame) return (
    <div className="battlebox">
      <div className="battlebox__waiting">
        <div className="battlebox__waiting-icon">⏳</div>
        <h2>En attente d'adversaires...</h2>
        <p>{currentGame.players.length} / {currentGame.maxPlayers} joueurs</p>

        {inviteCode && (
          <div className="battlebox__invite-code">
            <p>Code d'invitation privé :</p>
            <div className="battlebox__invite-code-value">{inviteCode}</div>
            <button onClick={() => navigator.clipboard.writeText(inviteCode)}>
              📋 Copier
            </button>
          </div>
        )}

        <div className="battlebox__waiting-players">
          {currentGame.players.map((p) => (
            <div key={p.id} className="battlebox__waiting-player">
              <span>{p.user.role === 'VIP' ? '👑' : '👤'}</span>
              <span>{p.user.username}</span>
              <span className="battlebox__waiting-ready">✅ Prêt</span>
            </div>
          ))}
          {Array.from({ length: currentGame.maxPlayers - currentGame.players.length }).map((_, i) => (
            <div key={i} className="battlebox__waiting-player battlebox__waiting-player--empty">
              <span>❓</span>
              <span>En attente...</span>
            </div>
          ))}
        </div>

        <button className="battlebox__btn battlebox__btn--danger" onClick={handleCancel}>
          ✕ Annuler la partie
        </button>
      </div>
    </div>
  );

  // ── Vue résultat ──
  if (view === 'result' && result) return (
    <div className="battlebox">
      <Confetti active={showConfetti} />

      {/* Compte à rebours */}
      {countdown !== null && (
        <div className="battlebox__countdown">
          <span className="battlebox__countdown-number">{countdown}</span>
        </div>
      )}

      <div className="battlebox__result">
        <div className="battlebox__result-header">
          <h2>{isWinner ? '🏆 Victoire !' : '💸 Défaite'}</h2>
          <p>
            {isWinner
              ? 'Félicitations ! Vous remportez le pot !'
              : 'Meilleure chance la prochaine fois !'}
          </p>
        </div>

        <div className="battlebox__result-players">
          {result.players.map((player: any) => {
            const revealed = revealedItems[player.userId] || [];
            return (
              <div
                key={player.userId}
                className={`battlebox__result-player ${revealComplete && player.isWinner ? 'battlebox__result-player--winner' : ''}`}
              >
                {revealComplete && player.isWinner && (
                  <div className="battlebox__result-crown">👑 GAGNANT</div>
                )}
                <h3>{player.username}</h3>
                <div className="battlebox__result-items">
                  {player.items.map((item: any, i: number) => (
                    <div
                      key={i}
                      className={`battlebox__result-item ${revealed[i] ? 'battlebox__result-item--revealed' : 'battlebox__result-item--hidden'}`}
                      style={{ borderColor: revealed[i] ? RARITY_COLORS[item.rarity] : '#333' }}
                    >
                      <span className="battlebox__result-item-emoji">{revealed[i] ? item.emoji : '❓'}</span>
                      <span className="battlebox__result-item-name">{revealed[i] ? item.name : '???'}</span>
                      <span
                        className="battlebox__result-item-value"
                        style={{ color: revealed[i] ? RARITY_COLORS[item.rarity] : '#555' }}
                      >
                        {revealed[i] ? `${item.value.toLocaleString()} 🪙` : '---'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={`battlebox__result-total ${runningTotals[player.userId] ? 'battlebox__result-total--animate' : ''}`}>
                  Total : <strong style={{ color: player.isWinner ? '#c9a84c' : '#888' }}>
                    {(runningTotals[player.userId] || 0).toLocaleString()} 🪙
                  </strong>
                </div>
                {player.isWinner && animatingValues && (
                  <div className="battlebox__result-payout">
                    💰 Gain : <strong>{result.winner.payout.toLocaleString()} 🪙</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {animatingValues && (
          <button
            className="battlebox__btn battlebox__btn--primary"
            onClick={() => {
              setView('lobby');
              setResult(null);
              setCurrentGame(null);
              setBoxSelection({});
              setRevealedItems({});
              setAnimatingValues(false);
              setShowConfetti(false);
              setIsWinner(false);
              setActiveGame(null);
              setRunningTotals({});
              setRevealComplete(false);
              refreshLobby();
            }}
          >
            🏠 Retour au lobby
          </button>
        )}
      </div>
    </div>
  );

  return null;
};

export default BattleBoxPage;
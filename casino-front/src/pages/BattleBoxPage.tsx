import { useState, useEffect } from 'react';
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
  getMyBattleBoxStatsApi, getMyBattleBoxHistoryApi, getBattleBoxLeaderboardApi,
  addBotsApi, announceGameApi,
  type BoxConfig, type LobbyGame, type BattleBoxGame,
  type MyBattleBoxStats, type BattleBoxHistoryEntry, type LeaderboardEntry,
  type BattleBoxAnnouncement,
} from '../api/battle-box.api';
import '../styles/pages/battle-box.scss';
import MaintenanceScreen from '../components/ui/MaintenanceScreen';
import MaintenanceBanner from '../components/ui/MaintenanceBanner';
import { useMaintenance } from '../hooks/useMaintenance';

type View = 'lobby' | 'create' | 'waiting' | 'playing' | 'result' | 'join-private';

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#888888',
  UNCOMMON: '#4caf7d',
  RARE: '#5cc8e0',
  EPIC: '#c9a84c',
  LEGENDARY: '#e05c5c',
};

// Catégories de box pour le filtre (sinon "Autres")
const BOX_CATEGORIES: Record<string, string[]> = {
  Classiques: ['STANDARD', 'PREMIUM', 'ELITE', 'VIP'],
  Thématiques: ['QUARTIER', 'FETE', 'TROPICALE', 'CASSE', 'VEGAS', 'COLLECTIONNEUR', 'PARRAIN', 'DIAMANT_NOIR', 'PRESIDENTIELLE', 'COFFRE_ROYAL'],
  GTA: ['LOS_SANTOS', 'GROVE_STREET', 'VINEWOOD', 'BRAQUAGE_PACIFIC', 'IMPORT_EXPORT', 'CARTEL', 'COURSE_ILLEGALE', 'MAZE_BANK', 'CASINO_DIAMOND', 'MONT_CHILIAD'],
};

const categoryOf = (type: string): string => {
  for (const [cat, types] of Object.entries(BOX_CATEGORIES)) {
    if (types.includes(type)) return cat;
  }
  return 'Autres';
};

const BattleBoxPage = () => {
  const { balance, setBalance } = useWalletStore();
  const { user } = useAuthStore();
  const { connect, on, off } = useSocket();

  const [view, setView] = useState<View>('lobby');
  const [catalog, setCatalog] = useState<BoxConfig[]>([]);
  const [lobby, setLobby] = useState<LobbyGame[]>([]);
  const [lobbyTab, setLobbyTab] = useState<'games' | 'stats' | 'leaderboard'>('games');
  const [myStats, setMyStats] = useState<MyBattleBoxStats | null>(null);
  const [myHistory, setMyHistory] = useState<BattleBoxHistoryEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentGame, setCurrentGame] = useState<BattleBoxGame | null>(null);
  const [boxSelection, setBoxSelection] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'safety-desc' | 'safety-asc'>('price-asc');
  const [categoryFilter, setCategoryFilter] = useState<string>('Toutes');
  const [detailBox, setDetailBox] = useState<BoxConfig | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [privateCode, setPrivateCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [lobbyInterval, setLobbyInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const { isMaintenance, rawMaintenance, canBypass } = useMaintenance('BATTLE_BOX');
  const [activeGame, setActiveGame] = useState<BattleBoxGame | null>(null);
  const { playBoxOpen, playReveal, playVictory, playDefeat, playCountdown } = useSound();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [revealedItems, setRevealedItems] = useState<Record<string, boolean[]>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatingValues, setAnimatingValues] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [runningTotals, setRunningTotals] = useState<Record<string, number>>({});
  const [revealComplete, setRevealComplete] = useState(false);

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
      // Lance l'animation AVANT de mettre à jour le solde,
      // sinon la navbar révèle le gain et spoile le résultat.
      await animateReveal(data);
      // Une fois l'animation terminée, on rafraîchit le solde réel.
      axiosInstance.get('/wallet/me').then((res) => setBalance(parseFloat(res.data.balance)));
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

  const [announceMsg, setAnnounceMsg] = useState('');

  const handleAddBots = async () => {
    if (!currentGame) return;
    try {
      await addBotsApi(currentGame.id);
      // La partie démarre automatiquement (le serveur émet game_start)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout de bots');
    }
  };

  const handleAnnounce = async () => {
    if (!currentGame) return;
    try {
      const res = await announceGameApi(currentGame.id);
      setAnnounceMsg(res.message);
      setTimeout(() => setAnnounceMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'annonce');
    }
  };

  const animateReveal = async (resultData: any) => {
    // Réinitialise TOUS les états d'animation au début, pour éviter qu'un
    // état resté de la partie précédente (revealComplete, isWinner...) ne
    // spoile le résultat dès l'ouverture (bug intermittent quand on enchaîne
    // les parties sans repasser par "Retour au lobby").
    setRevealComplete(false);
    setAnimatingValues(false);
    setIsWinner(false);
    setRevealedItems({});
    setRunningTotals({});

    // Compte à rebours 3-2-1
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      playCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
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

  // Rôle VIP
  const isVip = user?.role === 'VIP' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const totalStake = calculateTotalStake();

  // Charge les données de l'onglet lobby sélectionné (stats / classement / historique)
  const loadLobbyTab = async (tab: 'games' | 'stats' | 'leaderboard') => {
    setLobbyTab(tab);
    try {
      if (tab === 'stats') {
        const [s, h] = await Promise.all([
          getMyBattleBoxStatsApi(),
          getMyBattleBoxHistoryApi(),
        ]);
        setMyStats(s);
        setMyHistory(h);
      } else if (tab === 'leaderboard') {
        setLeaderboard(await getBattleBoxLeaderboardApi(20));
      }
    } catch (e) {
      console.error('Erreur chargement onglet lobby', e);
    }
  };

  // Sécurité d'une box = taux de retour moyen (valeur moyenne / prix), en %.
  const boxSafety = (box: BoxConfig) =>
    box.price > 0 ? (box.avgValue / box.price) * 100 : 0;

  // Catalogue trié selon le critère choisi (filtré VIP + catégorie).
  const sortedCatalog = [...catalog]
    .filter((b) => !b.vipOnly || isVip)
    .filter((b) => categoryFilter === 'Toutes' || categoryOf(b.type) === categoryFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'safety-desc': return boxSafety(b) - boxSafety(a);
        case 'safety-asc': return boxSafety(a) - boxSafety(b);
        default: return 0;
      }
    });

  // Libellé + couleur de la jauge de sécurité.
  const safetyLabel = (safety: number) => {
    if (safety >= 92) return { text: 'Très sûre', color: '#4caf7d' };
    if (safety >= 86) return { text: 'Équilibrée', color: '#c9a84c' };
    if (safety >= 78) return { text: 'Risquée', color: '#e0a85c' };
    return { text: 'Extrême', color: '#e05c5c' };
  };

  if (isMaintenance) {
    return <MaintenanceScreen game="Le battle box" />;
  }
  // ── Vue lobby ──
  if (view === 'lobby') return (
    <>
      {rawMaintenance && canBypass && <MaintenanceBanner scope="Le Battle Box" />}
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

      {/* Onglets du lobby */}
      <div className="battlebox__tabs">
        <button
          className={`battlebox__tab ${lobbyTab === 'games' ? 'battlebox__tab--active' : ''}`}
          onClick={() => loadLobbyTab('games')}
        >
          🏟️ Parties
        </button>
        <button
          className={`battlebox__tab ${lobbyTab === 'stats' ? 'battlebox__tab--active' : ''}`}
          onClick={() => loadLobbyTab('stats')}
        >
          📊 Mes stats
        </button>
        <button
          className={`battlebox__tab ${lobbyTab === 'leaderboard' ? 'battlebox__tab--active' : ''}`}
          onClick={() => loadLobbyTab('leaderboard')}
        >
          🏆 Classement
        </button>
      </div>

      {lobbyTab === 'games' && (
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
      )}

      {/* Onglet : Mes statistiques */}
      {lobbyTab === 'stats' && (
        <div className="battlebox__stats-view">
          {myStats && (
            <div className="battlebox__stats-grid">
              <div className="battlebox__stat-card">
                <span className="battlebox__stat-label">Parties jouées</span>
                <span className="battlebox__stat-value">{myStats.gamesPlayed}</span>
              </div>
              <div className="battlebox__stat-card battlebox__stat-card--win">
                <span className="battlebox__stat-label">Victoires</span>
                <span className="battlebox__stat-value">{myStats.wins}</span>
              </div>
              <div className="battlebox__stat-card battlebox__stat-card--loss">
                <span className="battlebox__stat-label">Défaites</span>
                <span className="battlebox__stat-value">{myStats.losses}</span>
              </div>
              <div className="battlebox__stat-card">
                <span className="battlebox__stat-label">Taux de victoire</span>
                <span className="battlebox__stat-value">{myStats.winRate}%</span>
              </div>
              <div className="battlebox__stat-card">
                <span className="battlebox__stat-label">Plus gros gain</span>
                <span className="battlebox__stat-value">{myStats.biggestWin.toLocaleString()} 🪙</span>
              </div>
              <div className={`battlebox__stat-card ${myStats.netProfit >= 0 ? 'battlebox__stat-card--win' : 'battlebox__stat-card--loss'}`}>
                <span className="battlebox__stat-label">Bénéfice net</span>
                <span className="battlebox__stat-value">{myStats.netProfit >= 0 ? '+' : ''}{myStats.netProfit.toLocaleString()} 🪙</span>
              </div>
            </div>
          )}

          <h3 className="battlebox__section-title">📜 Historique récent</h3>
          {myHistory.length === 0 ? (
            <div className="battlebox__lobby-empty"><p>Aucune partie jouée pour le moment.</p></div>
          ) : (
            <div className="battlebox__history-list">
              {myHistory.map((h) => (
                <div key={h.gameId} className={`battlebox__history-row ${h.status === 'FINISHED' ? (h.isWinner ? 'battlebox__history-row--win' : 'battlebox__history-row--loss') : ''}`}>
                  <span className="battlebox__history-result">
                    {h.status !== 'FINISHED' ? '⏳' : h.isWinner ? '🏆' : '❌'}
                  </span>
                  <div className="battlebox__history-info">
                    <span className="battlebox__history-players">vs {h.players.filter((p) => p !== user?.username).join(', ') || '—'}</span>
                    <span className="battlebox__history-meta">
                      Mise {h.stake.toLocaleString()} 🪙 · Valeur tirée {h.totalValue.toLocaleString()} 🪙
                    </span>
                  </div>
                  <span className="battlebox__history-status">
                    {h.status !== 'FINISHED' ? 'En cours' : h.isWinner ? 'Gagné' : 'Perdu'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet : Classement */}
      {lobbyTab === 'leaderboard' && (
        <div className="battlebox__leaderboard">
          <h2 className="battlebox__section-title">🏆 Meilleurs joueurs</h2>
          {leaderboard.length === 0 ? (
            <div className="battlebox__lobby-empty"><p>Aucune donnée de classement pour le moment.</p></div>
          ) : (
            <div className="battlebox__leaderboard-list">
              {leaderboard.map((entry, i) => (
                <div key={entry.userId} className={`battlebox__leaderboard-row ${entry.username === user?.username ? 'battlebox__leaderboard-row--me' : ''}`}>
                  <span className={`battlebox__leaderboard-rank ${i < 3 ? `battlebox__leaderboard-rank--${i + 1}` : ''}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="battlebox__leaderboard-name">
                    {entry.role === 'VIP' ? '👑 ' : ''}{entry.username}
                  </span>
                  <span className="battlebox__leaderboard-stat">{entry.wins} victoires</span>
                  <span className="battlebox__leaderboard-stat battlebox__leaderboard-stat--muted">{entry.winRate}%</span>
                  <span className="battlebox__leaderboard-won">{entry.totalWon.toLocaleString()} 🪙</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </>
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
          <div className="battlebox__catalog-head">
            <h3>📦 Choisissez vos box</h3>
            <div className="battlebox__sort">
              <label>Trier :</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="safety-desc">Plus sûres d'abord</option>
                <option value="safety-asc">Plus risquées d'abord</option>
              </select>
            </div>
          </div>
          <div className="battlebox__categories">
            {['Toutes', ...Object.keys(BOX_CATEGORIES)].map((cat) => (
              <button
                key={cat}
                className={`battlebox__category ${categoryFilter === cat ? 'battlebox__category--active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="battlebox__boxes">
            {sortedCatalog.map((box) => {
              const safety = boxSafety(box);
              const sLabel = safetyLabel(safety);
              return (
              <div key={box.type} className={`battlebox__box ${(boxSelection[box.type] || 0) > 0 ? 'battlebox__box--selected' : ''}`}>
                <div className="battlebox__box-header">
                  <span className="battlebox__box-emoji">{box.emoji}</span>
                  <div>
                    <p className="battlebox__box-name">{box.label}</p>
                    <p className="battlebox__box-price">{box.price.toLocaleString()} 🪙</p>
                  </div>
                  {box.vipOnly && <span className="battlebox__box-vip">VIP</span>}
                </div>

                {/* Jauge de sécurité */}
                <div className="battlebox__box-safety">
                  <div className="battlebox__box-safety-head">
                    <span>Sécurité</span>
                    <span style={{ color: sLabel.color }}>{sLabel.text} · {safety.toFixed(0)}%</span>
                  </div>
                  <div className="battlebox__box-safety-bar">
                    <div
                      className="battlebox__box-safety-fill"
                      style={{ width: `${Math.min(safety, 100)}%`, background: sLabel.color }}
                    />
                  </div>
                </div>

                <p className="battlebox__box-desc">{box.description}</p>
                <button className="battlebox__box-details" onClick={() => setDetailBox(box)}>
                  📊 Voir toutes les stats
                </button>
                <div className="battlebox__box-counter">
                  <button onClick={() => handleBoxChange(box.type, -1)} disabled={(boxSelection[box.type] || 0) === 0}>−</button>
                  <span>{boxSelection[box.type] || 0}</span>
                  <button onClick={() => handleBoxChange(box.type, 1)} disabled={totalStake + box.price > balance}>+</button>
                </div>
              </div>
            );
            })}
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
          {Object.keys(boxSelection).length > 0 && (
            <div className="battlebox__summary-boxes">
              {Object.entries(boxSelection).map(([type, count]) => {
                const box = catalog.find((b) => b.type === type);
                if (!box) return null;
                return (
                  <div key={type} className="battlebox__summary-box-row">
                    <span>{box.emoji} {box.label} ×{count}</span>
                    <span>{(box.price * count).toLocaleString()} 🪙</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="battlebox__summary-row battlebox__summary-row--total">
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
          disabled={loading || totalStake === 0 || totalStake > balance}
        >
          {loading ? 'Création...' : `⚔️ Créer la partie (${totalStake.toLocaleString()} 🪙)`}
        </button>
      </div>

      {/* Modal détails d'une box */}
      {detailBox && (
        <div className="battlebox__modal-overlay" onClick={() => setDetailBox(null)}>
          <div className="battlebox__modal" onClick={(e) => e.stopPropagation()}>
            <button className="battlebox__modal-close" onClick={() => setDetailBox(null)}>✕</button>

            <div className="battlebox__modal-head">
              <span className="battlebox__modal-emoji">{detailBox.emoji}</span>
              <div>
                <h3>{detailBox.label}{detailBox.vipOnly && <span className="battlebox__box-vip"> VIP</span>}</h3>
                <p className="battlebox__modal-desc">{detailBox.description}</p>
              </div>
            </div>

            <div className="battlebox__modal-stats">
              <div className="battlebox__modal-stat">
                <span>Prix</span>
                <strong>{detailBox.price.toLocaleString()} 🪙</strong>
              </div>
              <div className="battlebox__modal-stat">
                <span>Sécurité</span>
                <strong style={{ color: safetyLabel(boxSafety(detailBox)).color }}>
                  {safetyLabel(boxSafety(detailBox)).text} · {boxSafety(detailBox).toFixed(0)}%
                </strong>
              </div>
            </div>

            <h4 className="battlebox__modal-subtitle">Objets possibles ({detailBox.items.length})</h4>
            <div className="battlebox__modal-items">
              {[...detailBox.items].sort((a, b) => b.chance - a.chance).map((item) => (
                <div key={item.name} className="battlebox__modal-item">
                  <span className="battlebox__modal-item-emoji">{item.emoji}</span>
                  <div className="battlebox__modal-item-info">
                    <span className="battlebox__modal-item-name" style={{ color: RARITY_COLORS[item.rarity] }}>
                      {item.name}
                    </span>
                    <span className="battlebox__modal-item-value">{item.value.toLocaleString()} 🪙</span>
                  </div>
                  <div className="battlebox__modal-item-chance">
                    <div className="battlebox__modal-item-chance-bar">
                      <div
                        className="battlebox__modal-item-chance-fill"
                        style={{ width: `${item.chance}%`, background: RARITY_COLORS[item.rarity] }}
                      />
                    </div>
                    <span>{item.chance}%</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="battlebox__btn battlebox__btn--primary"
              onClick={() => { handleBoxChange(detailBox.type, 1); }}
              disabled={totalStake + detailBox.price > balance}
            >
              ➕ Ajouter cette box
            </button>
          </div>
        </div>
      )}
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
              <span>{p.user?.role === 'VIP' ? '👑' : '👤'}</span>
              <span>{p.user?.username ?? 'Joueur'}</span>
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

        {announceMsg && <p className="battlebox__announce-confirm">📢 {announceMsg}</p>}

        <div className="battlebox__waiting-actions">
          {!currentGame.isPrivate && (
            <button className="battlebox__btn battlebox__btn--secondary" onClick={handleAnnounce}>
              📢 Annoncer la partie
            </button>
          )}
          {isVip && currentGame.maxPlayers > currentGame.players.length && (
            <button className="battlebox__btn battlebox__btn--gold" onClick={handleAddBots}>
              🤖 Jouer contre le casino (bots)
            </button>
          )}
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
          <h2>{!revealComplete ? '🎲 Ouverture des box...' : isWinner ? '🏆 Victoire !' : '💸 Défaite'}</h2>
          <p>
            {!revealComplete
              ? 'Que la chance soit avec vous...'
              : isWinner
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
                  Total : <strong style={{ color: revealComplete && player.isWinner ? '#c9a84c' : '#888' }}>
                    {(runningTotals[player.userId] || 0).toLocaleString()} 🪙
                  </strong>
                </div>
                {player.isWinner && revealComplete && (
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
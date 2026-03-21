import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

import {
  getAdminUsersApi,
  getGlobalStatsApi,
  getAdminTransactionsApi,
  getAdminGameRoundsApi,
  getLeaderboardApi,
  getUserTransactionsApi,
  getUserStatsApi,
  getUserLoginHistoryApi,
  getCasinoConfigApi,
  updateCasinoConfigApi,
  updateUserStatusApi,
  creditWalletApi,
  debitWalletApi,
  getAllTransactionsForExportApi,
  getAllGameRoundsForExportApi,
  getBalanceHistoryApi,
  getGamesHistoryApi,
  getAuditLogsApi,
  getAlertsApi,
} from '../api/admin.api';

import type {
  AdminUser,
  GlobalStats,
  AdminTransaction,
  AdminGameRound,
  Leaderboard,
  UserStats,
  LoginHistoryEntry,
  CasinoConfig,
  BalanceHistoryEntry,
  GamesHistoryEntry,
  AuditLog,
  Alert,
} from '../api/admin.api';

import { exportToCsv } from '../utils/csv.utils';
import '../styles/pages/admin.scss';


type Tab = 'stats' | 'leaderboard' | 'games' | 'transactions' | 'players' | 'config' | 'charts' | 'audit' | 'alerts';

const TRANSACTION_COLORS: Record<string, string> = {
  BET: '#e0a85c', WIN: '#4caf7d', LOSS: '#e05c5c',
  REFUND: '#5cc8e0', ADMIN_CREDIT: '#c9a84c', ADMIN_DEBIT: '#e05c5c',
};

const GAME_COLORS: Record<string, string> = {
  SLOTS: '#c9a84c', ROULETTE: '#e05c5c', BLACKJACK: '#4caf7d',
};

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  // Data
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [games, setGames] = useState<AdminGameRound[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);

  // Config
  const [config, setConfig] = useState<CasinoConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(false);

  // Player detail
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userTransactions, setUserTransactions] = useState<AdminTransaction[]>([]);
  const [creditAmount, setCreditAmount] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [debitReason, setDebitReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [search, setSearch] = useState('');
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.phoneNumber?.toLowerCase().includes(q)
    );
  });
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userLoginHistory, setUserLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistoryEntry[]>([]);
  const [gamesHistory, setGamesHistory] = useState<GamesHistoryEntry[]>([]);
  const [chartDays, setChartDays] = useState(30);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);


  // Loading
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    getAlertsApi(10).then((data) => setUnreadAlerts(data.length)).catch(console.error);
  }, []);

  const loadTab = async (tab: Tab) => {
    setLoading(true);
    try {
      if (tab === 'stats' && !stats) {
        setStats(await getGlobalStatsApi());
      }
      if (tab === 'leaderboard' && !leaderboard) {
        setLeaderboard(await getLeaderboardApi());
      }
      if (tab === 'transactions' && transactions.length === 0) {
        setTransactions(await getAdminTransactionsApi());
      }
      if (tab === 'games' && games.length === 0) {
        setGames(await getAdminGameRoundsApi());
      }
      if (tab === 'players' && users.length === 0) {
        setUsers(await getAdminUsersApi());
      }
      if (tab === 'config' && config.length === 0) {
        const data = await getCasinoConfigApi();
        setConfig(data);
      }
      if (tab === 'charts') {
        const [b, g] = await Promise.all([
          getBalanceHistoryApi(chartDays),
          getGamesHistoryApi(chartDays),
        ]);
        setBalanceHistory(b);
        setGamesHistory(g);
      }
      if (tab === 'audit' && auditLogs.length === 0) {
        setAuditLogs(await getAuditLogsApi());
      }
      if (tab === 'alerts' && alerts.length === 0) {
        const data = await getAlertsApi();
        setAlerts(data);
        setUnreadAlerts(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChartDaysChange = async (days: number) => {
    setChartDays(days);
    setLoading(true);
    try {
      const [b, g] = await Promise.all([
        getBalanceHistoryApi(days),
        getGamesHistoryApi(days),
      ]);
      setBalanceHistory(b);
      setGamesHistory(g);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleExportTransactions = async (userId?: string) => {
    setExportLoading(true);
    try {
      const data = userId
        ? await getUserTransactionsApi(userId, 100000)
        : await getAllTransactionsForExportApi();

      const rows = data.map((t) => ({
        Date: formatDate(t.createdAt),
        Joueur: t.user?.username || selectedUser?.username || '—',
        Type: t.type,
        Montant: t.amount,
        'Avant': t.balanceBefore,
        'Après': t.balanceAfter,
        Jeu: t.gameType || '—',
        Raison: t.reason || '—',
      }));

      exportToCsv(
        userId ? `transactions_${selectedUser?.username}` : 'transactions_global',
        rows
      );
    } catch {
      console.error('Erreur export transactions');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportGames = async (userId?: string) => {
    setExportLoading(true);
    try {
      const data = userId
        ? await getMyGameRoundsForExportApi(userId)
        : await getAllGameRoundsForExportApi();

      const rows = data.map((g) => ({
        Date: formatDate(g.createdAt),
        Joueur: g.user?.username || selectedUser?.username || '—',
        Jeu: g.gameType,
        Statut: g.status,
        Mise: g.stake,
        Gain: g.payout,
        Multiplicateur: g.multiplier || '—',
      }));

      exportToCsv(
        userId ? `parties_${selectedUser?.username}` : 'parties_global',
        rows
      );
    } catch {
      console.error('Erreur export parties');
    } finally {
      setExportLoading(false);
    }
  };

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setActionMsg('');
    setCreditAmount('');
    setDebitAmount('');
    const txs = await getUserTransactionsApi(user.id, 30);
    setUserTransactions(txs);
    const stats = await getUserStatsApi(user.id);
    setUserStats(stats);
    const loginHist = await getUserLoginHistoryApi(user.id, 20);
    setUserLoginHistory(loginHist);
  };

  const handleUpdateStatus = async (status: 'ACTIVE' | 'BANNED' | 'SUSPENDED') => {
    if (!selectedUser) return;
    setStatusLoading(true);
    try {
      await updateUserStatusApi(selectedUser.id, status);
      setActionMsg(`✅ Statut mis à jour : ${status}`);
      const updated = await getAdminUsersApi();
      setUsers(updated);
      setSelectedUser(updated.find(u => u.id === selectedUser.id) || null);
    } catch {
      setActionMsg('❌ Erreur lors de la mise à jour du statut');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCredit = async () => {
    if (!selectedUser || !creditAmount) return;
    try {
      await creditWalletApi(selectedUser.id, Number(creditAmount), creditReason || undefined);
      setActionMsg(`✅ +${Number(creditAmount).toLocaleString()} jetons crédités${creditReason ? ` — ${creditReason}` : ''}`);
      setCreditAmount('');
      setCreditReason('');
      const updated = await getAdminUsersApi();
      setUsers(updated);
      setSelectedUser(updated.find(u => u.id === selectedUser.id) || null);
    } catch {
      setActionMsg('❌ Erreur lors du crédit');
    }
  };

  const handleDebit = async () => {
    if (!selectedUser || !debitAmount) return;
    try {
      await debitWalletApi(selectedUser.id, Number(debitAmount), debitReason || undefined);
      setActionMsg(`✅ -${Number(debitAmount).toLocaleString()} jetons débités${debitReason ? ` — ${debitReason}` : ''}`);
      setDebitAmount('');
      setDebitReason('');
      const updated = await getAdminUsersApi();
      setUsers(updated);
      setSelectedUser(updated.find(u => u.id === selectedUser.id) || null);
    } catch {
      setActionMsg('❌ Erreur lors du débit');
    }
  };

  const handleUpdateConfig = async (key: string, value: string) => {
    setConfigLoading(true);
    try {
      await updateCasinoConfigApi(key, value);
      const updated = await getCasinoConfigApi();
      setConfig(updated);
    } catch {
      console.error('Erreur mise à jour config');
    } finally {
      setConfigLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const parseUserAgent = (ua: string | null): string => {
    if (!ua) return 'Inconnu';
    if (ua.includes('Firefox')) return '🦊 Firefox';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return '🌐 Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return '🍎 Safari';
    if (ua.includes('Edg')) return '🔵 Edge';
    if (ua.includes('Opera')) return '🔴 Opera';
    return '🌐 Navigateur inconnu';
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stats', label: '📊 Vue globale' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'games', label: '🎮 Parties' },
    { key: 'transactions', label: '💳 Transactions' },
    { key: 'players', label: '👥 Joueurs' },
    { key: 'config', label: '⚙️ Configuration' },
    { key: 'charts', label: '📈 Graphiques' },
    { key: 'audit', label: '📋 Logs d\'audit' },
    {
      key: 'alerts',
      label: unreadAlerts > 0
        ? `🚨 Alertes (${unreadAlerts})`
        : '🚨 Alertes'
    },
  ];

  const CONFIG_LABELS: Record<string, { label: string; description: string }> = {
    ENABLE_PLAYER_STATS: {
      label: 'Statistiques joueurs',
      description: 'Permet aux joueurs de voir leurs statistiques détaillées par jeu dans leur profil.',
    },
    ENABLE_PUBLIC_STATS: {
      label: 'Statistiques publiques du casino',
      description: 'Affiche les statistiques globales du casino (joueurs inscrits, parties jouées, total distribué) sur la page d\'accueil.',
    },
    DISCORD_WEBHOOK_URL: {
      label: 'Webhook Discord',
      description: 'URL du webhook Discord pour recevoir les alertes en temps réel. Laissez vide pour désactiver.',
    },
    ALERT_HIGH_BET_THRESHOLD: {
      label: 'Seuil mise élevée',
      description: 'Montant en jetons à partir duquel une alerte est déclenchée.',
    },
    ALERT_CONSECUTIVE_LOSSES: {
      label: 'Pertes consécutives',
      description: 'Nombre de pertes consécutives avant alerte.',
    },
    ALERT_CONSECUTIVE_WINS: {
      label: 'Gains consécutifs',
      description: 'Nombre de gains consécutifs avant alerte.',
    },
    ALERT_CASINO_BALANCE_MIN: {
      label: 'Solde casino minimum',
      description: 'Seuil critique du solde du casino en jetons.',
    },
    MAINTENANCE_GLOBAL: {
      label: '🔧 Maintenance globale',
      description: 'Désactive tous les jeux pour tous les joueurs.',
    },
    MAINTENANCE_SLOTS: {
      label: '🎰 Maintenance Slots',
      description: 'Désactive les machines à sous.',
    },
    MAINTENANCE_ROULETTE: {
      label: '🎡 Maintenance Roulette',
      description: 'Désactive la roulette.',
    },
    MAINTENANCE_BLACKJACK: {
      label: '🃏 Maintenance Blackjack',
      description: 'Désactive le blackjack.',
    },
  };

  const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    WALLET_CREDIT: { label: 'Crédit wallet', color: '#4caf7d', icon: '💰' },
    WALLET_DEBIT: { label: 'Débit wallet', color: '#e05c5c', icon: '💸' },
    USER_STATUS_CHANGE: { label: 'Changement statut', color: '#e0a85c', icon: '🔄' },
    CONFIG_UPDATE: { label: 'Config modifiée', color: '#5cc8e0', icon: '⚙️' },
  };

  const ALERT_META: Record<string, { label: string; color: string; icon: string }> = {
    HIGH_BET: { label: 'Mise élevée', color: '#e0a85c', icon: '💰' },
    CONSECUTIVE_LOSSES: { label: 'Pertes consécutives', color: '#e05c5c', icon: '📉' },
    CONSECUTIVE_WINS: { label: 'Gains consécutifs', color: '#4caf7d', icon: '📈' },
    LOW_CASINO_BALANCE: { label: 'Solde casino critique', color: '#c62828', icon: '🚨' },
    NEW_PLAYER: { label: 'Nouveau joueur', color: '#5cc8e0', icon: '🎉' },
    FAILED_LOGIN: { label: 'Connexion échouée', color: '#ff6b6b', icon: '🔐' },
  };

  const BOOL_CONFIGS = [
    'ENABLE_PLAYER_STATS',
    'ENABLE_PUBLIC_STATS',
    'MAINTENANCE_SLOTS',
    'MAINTENANCE_ROULETTE',
    'MAINTENANCE_BLACKJACK',
    'MAINTENANCE_GLOBAL',
  ];

  return (
    <div className="admin">

      <div className="admin__header">
        <h1 className="admin__title">Dashboard Admin</h1>
      </div>

      {/* Tabs */}
      <div className="admin__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`admin__tab ${activeTab === tab.key ? 'admin__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div className="admin__loading">Chargement...</div>}

      {/* ── STATS ── */}
      {activeTab === 'stats' && stats && (
        <div className="admin__stats">
          <div className="admin__kpis">
            {[
              { label: 'Joueurs', value: stats.totalUsers, color: '#c9a84c' },
              { label: 'Parties jouées', value: stats.totalRounds.toLocaleString(), color: '#5cc8e0' },
              { label: 'Total misé', value: `${stats.totalBet.toLocaleString()} 🪙`, color: '#e0a85c' },
              { label: 'Total gagné', value: `${stats.totalWin.toLocaleString()} 🪙`, color: '#4caf7d' },
              { label: 'Revenu casino', value: `${stats.casinoRevenue.toLocaleString()} 🪙`, color: stats.casinoRevenue >= 0 ? '#4caf7d' : '#e05c5c' },
            ].map((kpi) => (
              <div key={kpi.label} className="admin__kpi">
                <span className="admin__kpi-label">{kpi.label}</span>
                <span className="admin__kpi-value" style={{ color: kpi.color }}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>

          <div className="admin__section">
            <h2 className="admin__section-title">Parties par jeu</h2>
            <div className="admin__game-bars">
              {stats.roundsByGame.map((g) => {
                const pct = Math.round((g.count / stats.totalRounds) * 100);
                return (
                  <div key={g.gameType} className="admin__game-bar-row">
                    <span className="admin__game-bar-label"
                      style={{ color: GAME_COLORS[g.gameType] }}>
                      {g.gameType}
                    </span>
                    <div className="admin__game-bar-track">
                      <div
                        className="admin__game-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: GAME_COLORS[g.gameType],
                        }}
                      />
                    </div>
                    <span className="admin__game-bar-count">
                      {g.count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="admin__section">
            <h2 className="admin__section-title">Répartition financière</h2>
            <div className="admin__finance-bars">
              {[
                { label: 'Total misé', value: stats.totalBet, color: '#e0a85c' },
                { label: 'Total gagné', value: stats.totalWin, color: '#4caf7d' },
                { label: 'Revenu casino', value: Math.abs(stats.casinoRevenue), color: '#c9a84c' },
              ].map((item) => {
                const max = stats.totalBet || 1;
                const pct = Math.round((item.value / max) * 100);
                return (
                  <div key={item.label} className="admin__game-bar-row">
                    <span className="admin__game-bar-label" style={{ color: item.color }}>
                      {item.label}
                    </span>
                    <div className="admin__game-bar-track">
                      <div
                        className="admin__game-bar-fill"
                        style={{ width: `${pct}%`, background: item.color }}
                      />
                    </div>
                    <span className="admin__game-bar-count">
                      {item.value.toLocaleString()} 🪙
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {activeTab === 'leaderboard' && leaderboard && (
        <div className="admin__leaderboard">
          {[
            {
              title: '💰 Top Balance',
              data: leaderboard.byBalance,
              valueKey: 'balance',
              valueLabel: (v: number) => `${v.toLocaleString()} 🪙`,
              color: '#c9a84c',
            },
            {
              title: '🏆 Top Gains',
              data: leaderboard.byWins,
              valueKey: 'totalWins',
              valueLabel: (v: number) => `+${v.toLocaleString()} 🪙`,
              color: '#4caf7d',
            },
            {
              title: '🎮 Top Parties',
              data: leaderboard.byRounds,
              valueKey: 'totalRounds',
              valueLabel: (v: number) => `${v.toLocaleString()} parties`,
              color: '#5cc8e0',
            },
          ].map((board) => (
            <div key={board.title} className="admin__board">
              <h2 className="admin__board-title">{board.title}</h2>
              <div className="admin__board-list">
                {(board.data as any[]).map((entry, i) => (
                  <div key={i} className="admin__board-row">
                    <span className="admin__board-rank">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span className="admin__board-username">
                      {entry.user?.username || '—'}
                    </span>
                    <span className="admin__board-role">
                      {entry.user?.role}
                    </span>
                    <span className="admin__board-value" style={{ color: board.color }}>
                      {board.valueLabel(entry[board.valueKey])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── GAMES ── */}
      {activeTab === 'games' && (
        <div className="admin__section">
          <h2 className="admin__section-title">Historique des parties</h2>
          <div className="admin__export-bar">
            <button
              className="admin__export-btn"
              onClick={() => handleExportGames()}
              disabled={exportLoading}
            >
              📥 Exporter toutes les parties (CSV)
            </button>
          </div>
          <div className="admin__table-wrapper">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>Jeu</th>
                  <th>Statut</th>
                  <th>Mise</th>
                  <th>Gain</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <td className="admin__table-username">{g.user.username}</td>
                    <td>
                      <span style={{ color: GAME_COLORS[g.gameType] }}>
                        {g.gameType}
                      </span>
                    </td>
                    <td>
                      <span className={`admin__badge admin__badge--${g.status === 'WON' ? 'win' : g.status === 'LOST' ? 'loss' : 'neutral'}`}>
                        {g.status}
                      </span>
                    </td>
                    <td>{g.stake.toLocaleString()} 🪙</td>
                    <td style={{ color: g.payout > 0 ? '#4caf7d' : '#888' }}>
                      {g.payout > 0 ? `+${g.payout.toLocaleString()}` : '—'} 🪙
                    </td>
                    <td className="admin__table-date">{formatDate(g.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {activeTab === 'transactions' && (
        <div className="admin__section">
          <h2 className="admin__section-title">Toutes les transactions</h2>
          <div className="admin__export-bar">
            <button
              className="admin__export-btn"
              onClick={() => handleExportTransactions()}
              disabled={exportLoading}
            >
              📥 Exporter toutes les transactions (CSV)
            </button>
          </div>
          <div className="admin__table-wrapper">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Avant</th>
                  <th>Après</th>
                  <th>Jeu</th>
                  <th>Raison</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="admin__table-username">{t.user.username}</td>
                    <td>
                      <span
                        className="admin__badge"
                        style={{ color: TRANSACTION_COLORS[t.type], borderColor: TRANSACTION_COLORS[t.type] }}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td style={{ color: TRANSACTION_COLORS[t.type], fontWeight: 600 }}>
                      {t.amount.toLocaleString()} 🪙
                    </td>
                    <td className="admin__table-muted">{t.balanceBefore.toLocaleString()}</td>
                    <td className="admin__table-muted">{t.balanceAfter.toLocaleString()}</td>
                    <td>{t.gameType || '—'}</td>
                    <td className="admin__table-reason">{t.reason || '—'}</td>
                    <td className="admin__table-date">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PLAYERS ── */}
      {activeTab === 'players' && (
        <div className="admin__players">
          <div className="admin__players-list">
            <h2 className="admin__section-title">Joueurs ({filteredUsers.length})</h2>

            <div className="admin__search">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par pseudo, prénom, nom, téléphone..."
              />
              {search && (
                <button onClick={() => setSearch('')}>✕</button>
              )}
            </div>

            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`admin__player-row ${selectedUser?.id === user.id ? 'admin__player-row--active' : ''}`}
                onClick={() => handleSelectUser(user)}
              >
                <div className="admin__player-info">
                  <span className="admin__player-username">{user.username}</span>
                  <span className={`admin__player-role admin__player-role--${user.role.toLowerCase()}`}>
                    {user.role}
                  </span>
                </div>
                <div className="admin__player-balance">
                  {user.wallet.balance.toLocaleString()} 🪙
                </div>
              </div>
            ))}
          </div>

          {selectedUser && (
            <div className="admin__player-detail">
              <h2 className="admin__section-title">
                {selectedUser.username} - {selectedUser.firstName} {selectedUser.lastName}
                <span className={`admin__player-role admin__player-role--${selectedUser.role.toLowerCase()}`}>
                  {selectedUser.role}
                </span>
              </h2>

              <div className="admin__player-stats">
                <div className="admin__kpi">
                  <span className="admin__kpi-label">Balance</span>
                  <span className="admin__kpi-value" style={{ color: '#c9a84c' }}>
                    {selectedUser.wallet.balance.toLocaleString()} 🪙
                  </span>
                </div>
                <div className="admin__kpi">
                  <span className="admin__kpi-label">Statut</span>
                  <span className="admin__kpi-value">{selectedUser.status}</span>
                </div>
                <div className="admin__kpi">
                  <span className="admin__kpi-label">Membre depuis</span>
                  <span className="admin__kpi-value">
                    {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="admin__status-actions">
                <p className="admin__status-label">Changer le statut</p>
                <div className="admin__status-btns">
                  <button
                    className={`admin__btn admin__btn--active ${selectedUser.status === 'ACTIVE' ? 'admin__btn--current' : ''}`}
                    onClick={() => handleUpdateStatus('ACTIVE')}
                    disabled={statusLoading || selectedUser.status === 'ACTIVE'}
                  >
                    ✅ Actif
                  </button>
                  <button
                    className={`admin__btn admin__btn--suspended ${selectedUser.status === 'SUSPENDED' ? 'admin__btn--current' : ''}`}
                    onClick={() => handleUpdateStatus('SUSPENDED')}
                    disabled={statusLoading || selectedUser.status === 'SUSPENDED'}
                  >
                    ⏸ Suspendre
                  </button>
                  <button
                    className={`admin__btn admin__btn--banned ${selectedUser.status === 'BANNED' ? 'admin__btn--current' : ''}`}
                    onClick={() => handleUpdateStatus('BANNED')}
                    disabled={statusLoading || selectedUser.status === 'BANNED'}
                  >
                    🚫 Bannir
                  </button>
                </div>
              </div>

              <div className="admin__kpi">
                <span className="admin__kpi-label">Téléphone</span>
                <span className="admin__kpi-value" style={{ color: '#5cc8e0' }}>
                  {selectedUser.phoneNumber}
                </span>
              </div>

              {/* Actions wallet */}
              <div className="admin__wallet-actions">
                <div className="admin__wallet-action">
                  <label>Créditer (jetons)</label>
                  <div className="admin__wallet-action-row">
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Montant"
                    />
                  </div>
                  <input
                    className="admin__wallet-reason"
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="Raison (ex: compensation, bonus...)"
                  />
                  <button className="admin__btn admin__btn--credit" onClick={handleCredit}>
                    + Créditer
                  </button>
                </div>

                <div className="admin__wallet-action">
                  <label>Débiter (jetons)</label>
                  <div className="admin__wallet-action-row">
                    <input
                      type="number"
                      value={debitAmount}
                      onChange={(e) => setDebitAmount(e.target.value)}
                      placeholder="Montant"
                    />
                  </div>
                  <input
                    className="admin__wallet-reason"
                    type="text"
                    value={debitReason}
                    onChange={(e) => setDebitReason(e.target.value)}
                    placeholder="Raison (ex: sanction, correction...)"
                  />
                  <button className="admin__btn admin__btn--debit" onClick={handleDebit}>
                    − Débiter
                  </button>
                </div>
              </div>

              {actionMsg && (
                <p className="admin__action-msg">{actionMsg}</p>
              )}

              {/* User stats */}
              {userStats && (
                <div className="admin__user-stats">
                  <div className="admin__section-title-row" style={{ marginTop: '24px' }}>
                    <h3 className="admin__section-title">Statistiques</h3>
                    <button
                      className="admin__export-btn admin__export-btn--small"
                      onClick={() => handleExportGames(selectedUser.id)}
                      disabled={exportLoading}
                    >
                      📥 CSV parties
                    </button>
                  </div>



                  <div className="admin__kpis">
                    {[
                      { label: 'Parties', value: userStats.totalRounds, color: '#5cc8e0' },
                      { label: 'Victoires', value: userStats.totalWon, color: '#4caf7d' },
                      { label: 'Défaites', value: userStats.totalLost, color: '#e05c5c' },
                      { label: 'Taux victoire', value: `${userStats.winRate}%`, color: '#c9a84c' },
                      { label: 'Total misé', value: `${userStats.totalStake.toLocaleString()} 🪙`, color: '#e0a85c' },
                      { label: 'Total gagné', value: `${userStats.totalPayout.toLocaleString()} 🪙`, color: '#4caf7d' },
                      { label: 'Résultat net', value: `${userStats.netResult >= 0 ? '+' : ''}${userStats.netResult.toLocaleString()} 🪙`, color: userStats.netResult >= 0 ? '#4caf7d' : '#e05c5c' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="admin__kpi">
                        <span className="admin__kpi-label">{kpi.label}</span>
                        <span className="admin__kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="admin__bygame">
                    {userStats.byGame.filter(g => g.total > 0).map((g) => {
                      const GAME_COLORS: Record<string, string> = {
                        SLOTS: '#c9a84c', ROULETTE: '#e05c5c', BLACKJACK: '#4caf7d',
                      };
                      const GAME_ICONS: Record<string, string> = {
                        SLOTS: '🎰', ROULETTE: '🎡', BLACKJACK: '🃏',
                      };
                      return (
                        <div key={g.gameType} className="admin__bygame-card">
                          <div className="admin__bygame-header">
                            <span style={{ color: GAME_COLORS[g.gameType] }}>
                              {GAME_ICONS[g.gameType]} {g.gameType}
                            </span>
                            <span className="admin__table-muted">{g.total} parties</span>
                          </div>
                          <div className="admin__bygame-rows">
                            {[
                              { label: 'Victoires', value: g.won, color: '#4caf7d', pct: Math.round((g.won / g.total) * 100) },
                              { label: 'Défaites', value: g.lost, color: '#e05c5c', pct: Math.round((g.lost / g.total) * 100) },
                            ].map((row) => (
                              <div key={row.label} className="admin__bygame-row">
                                <span>{row.label}</span>
                                <div className="admin__bygame-track">
                                  <div className="admin__bygame-fill" style={{ width: `${row.pct}%`, background: row.color }} />
                                </div>
                                <span>{row.value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="admin__bygame-financial">
                            <span>Misé : <strong>{g.stake.toLocaleString()} 🪙</strong></span>
                            <span style={{ color: (g.payout - g.stake) >= 0 ? '#4caf7d' : '#e05c5c' }}>
                              Net : <strong>{(g.payout - g.stake) >= 0 ? '+' : ''}{(g.payout - g.stake).toLocaleString()} 🪙</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <h3 className="admin__section-title" style={{ marginTop: '24px' }}>
                🔐 Dernières connexions
              </h3>
              <div className="admin__table-wrapper">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>Navigateur</th>
                      <th>Adresse IP</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLoginHistory.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                          Aucune connexion enregistrée
                        </td>
                      </tr>
                    ) : (
                      userLoginHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td>{parseUserAgent(entry.userAgent)}</td>
                          <td className="admin__table-muted">{entry.ipAddress || '—'}</td>
                          <td className="admin__table-date">{formatDate(entry.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Transactions du joueur */}
              <h3 className="admin__section-title" style={{ marginTop: '24px' }}>
                Dernières transactions
              </h3>
              <button
                className="admin__export-btn admin__export-btn--small"
                onClick={() => handleExportTransactions(selectedUser.id)}
                disabled={exportLoading}
              >
                📥 CSV
              </button>
              <div className="admin__table-wrapper">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Montant</th>
                      <th>Avant</th>
                      <th>Après</th>
                      <th>Jeu</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTransactions.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <span
                            className="admin__badge"
                            style={{ color: TRANSACTION_COLORS[t.type], borderColor: TRANSACTION_COLORS[t.type] }}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td style={{ color: TRANSACTION_COLORS[t.type], fontWeight: 600 }}>
                          {t.amount.toLocaleString()} 🪙
                        </td>
                        <td className="admin__table-muted">{t.balanceBefore.toLocaleString()}</td>
                        <td className="admin__table-muted">{t.balanceAfter.toLocaleString()}</td>
                        <td>{t.gameType || '—'}</td>
                        <td className="admin__table-date">{formatDate(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )
      }

      {/* ── CONFIG ── */}
      {activeTab === 'config' && (
        <div className="admin__config">
          <h2 className="admin__section-title">⚙️ Configuration du casino</h2>
          <p className="admin__config-hint">
            Ces paramètres affectent le comportement de la plateforme pour tous les joueurs.
          </p>
          <div className="admin__config-list">
            {config.map((item) => {
              const meta = CONFIG_LABELS[item.key];
              const isEnabled = item.value === 'true';
              const isBool = BOOL_CONFIGS.includes(item.key);

              return (
                <div key={item.key} className="admin__config-row">
                  <div className="admin__config-info">
                    <span className="admin__config-label">
                      {meta?.label || item.key}
                    </span>
                    <span className="admin__config-description">
                      {meta?.description || '—'}
                    </span>
                    <span className="admin__config-updated">
                      Dernière modification : {new Date(item.updatedAt).toLocaleString('fr-FR')} par {item.updatedByUsername || '—'}
                    </span>
                  </div>

                  {isBool ? (
                    <div className="admin__config-toggle">
                      <button
                        className={`admin__toggle ${isEnabled ? 'admin__toggle--on' : 'admin__toggle--off'}`}
                        onClick={() => handleUpdateConfig(item.key, isEnabled ? 'false' : 'true')}
                        disabled={configLoading}
                      >
                        <span className="admin__toggle-dot" />
                      </button>
                      <span className={`admin__toggle-label ${isEnabled ? 'admin__toggle-label--on' : 'admin__toggle-label--off'}`}>
                        {isEnabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  ) : (
                    <div className="admin__config-input">
                      <input
                        type="text"
                        defaultValue={item.value}
                        onBlur={(e) => {
                          if (e.target.value !== item.value) {
                            handleUpdateConfig(item.key, e.target.value);
                          }
                        }}
                        placeholder="Valeur..."
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {config.length === 0 && !loading && (
              <p className="admin__config-empty">Aucune configuration disponible.</p>
            )}
          </div>
        </div>
      )}

      {/* ── CHARTS ── */}
      {activeTab === 'charts' && (
        <div className="admin__charts">

          {/* Sélecteur de période */}
          <div className="admin__charts-header">
            <h2 className="admin__section-title">📈 Graphiques d'évolution</h2>
            <div className="admin__charts-period">
              {[7, 14, 30, 60].map((d) => (
                <button
                  key={d}
                  className={`admin__period-btn ${chartDays === d ? 'admin__period-btn--active' : ''}`}
                  onClick={() => handleChartDaysChange(d)}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>

          {/* Graphique revenus */}
          <div className="admin__chart-card">
            <h3 className="admin__chart-title">Revenus du casino</h3>
            <p className="admin__chart-subtitle">Mises, gains reversés et revenu net par jour</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={balanceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 8 }}
                  labelStyle={{ color: '#f0f0f0' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="bets"
                  name="Mises"
                  stroke="#e0a85c"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="wins"
                  name="Gains reversés"
                  stroke="#e05c5c"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenu net"
                  stroke="#c9a84c"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique parties par jeu */}
          <div className="admin__chart-card">
            <h3 className="admin__chart-title">Parties jouées par jeu</h3>
            <p className="admin__chart-subtitle">Nombre de parties par jour et par jeu</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gamesHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 8 }}
                  labelStyle={{ color: '#f0f0f0' }}
                />
                <Legend />
                <Bar dataKey="SLOTS" name="Slots" fill="#c9a84c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ROULETTE" name="Roulette" fill="#e05c5c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="BLACKJACK" name="Blackjack" fill="#4caf7d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique total parties */}
          <div className="admin__chart-card">
            <h3 className="admin__chart-title">Total des parties</h3>
            <p className="admin__chart-subtitle">Évolution du nombre total de parties jouées par jour</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={gamesHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 8 }}
                  labelStyle={{ color: '#f0f0f0' }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total parties"
                  stroke="#5cc8e0"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* AUDIT */}
      {activeTab === 'audit' && (
        <div className="admin__section">
          <div className="admin__section-title-row">
            <h2 className="admin__section-title">📋 Logs d'audit</h2>
            <button
              className="admin__export-btn"
              onClick={() => {
                const rows = auditLogs.map((log) => ({
                  Date: formatDate(log.createdAt),
                  Admin: log.admin?.username || 'Système',
                  Action: ACTION_LABELS[log.action]?.label || log.action,
                  Cible: log.targetType,
                  'ID Cible': log.targetId,
                  Détails: JSON.stringify(log.metadata),
                }));
                exportToCsv('audit_logs', rows);
              }}
            >
              📥 Exporter CSV
            </button>
          </div>

          <div className="admin__table-wrapper">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Cible</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => {
                  const meta = ACTION_LABELS[log.action];
                  return (
                    <tr key={log.id}>
                      <td className="admin__table-date">{formatDate(log.createdAt)}</td>
                      <td className="admin__table-username">{log.admin?.username || 'Système'}</td>
                      <td>
                        <span
                          className="admin__badge"
                          style={{
                            color: meta?.color || '#888',
                            borderColor: meta?.color || '#888',
                          }}
                        >
                          {meta?.icon} {meta?.label || log.action}
                        </span>
                      </td>
                      <td className="admin__table-muted">
                        {log.targetType} — <code style={{ fontSize: 11, color: '#888' }}>
                          {log.targetId.slice(0, 12)}...
                        </code>
                      </td>
                      <td>
                        <div className="admin__audit-meta">
                          {Object.entries(log.metadata || {}).map(([k, v]) => (
                            <span key={k} className="admin__audit-tag">
                              <strong>{k}</strong> : {String(v)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {activeTab === 'alerts' && (
        <div className="admin__section">
          <div className="admin__section-title-row">
            <h2 className="admin__section-title">🚨 Alertes système</h2>
            <button
              className="admin__export-btn"
              onClick={() => {
                const rows = alerts.map((a) => ({
                  Date: formatDate(a.createdAt),
                  Type: ALERT_META[a.type]?.label || a.type,
                  Message: a.message,
                  Joueur: a.username || '—',
                }));
                exportToCsv('alertes', rows);
              }}
            >
              📥 Exporter CSV
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="admin__alerts-empty">
              <span>✅</span>
              <p>Aucune alerte pour le moment</p>
            </div>
          ) : (
            <div className="admin__alerts-list">
              {alerts.map((alert) => {
                const meta = ALERT_META[alert.type];
                return (
                  <div
                    key={alert.id}
                    className="admin__alert-row"
                    style={{ borderLeftColor: meta?.color || '#888' }}
                  >
                    <div className="admin__alert-icon">{meta?.icon || '⚠️'}</div>
                    <div className="admin__alert-content">
                      <div className="admin__alert-header">
                        <span
                          className="admin__alert-type"
                          style={{ color: meta?.color || '#888' }}
                        >
                          {meta?.label || alert.type}
                        </span>
                        {alert.username && (
                          <span className="admin__alert-username">
                            👤 {alert.username}
                          </span>
                        )}
                        <span className="admin__alert-date">
                          {formatDate(alert.createdAt)}
                        </span>
                      </div>
                      <p className="admin__alert-message">{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div >
  );
};

export default AdminPage;
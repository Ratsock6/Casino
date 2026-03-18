import React, { useState, useEffect } from 'react';
import {
  getAdminUsersApi, getGlobalStatsApi, getAdminTransactionsApi,
  getAdminGameRoundsApi, getLeaderboardApi, getUserTransactionsApi,
  creditWalletApi, debitWalletApi,
} from '../api/admin.api';
import type {
  AdminUser, GlobalStats, AdminTransaction,
  AdminGameRound, Leaderboard,
} from '../api/admin.api';
import '../styles/pages/admin.scss';
import { updateUserStatusApi } from '../api/admin.api';

type Tab = 'stats' | 'leaderboard' | 'games' | 'transactions' | 'players';

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

  // Loading
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setActionMsg('');
    setCreditAmount('');
    setDebitAmount('');
    const txs = await getUserTransactionsApi(user.id, 30);
    setUserTransactions(txs);
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stats', label: '📊 Vue globale' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'games', label: '🎮 Parties' },
    { key: 'transactions', label: '💳 Transactions' },
    { key: 'players', label: '👥 Joueurs' },
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
                {selectedUser.username}
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
                <span className="admin__kpi-label">Téléphone RP</span>
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

              {/* Transactions du joueur */}
              <h3 className="admin__section-title" style={{ marginTop: '24px' }}>
                Dernières transactions
              </h3>
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

    </div >
  );
};

export default AdminPage;
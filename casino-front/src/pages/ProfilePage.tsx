import React, { useState, useEffect } from 'react';
import {
  getProfileApi, getMyTransactionsApi,
  getMyGameRoundsApi, getMyStatsApi,
  useRewardCodeApi
} from '../api/profile.api';
import type { UserProfile, UserTransaction, UserGameRound, UserStats } from '../api/profile.api';
import '../styles/pages/profile.scss';
import axiosInstance from '../utils/axios.instance';
import { getMyLoginHistoryApi, type LoginHistoryEntry } from '../api/profile.api';
import { linkDiscordApi, unlinkDiscordApi, changePasswordApi } from '../api/profile.api';
import { getVipStatusApi, type VipStatus } from '../api/vip.api';


type Tab = 'info' | 'transactions' | 'games' | 'stats' | 'connections' | 'discord' | 'password' | 'codes';

const TRANSACTION_COLORS: Record<string, string> = {
  BET: '#e0a85c', WIN: '#4caf7d', LOSS: '#e05c5c',
  REFUND: '#5cc8e0', ADMIN_CREDIT: '#c9a84c', ADMIN_DEBIT: '#e05c5c',
  ADJUSTMENT: '#888',
};

const GAME_COLORS: Record<string, string> = {
  SLOTS: '#c9a84c', ROULETTE: '#e05c5c', BLACKJACK: '#4caf7d', BATTLE_BOX: '#5cc8e0',
};

const GAME_ICONS: Record<string, string> = {
  SLOTS: '🎰', ROULETTE: '🎡', BLACKJACK: '🃏', BATTLE_BOX: '🎮',
};

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [games, setGames] = useState<UserGameRound[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsEnabled, setStatsEnabled] = useState<boolean | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [discordCode, setDiscordCode] = useState('');
  const [discordMsg, setDiscordMsg] = useState('');
  const [discordError, setDiscordError] = useState('');
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<any>(null);


  const handleLinkDiscord = async () => {
    setDiscordMsg('');
    setDiscordError('');
    try {
      await linkDiscordApi(discordCode);
      setDiscordMsg('✅ Compte Discord lié avec succès !');
      setDiscordCode('');
      // Recharge le profil
      const updated = await getProfileApi();
      setProfile(updated);
    } catch (err: any) {
      setDiscordError(err.response?.data?.message || 'Code invalide ou expiré.');
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setPasswordLoading(true);
    try {
      const data = await changePasswordApi(currentPassword, newPassword);
      setPasswordMsg(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUnlinkDiscord = async () => {
    setDiscordMsg('');
    setDiscordError('');
    try {
      await unlinkDiscordApi();
      setDiscordMsg('✅ Compte Discord délié.');
      const updated = await getProfileApi();
      setProfile(updated);
    } catch {
      setDiscordError('Une erreur est survenue.');
    }
  };

  useEffect(() => {
    loadTab(activeTab);
    const checkStatsEnabled = async () => {
      try {
        const res = await axiosInstance.get('/game-rounds/me/stats/enabled');
        setStatsEnabled(res.data.enabled);
      } catch {
        setStatsEnabled(false);
      }
    };
    checkStatsEnabled();
  }, [activeTab]);

  const loadTab = async (tab: Tab) => {
    setLoading(true);
    try {
      if (tab === 'info' && !profile) {
        setProfile(await getProfileApi());
      }
      if (tab === 'transactions' && transactions.length === 0) {
        setTransactions(await getMyTransactionsApi(100));
      }
      if (tab === 'games' && games.length === 0) {
        setGames(await getMyGameRoundsApi(100));
      }
      if (tab === 'stats' && !stats && statsEnabled) {
        setStats(await getMyStatsApi());
      }
      if (tab === 'connections' && loginHistory.length === 0) {
        setLoginHistory(await getMyLoginHistoryApi(50));
      }
      if (tab === 'info' && !profile) {
        const [p, v] = await Promise.all([getProfileApi(), getVipStatusApi()]);
        setProfile(p);
        setVipStatus(v);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parseUserAgent = (ua: string | null): string => {
    if (!ua) return 'Null';
    if (ua.includes('Firefox')) return '🦊 Firefox';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return '🌐 Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return '🍎 Safari';
    if (ua.includes('Edg')) return '🔵 Edge';
    if (ua.includes('Opera')) return '🔴 Opera';
    return '🌐 Navigateur inconnu';
  };

  const handleUsePromoCode = async () => {
    setPromoMsg('');
    setPromoError('');
    setPromoResult(null);
    setPromoLoading(true);
    try {
      const result = await useRewardCodeApi(promoCode);
      setPromoMsg(result.message);
      setPromoResult(result);
      setPromoCode('');
      // Rafraîchit le solde si jetons
      if (result.rewardType === 'TOKENS') {
        const updated = await axiosInstance.get('/wallet/me');
        setBalance(parseFloat(updated.data.balance));
      }
    } catch (err: any) {
      setPromoError(err.response?.data?.message || 'Code invalide ou déjà utilisé.');
    } finally {
      setPromoLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info', label: '👤 Mon profil' },
    { key: 'transactions', label: '💳 Transactions' },
    { key: 'games', label: '🎮 Parties' },
    { key: 'connections', label: '🔐 Connexions' },
    { key: 'discord', label: '🔗 Discord' },
    { key: 'password', label: '🔒 Sécurité' },
    { key: 'codes', label: '🎟️ Codes' },
    ...(statsEnabled ? [{ key: 'stats' as Tab, label: '📊 Statistiques' }] : []),
  ];

  return (
    <div className="profile">

      <div className="profile__header">
        <h1 className="profile__title">Mon Compte</h1>
      </div>

      <div className="profile__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`profile__tab ${activeTab === tab.key ? 'profile__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div className="profile__loading">Chargement...</div>}

      {/* ── INFO ── */}
      {activeTab === 'info' && profile && (
        <div className="profile__info">
          <div className="profile__info-card">
            <div className="profile__avatar">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="profile__info-main">
              <h2 className="profile__username">{profile.username}</h2>
              <span className={`profile__role profile__role--${profile.role.toLowerCase()}`}>
                {profile.role}
              </span>
            </div>

            {profile.role === 'VIP' && (
              <div className="profile__vip-badge">
                👑 VIP
                {vipStatus?.subscription && !vipStatus.subscription.isLifetime && (
                  <span> — {vipStatus.subscription.daysLeft}j restants</span>
                )}
                {vipStatus?.subscription?.isLifetime && <span> — À vie</span>}
              </div>
            )}
          </div>

          <div className="profile__fields">
            {[
              { label: 'Prénom', value: profile.firstName },
              { label: 'Nom', value: profile.lastName },
              { label: 'Pseudo', value: profile.username },
              { label: 'Téléphone RP', value: profile.phoneNumber },
              { label: 'Solde', value: `${Number(profile.balance).toLocaleString()} 🪙` },
              { label: 'Statut', value: profile.status },
              { label: 'Membre depuis', value: new Date(profile.createdAt).toLocaleDateString('fr-FR') },
              { label: 'Dernière connexion', value: profile.lastLoginAt ? formatDate(profile.lastLoginAt) : '—' },
            ].map((field) => (
              <div key={field.label} className="profile__field">
                <span className="profile__field-label">{field.label}</span>
                <span className="profile__field-value">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {activeTab === 'transactions' && (
        <div className="profile__section">
          <p className="profile__section-hint">
            Les 100 dernières transactions
          </p>
          <div className="profile__table-wrapper">
            <table className="profile__table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Avant</th>
                  <th>Après</th>
                  <th>Détail</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span
                        className="profile__badge"
                        style={{
                          color: TRANSACTION_COLORS[t.type],
                          borderColor: TRANSACTION_COLORS[t.type],
                        }}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td style={{ color: TRANSACTION_COLORS[t.type], fontWeight: 600 }}>
                      {Number(t.amount).toLocaleString()} 🪙
                    </td>
                    <td className="profile__table-muted">
                      {Number(t.balanceBefore).toLocaleString()}
                    </td>
                    <td className="profile__table-muted">
                      {Number(t.balanceAfter).toLocaleString()}
                    </td>
                    <td className="profile__table-muted">
                      {t.reason || t.gameType || '—'}
                    </td>
                    <td className="profile__table-date">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GAMES ── */}
      {activeTab === 'games' && (
        <div className="profile__section">
          <p className="profile__section-hint">
            Les 100 dernières parties
          </p>
          <div className="profile__table-wrapper">
            <table className="profile__table">
              <thead>
                <tr>
                  <th>Jeu</th>
                  <th>Statut</th>
                  <th>Mise</th>
                  <th>Gain</th>
                  <th>Multiplicateur</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <span style={{ color: GAME_COLORS[g.gameType] }}>
                        {GAME_ICONS[g.gameType]} {g.gameType}
                      </span>
                    </td>
                    <td>
                      <span className={`profile__badge profile__badge--${g.status === 'WON' ? 'win'
                        : g.status === 'LOST' ? 'loss'
                          : 'neutral'
                        }`}>
                        {g.status}
                      </span>
                    </td>
                    <td>{g.stake.toLocaleString()} 🪙</td>
                    <td style={{ color: g.payout > 0 ? '#4caf7d' : '#888' }}>
                      {g.payout > 0 ? `+${g.payout.toLocaleString()}` : '—'} 🪙
                    </td>
                    <td className="profile__table-muted">
                      {g.multiplier ? `x${g.multiplier}` : '—'}
                    </td>
                    <td className="profile__table-date">
                      {formatDate(g.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      {activeTab === 'stats' && statsEnabled && stats && (
        <div className="profile__stats">

          <div className="profile__kpis">
            {[
              { label: 'Parties jouées', value: stats.totalRounds, color: '#5cc8e0' },
              { label: 'Victoires', value: stats.totalWon, color: '#4caf7d' },
              { label: 'Défaites', value: stats.totalLost, color: '#e05c5c' },
              { label: 'Taux de victoire', value: `${stats.winRate}%`, color: '#c9a84c' },
              { label: 'Total misé', value: `${stats.totalStake.toLocaleString()} 🪙`, color: '#e0a85c' },
              { label: 'Total gagné', value: `${stats.totalPayout.toLocaleString()} 🪙`, color: '#4caf7d' },
              {
                label: 'Résultat net',
                value: `${stats.netResult >= 0 ? '+' : ''}${stats.netResult.toLocaleString()} 🪙`,
                color: stats.netResult >= 0 ? '#4caf7d' : '#e05c5c',
              },
            ].map((kpi) => (
              <div key={kpi.label} className="profile__kpi">
                <span className="profile__kpi-label">{kpi.label}</span>
                <span className="profile__kpi-value" style={{ color: kpi.color }}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>

          <div className="profile__bygame">
            <h3 className="profile__bygame-title">Stats par jeu</h3>
            <div className="profile__bygame-grid">
              {stats.byGame.filter(g => g.total > 0).map((g) => (
                <div key={g.gameType} className="profile__bygame-card">
                  <div className="profile__bygame-header">
                    <span style={{ color: GAME_COLORS[g.gameType] }}>
                      {GAME_ICONS[g.gameType]} {g.gameType}
                    </span>
                    <span className="profile__bygame-total">{g.total} parties</span>
                  </div>
                  <div className="profile__bygame-stats">
                    <div className="profile__bygame-bar-row">
                      <span>Victoires</span>
                      <div className="profile__bygame-track">
                        <div
                          className="profile__bygame-fill"
                          style={{
                            width: `${g.total > 0 ? Math.round((g.won / g.total) * 100) : 0}%`,
                            background: '#4caf7d',
                          }}
                        />
                      </div>
                      <span>{g.won}</span>
                    </div>
                    <div className="profile__bygame-bar-row">
                      <span>Défaites</span>
                      <div className="profile__bygame-track">
                        <div
                          className="profile__bygame-fill"
                          style={{
                            width: `${g.total > 0 ? Math.round((g.lost / g.total) * 100) : 0}%`,
                            background: '#e05c5c',
                          }}
                        />
                      </div>
                      <span>{g.lost}</span>
                    </div>
                  </div>
                  <div className="profile__bygame-financial">
                    <span>Misé : <strong>{g.stake.toLocaleString()} 🪙</strong></span>
                    <span style={{ color: g.payout > g.stake ? '#4caf7d' : '#e05c5c' }}>
                      Net : <strong>{(g.payout - g.stake) >= 0 ? '+' : ''}{(g.payout - g.stake).toLocaleString()} 🪙</strong>
                    </span>
                  </div>
                </div>
              ))}
              {stats.byGame.every(g => g.total === 0) && (
                <p className="profile__empty">Aucune partie jouée pour le moment.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'connections' && (
        <div className="profile__section">
          <p className="profile__section-hint">
            Les 50 dernières connexions à votre compte
          </p>
          {loginHistory.length === 0 ? (
            <p className="profile__empty">Aucune connexion enregistrée.</p>
          ) : (
            <div className="profile__table-wrapper">
              <table className="profile__table">
                <thead>
                  <tr>
                    <th>Navigateur</th>
                    <th>Adresse IP</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td>{parseUserAgent(entry.userAgent)}</td>
                      <td className="profile__table-muted">
                        {entry.ipAddress || '—'}
                      </td>
                      <td className="profile__table-date">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discord' && profile && (
        <div className="profile__discord">
          {profile.discordId ? (
            <div className="profile__discord-linked">
              <div className="profile__discord-status">
                <span className="profile__discord-icon">✅</span>
                <div>
                  <p className="profile__discord-title">Compte Discord lié</p>
                  <p className="profile__discord-username">{profile.discordUsername}</p>
                </div>
              </div>
              <p className="profile__discord-desc">
                Vous pouvez utiliser les commandes <strong>/solde</strong> et <strong>/retrait</strong> sur notre serveur Discord.
              </p>
              <button className="profile__discord-unlink" onClick={handleUnlinkDiscord}>
                🔗 Délier mon compte Discord
              </button>
            </div>
          ) : (
            <div className="profile__discord-unlinked">
              <div className="profile__discord-status">
                <span className="profile__discord-icon">❌</span>
                <div>
                  <p className="profile__discord-title">Aucun compte Discord lié</p>
                  <p className="profile__discord-username">Liez votre Discord pour accéder aux commandes du bot.</p>
                </div>
              </div>
              <div className="profile__discord-steps">
                <p><strong>1.</strong> Rejoignez notre serveur Discord</p>
                <p><strong>2.</strong> Tapez la commande <strong>/lier</strong></p>
                <p><strong>3.</strong> Entrez le code reçu ci-dessous :</p>
              </div>
              <div className="profile__discord-form">
                <input
                  type="text"
                  value={discordCode}
                  onChange={(e) => setDiscordCode(e.target.value.toUpperCase())}
                  placeholder="Ex: A1B2C3"
                  maxLength={6}
                />
                <button onClick={handleLinkDiscord} disabled={discordCode.length !== 6}>
                  Lier mon compte
                </button>
              </div>
              {discordMsg && <p className="profile__discord-success">{discordMsg}</p>}
              {discordError && <p className="profile__discord-error">{discordError}</p>}
            </div>
          )}
        </div>
      )}


      {activeTab === 'password' && (
        <div className="profile__password">
          <h3 className="profile__section-title">Changer mon mot de passe</h3>
          <p className="profile__section-hint">
            Pour votre sécurité, choisissez un mot de passe d'au moins 8 caractères.
          </p>

          <div className="profile__password-form">
            <div className="profile__password-field">
              <label>Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Votre mot de passe actuel"
              />
            </div>
            <div className="profile__password-field">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
              />
            </div>
            <div className="profile__password-field">
              <label>Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le nouveau mot de passe"
              />
            </div>

            {passwordError && (
              <p className="profile__password-error">{passwordError}</p>
            )}
            {passwordMsg && (
              <p className="profile__password-success">✅ {passwordMsg}</p>
            )}

            <button
              className="profile__password-btn"
              onClick={handleChangePassword}
              disabled={
                passwordLoading ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {passwordLoading ? 'Modification...' : '🔑 Modifier le mot de passe'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'codes' && (
        <div className="profile__promo">
          <h3 className="profile__section-title">🎁 Entrer un code promo</h3>
          <p className="profile__section-hint">
            Entrez un code promotionnel pour recevoir des récompenses exclusives.
          </p>

          <div className="profile__promo-form">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Entrez votre code..."
              maxLength={30}
              onKeyDown={(e) => e.key === 'Enter' && handleUsePromoCode()}
            />
            <button
              className="profile__promo-btn"
              onClick={handleUsePromoCode}
              disabled={promoLoading || promoCode.length < 2}
            >
              {promoLoading ? '⏳ Validation...' : '🎁 Valider'}
            </button>
          </div>

          {promoError && <p className="profile__promo-error">{promoError}</p>}

          {promoResult && (
            <div className="profile__promo-result">
              <div className="profile__promo-result-icon">
                {promoResult.rewardType === 'TOKENS' ? '💰' :
                  promoResult.rewardType === 'VIP' ? '👑' :
                    promoResult.rewardType === 'BADGE' ? '🏅' : '🎮'}
              </div>
              <div>
                <p className="profile__promo-result-msg">{promoMsg}</p>
                {promoResult.description && (
                  <p className="profile__promo-result-desc">{promoResult.description}</p>
                )}
                {promoResult.isIngame && (
                  <p className="profile__promo-result-ingame">
                    ⚠️ Contactez un membre du staff en jeu pour récupérer votre lot.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

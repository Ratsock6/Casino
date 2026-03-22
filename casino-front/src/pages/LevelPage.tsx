import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import {
  getMyLevelApi,
  getLevelLeaderboardApi,
  getRewardsTableApi,
  type PlayerLevel,
  type RewardTableEntry,
} from '../api/levels.api';
import '../styles/pages/level.scss';

type Tab = 'progression' | 'rewards' | 'leaderboard';

const BADGE_COLORS: Record<string, string> = {
  '🥈 Argent':    '#a8a8a8',
  '🥇 Or':        '#c9a84c',
  '💎 Platine':   '#5cc8e0',
  '🌟 Diamant':   '#e05c5c',
  '👑 Légendaire': '#c9a84c',
};

const getLevelColor = (level: number): string => {
  if (level >= 100) return '#c9a84c';
  if (level >= 75)  return '#e05c5c';
  if (level >= 50)  return '#5cc8e0';
  if (level >= 25)  return '#4caf7d';
  return '#888888';
};

const LevelPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('progression');
  const [playerLevel, setPlayerLevel] = useState<PlayerLevel | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rewardsTable, setRewardsTable] = useState<RewardTableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLevelApi().then(setPlayerLevel).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard' && leaderboard.length === 0) {
      getLevelLeaderboardApi().then(setLeaderboard).catch(console.error);
    }
    if (activeTab === 'rewards' && rewardsTable.length === 0) {
      getRewardsTableApi().then(setRewardsTable).catch(console.error);
    }
  }, [activeTab]);

  if (loading || !playerLevel) return null;

  const levelColor = getLevelColor(playerLevel.level);

  return (
    <div className="level">

      {/* Header */}
      <div className="level__header" style={{ '--level-color': levelColor } as React.CSSProperties}>
        <div className="level__header-left">
          <div className="level__badge" style={{ borderColor: levelColor, color: levelColor }}>
            {playerLevel.level >= 100 ? '👑' : playerLevel.level >= 75 ? '🌟' : playerLevel.level >= 50 ? '💎' : playerLevel.level >= 25 ? '⭐' : '🎮'}
          </div>
          <div>
            <p className="level__username">{user?.username}</p>
            <h1 className="level__level" style={{ color: levelColor }}>
              Niveau {playerLevel.level}
              {playerLevel.level >= 100 && <span className="level__max"> MAX</span>}
            </h1>
            <p className="level__total-xp">{playerLevel.totalXp.toLocaleString()} XP total</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="level__progress-wrapper">
          <div className="level__progress-labels">
            <span>Niveau {playerLevel.level}</span>
            {playerLevel.level < 100 && <span>Niveau {playerLevel.level + 1}</span>}
          </div>
          <div className="level__progress-bar">
            <div
              className="level__progress-fill"
              style={{ width: `${playerLevel.progressPercent}%`, background: levelColor }}
            />
          </div>
          <div className="level__progress-xp">
            {playerLevel.level >= 100 ? (
              <span style={{ color: levelColor }}>🏆 Niveau maximum atteint !</span>
            ) : (
              <>
                <span>{playerLevel.currentXp.toLocaleString()} XP</span>
                <span>{playerLevel.xpForNextLevel.toLocaleString()} XP requis</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prochaine récompense */}
      {playerLevel.nextReward && playerLevel.level < 100 && (
        <div className="level__next-reward">
          <span className="level__next-reward-label">🎁 Prochaine récompense — Niveau {playerLevel.level + 1}</span>
          <span className="level__next-reward-value">{playerLevel.nextReward.description}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="level__tabs">
        {[
          { key: 'progression', label: '📊 Progression' },
          { key: 'rewards',     label: '🎁 Récompenses' },
          { key: 'leaderboard', label: '🏆 Classement' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`level__tab ${activeTab === tab.key ? 'level__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key as Tab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Progression */}
      {activeTab === 'progression' && (
        <div className="level__section">
          <h2 className="level__section-title">Mes récompenses obtenues</h2>
          {playerLevel.rewards.length === 0 ? (
            <p className="level__empty">Jouez pour gagner des récompenses !</p>
          ) : (
            <div className="level__reward-list">
              {playerLevel.rewards.map((r) => (
                <div key={r.id} className={`level__reward-item ${r.isIngame && !r.ingameClaimed ? 'level__reward-item--pending' : ''}`}>
                  <div className="level__reward-item-left">
                    <span className="level__reward-item-level">Niv. {r.level}</span>
                    <span className="level__reward-item-value">{r.rewardValue}</span>
                  </div>
                  {r.isIngame && (
                    <span className={`level__reward-item-status ${r.ingameClaimed ? 'level__reward-item-status--claimed' : 'level__reward-item-status--pending'}`}>
                      {r.ingameClaimed ? '✅ Récupéré' : '⏳ À récupérer'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="level__xp-info">
            <h3>Comment gagner de l'XP ?</h3>
            <div className="level__xp-rules">
              <div className="level__xp-rule">
                <span>🎮 Participation</span>
                <strong>+50 XP</strong>
                <span>par partie jouée</span>
              </div>
              <div className="level__xp-rule">
                <span>💰 Mise</span>
                <strong>+1 XP</strong>
                <span>par 100 jetons misés</span>
              </div>
              <div className="level__xp-rule">
                <span>Exemple</span>
                <strong>+150 XP</strong>
                <span>pour une mise de 10 000 jetons</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table des récompenses */}
      {activeTab === 'rewards' && (
        <div className="level__section">
          <h2 className="level__section-title">Toutes les récompenses</h2>
          <div className="level__rewards-grid">
            {rewardsTable.map((r) => {
              const isPast = r.level <= playerLevel.level;
              const isCurrent = r.level === playerLevel.level + 1;
              const isIngame = !!r.ingame;
              const hasBadge = !!r.badge;

              return (
                <div
                  key={r.level}
                  className={`level__rewards-card ${isPast ? 'level__rewards-card--past' : ''} ${isCurrent ? 'level__rewards-card--current' : ''} ${isIngame ? 'level__rewards-card--ingame' : ''} ${hasBadge ? 'level__rewards-card--badge' : ''}`}
                >
                  <div className="level__rewards-card-level">
                    {isPast ? '✅' : isCurrent ? '⭐' : ''} Niv. {r.level}
                  </div>
                  <div className="level__rewards-card-value">{r.description}</div>
                  {isIngame && (
                    <div className="level__rewards-card-ingame">🎮 Lot in-game</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="level__section">
          <h2 className="level__section-title">🏆 Top 20 — Classement des niveaux</h2>
          <div className="level__leaderboard">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`level__leaderboard-row ${entry.username === user?.username ? 'level__leaderboard-row--me' : ''}`}
              >
                <span className="level__leaderboard-rank">
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </span>
                <span className="level__leaderboard-username">{entry.username}</span>
                <span className="level__leaderboard-level" style={{ color: getLevelColor(entry.level) }}>
                  Niveau {entry.level}
                </span>
                <span className="level__leaderboard-xp">{entry.totalXp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default LevelPage;
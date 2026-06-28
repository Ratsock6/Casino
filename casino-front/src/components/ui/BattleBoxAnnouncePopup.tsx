import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import type { BattleBoxAnnouncement } from '../../api/battle-box.api';
import '../../styles/components/bb-announce.scss';

const BattleBoxAnnouncePopup: React.FC = () => {
  const { connect, on, off } = useSocket();
  const navigate = useNavigate();
  const [announce, setAnnounce] = useState<BattleBoxAnnouncement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    connect();

    const handleAnnounce = (data: unknown) => {
      const a = data as BattleBoxAnnouncement;
      setAnnounce(a);
      setVisible(true);
      // Disparaît après 8 secondes
      setTimeout(() => setVisible(false), 8000);
    };

    on('battlebox:announcement', handleAnnounce);
    return () => off('battlebox:announcement');
  }, [connect, on, off]);

  if (!announce || !visible) return null;

  const boxSummary = Object.entries(announce.boxTypes)
    .map(([, count]) => count)
    .reduce((a, b) => a + b, 0);

  const handleJoin = () => {
    setVisible(false);
    navigate('/battle-box');
  };

  return (
    <div className={`bb-announce ${visible ? 'bb-announce--visible' : ''}`}>
      <div className="bb-announce__icon">⚔️</div>
      <div className="bb-announce__content">
        <p className="bb-announce__title">
          <strong>{announce.host}</strong> a ouvert une partie Battle Box !
        </p>
        <p className="bb-announce__details">
          {boxSummary} box · {announce.stakePerPlayer.toLocaleString()} 🪙/joueur · {announce.slotsLeft} place{announce.slotsLeft > 1 ? 's' : ''} libre{announce.slotsLeft > 1 ? 's' : ''}
        </p>
      </div>
      <div className="bb-announce__actions">
        <button className="bb-announce__btn bb-announce__btn--join" onClick={handleJoin}>
          Rejoindre
        </button>
        <button className="bb-announce__btn bb-announce__btn--close" onClick={() => setVisible(false)}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default BattleBoxAnnouncePopup;

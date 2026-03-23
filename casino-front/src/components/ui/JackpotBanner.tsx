import React, { useState, useEffect, useRef } from 'react';
import { getJackpotApi, type JackpotData } from '../../api/jackpot.api';
import '../../styles/components/jackpot-banner.scss';

const JackpotBanner = () => {
  const [jackpot, setJackpot] = useState<JackpotData | null>(null);
  const [prevAmount, setPrevAmount] = useState<number>(0);
  const [isRising, setIsRising] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJackpot = async () => {
    try {
      const data = await getJackpotApi();
      setJackpot((prev) => {
        if (prev && data.amount > prev.amount) {
          setPrevAmount(prev.amount);
          setIsRising(true);
          setTimeout(() => setIsRising(false), 1000);
        }
        return data;
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJackpot();
    // Rafraîchit toutes les 10 secondes
    intervalRef.current = setInterval(fetchJackpot, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!jackpot) return null;

  return (
    <div className={`jackpot-banner ${isRising ? 'jackpot-banner--rising' : ''}`}>
      <div className="jackpot-banner__left">
        <span className="jackpot-banner__icon">🎰</span>
        <div>
          <p className="jackpot-banner__label">JACKPOT PROGRESSIF</p>
          <p className="jackpot-banner__sublabel">Alimenté par tous les joueurs</p>
        </div>
      </div>
      <div className="jackpot-banner__amount">
        <span className={`jackpot-banner__value ${isRising ? 'jackpot-banner__value--rising' : ''}`}>
          {jackpot.amount.toLocaleString()}
        </span>
        <span className="jackpot-banner__currency">🪙</span>
      </div>
      {jackpot.lastWonAt && (
        <div className="jackpot-banner__last">
          Dernier gain : <strong>{jackpot.lastWonAmount.toLocaleString()} 🪙</strong>
          {' '}— {new Date(jackpot.lastWonAt).toLocaleDateString('fr-FR')}
        </div>
      )}
    </div>
  );
};

export default JackpotBanner;
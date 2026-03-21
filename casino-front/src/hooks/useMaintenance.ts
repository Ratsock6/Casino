import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios.instance';

export const useMaintenance = (gameKey: 'SLOTS' | 'ROULETTE' | 'BLACKJACK' | null = null) => {
  const [globalMaintenance, setGlobalMaintenance] = useState(false);
  const [gameMaintenance, setGameMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axiosInstance.get('/public/maintenance');
        setGlobalMaintenance(res.data.global);
        if (gameKey) {
          setGameMaintenance(res.data[gameKey] || false);
        }
      } catch {
        setGlobalMaintenance(false);
        setGameMaintenance(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [gameKey]);

  return {
    isMaintenance: globalMaintenance || gameMaintenance,
    globalMaintenance,
    gameMaintenance,
    loading,
  };
};
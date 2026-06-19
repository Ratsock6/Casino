import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios.instance';

type GameKey = 'SLOTS' | 'ROULETTE' | 'BLACKJACK' | 'BATTLE_BOX';

// Appelle la route authentifiée /maintenance/status qui renvoie l'état de
// maintenance + si l'utilisateur courant peut le contourner (admins).
export const useMaintenance = (gameKey: GameKey | null = null) => {
  const [globalMaintenance, setGlobalMaintenance] = useState(false);
  const [gameMaintenance, setGameMaintenance] = useState(false);
  const [canBypass, setCanBypass] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axiosInstance.get('/maintenance/status');
        setGlobalMaintenance(res.data.global);
        setCanBypass(!!res.data.canBypass);
        if (gameKey) {
          setGameMaintenance(res.data[gameKey] || false);
        }
      } catch {
        // En cas d'échec (ex: non connecté), on retombe sur la route publique.
        try {
          const pub = await axiosInstance.get('/public/maintenance');
          setGlobalMaintenance(pub.data.global);
          setCanBypass(false);
          if (gameKey) setGameMaintenance(pub.data[gameKey] || false);
        } catch {
          setGlobalMaintenance(false);
          setGameMaintenance(false);
          setCanBypass(false);
        }
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [gameKey]);

  const rawMaintenance = globalMaintenance || gameMaintenance;

  return {
    // isMaintenance = true uniquement si maintenance ET l'utilisateur ne peut pas contourner.
    // Les admins (canBypass) voient le site normalement -> isMaintenance = false pour eux.
    isMaintenance: rawMaintenance && !canBypass,
    // rawMaintenance = l'état réel, utile pour afficher le bandeau aux admins.
    rawMaintenance,
    globalMaintenance,
    gameMaintenance,
    canBypass,
    loading,
  };
};

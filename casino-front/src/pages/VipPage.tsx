import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../store/wallet.store';
import { getVipPricesApi, getVipStatusApi, buyVipApi } from '../api/vip.api';
import type { VipPrice, VipStatus } from '../api/vip.api';
import '../styles/pages/vip.scss';

const DURATION_ICONS: Record<string, string> = {
  '1_MONTH': '🌙',
  '3_MONTHS': '⭐',
  '6_MONTHS': '💫',
  'LIFETIME': '👑',
};

const VipPage = () => {
  const { balance, setBalance } = useWalletStore();
  const [prices, setPrices] = useState<VipPrice[]>([]);
  const [status, setStatus] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([
          getVipPricesApi(),
          getVipStatusApi(),
        ]);
        setPrices(p);
        setStatus(s);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleBuy = async (duration: string) => {
    if (buying) return;
    setError('');
    setSuccess('');
    setBuying(duration);

    try {
      const data = await buyVipApi(duration);
      setSuccess(data.message);
      setBalance(data.newBalance);
      const newStatus = await getVipStatusApi();
      setStatus(newStatus);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setBuying(null);
    }
  };

  const getDiscount = (price: VipPrice): number | null => {
    if (!price.originalPrice) return null;
    return Math.round((1 - price.price / price.originalPrice) * 100);
  };

  if (loading) return null;

  return (
    <div className="vip">

      {/* Header */}
      <div className="vip__header">
        <h1 className="vip__title">
          👑 Passer <span>VIP</span>
        </h1>
        <p className="vip__subtitle">
          Profitez de limites de mise étendues et d'avantages exclusifs
        </p>
        <p className="vip__balance">
          Votre solde : <strong>{balance.toLocaleString()} jetons</strong>
        </p>
      </div>

      {/* Statut VIP actuel */}
      {status?.isVip && status.subscription && (
        <div className="vip__current">
          <div className="vip__current-badge">👑 VIP Actif</div>
          <div className="vip__current-info">
            {status.subscription.isLifetime ? (
              <p>Votre abonnement VIP est <strong>à vie</strong> ✨</p>
            ) : (
              <p>
                Votre abonnement expire dans{' '}
                <strong>{status.subscription.daysLeft} jours</strong>
                {' '}({new Date(status.subscription.expiresAt!).toLocaleDateString('fr-FR')})
              </p>
            )}
          </div>
        </div>
      )}

      {/* Avantages */}
      <div className="vip__benefits">
        <h2 className="vip__benefits-title">Avantages VIP</h2>
        <div className="vip__benefits-grid">
          {[
            { icon: '🎰', title: 'Slots', desc: 'Mise max portée à 100 000 jetons' },
            { icon: '🎡', title: 'Roulette', desc: 'Mise max portée à 50 000 jetons' },
            { icon: '🃏', title: 'Blackjack', desc: 'Mise max portée à 50 000 jetons' },
            { icon: '👑', title: 'Badge VIP', desc: 'Badge exclusif visible sur votre profil' },
          ].map((b) => (
            <div key={b.title} className="vip__benefit">
              <span className="vip__benefit-icon">{b.icon}</span>
              <div>
                <p className="vip__benefit-title">{b.title}</p>
                <p className="vip__benefit-desc">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offres */}
      <div className="vip__offers">
        <h2 className="vip__offers-title">Choisissez votre offre</h2>
        <div className="vip__offers-grid">
          {prices.map((price) => {
            const discount = getDiscount(price);
            const isLifetime = price.duration === 'LIFETIME';
            const canAfford = balance >= price.price;

            return (
              <div
                key={price.duration}
                className={`vip__offer ${isLifetime ? 'vip__offer--featured' : ''} ${!canAfford ? 'vip__offer--disabled' : ''}`}
              >
                {isLifetime && <div className="vip__offer-badge">⭐ Meilleure offre</div>}
                {discount && <div className="vip__offer-discount">-{discount}%</div>}

                <div className="vip__offer-icon">{DURATION_ICONS[price.duration]}</div>
                <h3 className="vip__offer-label">{price.label}</h3>

                {price.originalPrice && (
                  <p className="vip__offer-original">
                    {price.originalPrice.toLocaleString()} 🪙
                  </p>
                )}

                <p className="vip__offer-price">
                  {price.price.toLocaleString()} <span>🪙</span>
                </p>

                <button
                  className="vip__offer-btn"
                  onClick={() => handleBuy(price.duration)}
                  disabled={!!buying || !canAfford || (status?.isVip && status?.subscription?.isLifetime)}
                >
                  {buying === price.duration
                    ? 'Achat en cours...'
                    : !canAfford
                      ? 'Solde insuffisant'
                      : status?.subscription?.isLifetime
                        ? 'Déjà à vie'
                        : status?.isVip
                          ? 'Prolonger'
                          : 'Activer'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="vip__error">{error}</p>}
      {success && <p className="vip__success">{success}</p>}

    </div>
  );
};

export default VipPage;
import { useState, useEffect } from 'react';
import { useWalletStore } from '../store/wallet.store';
import {
  getCurrentRaffleApi,
  getMyRaffleTicketsApi,
  buyRaffleTicketsApi,
  type RaffleCampaign,
  type MyTicketsResponse,
} from '../api/raffle.api';
import '../styles/pages/raffle.scss';

const prizeEmoji = (type: string) =>
  type === 'CHIPS' ? '🪙' : type === 'VIP' ? '👑' : '🎁';

function useCountdown(target: string | null) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!target) {
      setLeft('');
      return;
    }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setLeft('Imminent');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${d > 0 ? d + 'j ' : ''}${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

export default function RafflePage() {
  const { balance, setBalance } = useWalletStore();

  const [campaign, setCampaign] = useState<RaffleCampaign | null>(null);
  const [myTickets, setMyTickets] = useState<MyTicketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const countdown = useCountdown(campaign?.nextDrawAt ?? null);

  const load = async () => {
    try {
      const [c, t] = await Promise.all([
        getCurrentRaffleApi(),
        getMyRaffleTicketsApi().catch(() => null),
      ]);
      setCampaign(c);
      setMyTickets(t);
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (m: string, type: 'success' | 'error' = 'success') => {
    setMsg(m);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const ticketPrice = campaign ? parseInt(campaign.ticketPrice, 10) : 0;
  const totalCost = ticketPrice * quantity;
  const owned = myTickets?.totalOwned ?? 0;
  const maxPerUser = campaign?.maxTicketsPerUser ?? 0;
  const remaining = Math.max(0, maxPerUser - owned);
  const canAfford = balance >= totalCost;
  const withinCap = quantity <= remaining;

  const handleBuy = async () => {
    if (!campaign || buying) return;
    if (quantity < 1) return flash('Quantité invalide.', 'error');
    if (!withinCap) return flash(`Plafond atteint : ${remaining} ticket(s) max.`, 'error');
    if (!canAfford) return flash('Solde insuffisant.', 'error');

    setBuying(true);
    try {
      const key = crypto.randomUUID();
      const res = await buyRaffleTicketsApi(quantity, key);
      setBalance(parseFloat(res.balanceAfter));
      flash(`🎟️ ${res.quantity} ticket(s) acheté(s) ! Bonne chance !`);
      setQuantity(1);
      await load();
    } catch (e: any) {
      flash(e.response?.data?.message || 'Erreur lors de l\'achat.', 'error');
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return <div className="raffle"><div className="raffle__loading">Chargement…</div></div>;
  }

  // Aucune campagne ouverte
  if (!campaign) {
    return (
      <div className="raffle">
        <div className="raffle__empty">
          <span className="raffle__empty-icon">🎰</span>
          <h1>Aucune tombola en cours</h1>
          <p>Reviens bientôt : une nouvelle tombola sera bientôt lancée !</p>
        </div>
      </div>
    );
  }

  const activeTickets = myTickets?.tickets.filter((t) => t.status === 'ACTIVE') ?? [];
  const wonTickets = myTickets?.tickets.filter((t) => t.status === 'WON') ?? [];

  return (
    <div className="raffle">
      <header className="raffle__hero">
        <h1 className="raffle__title">🎰 {campaign.name}</h1>
        {campaign.description && <p className="raffle__desc">{campaign.description}</p>}

        <div className="raffle__stats">
          <div className="raffle__stat">
            <span className="raffle__stat-value">{ticketPrice.toLocaleString()} 🪙</span>
            <span className="raffle__stat-label">Prix du ticket</span>
          </div>
          <div className="raffle__stat">
            <span className="raffle__stat-value">{campaign.totalTicketsSold.toLocaleString()}</span>
            <span className="raffle__stat-label">Tickets vendus</span>
          </div>
          <div className="raffle__stat">
            <span className="raffle__stat-value">{owned} / {maxPerUser}</span>
            <span className="raffle__stat-label">Vos tickets</span>
          </div>
          {campaign.nextDrawAt && (
            <div className="raffle__stat raffle__stat--highlight">
              <span className="raffle__stat-value">{countdown}</span>
              <span className="raffle__stat-label">Prochain tirage</span>
            </div>
          )}
        </div>
      </header>

      {msg && <div className={`raffle__msg raffle__msg--${msgType}`}>{msg}</div>}

      {/* Achat */}
      <section className="raffle__buy">
        <h2>Acheter des tickets</h2>
        {remaining === 0 ? (
          <p className="raffle__cap-reached">Vous avez atteint le maximum de tickets pour cette tombola.</p>
        ) : (
          <div className="raffle__buy-controls">
            <div className="raffle__qty">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={buying}>−</button>
              <input
                type="number"
                min={1}
                max={remaining}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(remaining, parseInt(e.target.value, 10) || 1)))}
                disabled={buying}
              />
              <button onClick={() => setQuantity((q) => Math.min(remaining, q + 1))} disabled={buying}>+</button>
            </div>
            <div className="raffle__buy-summary">
              <span>Total : <strong>{totalCost.toLocaleString()} 🪙</strong></span>
              <span className="raffle__buy-remaining">{remaining} ticket(s) restant(s)</span>
            </div>
            <button
              className="raffle__buy-btn"
              onClick={handleBuy}
              disabled={buying || !canAfford || !withinCap}
            >
              {buying ? 'Achat…' : !canAfford ? 'Solde insuffisant' : `Acheter ${quantity} ticket(s)`}
            </button>
          </div>
        )}
      </section>

      {/* Tirages et lots */}
      <section className="raffle__draws">
        <h2>Tirages & lots</h2>
        <div className="raffle__draws-grid">
          {campaign.draws.map((d) => (
            <div key={d.id} className={`raffle__draw ${d.status === 'DONE' ? 'raffle__draw--done' : ''}`}>
              <div className="raffle__draw-head">
                <span className="raffle__draw-label">{d.label || 'Tirage'}</span>
                <span className="raffle__draw-status">
                  {d.status === 'DONE' ? '✅ Effectué' : new Date(d.scheduledAt).toLocaleDateString()}
                </span>
              </div>
              <ul className="raffle__prize-list">
                {d.prizes.map((p) => (
                  <li key={p.id}>
                    <span>{prizeEmoji(p.type)} {p.label}</span>
                    {p.quantity > 1 && <span className="raffle__prize-qty">×{p.quantity}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Mes tickets gagnants */}
      {wonTickets.length > 0 && (
        <section className="raffle__won">
          <h2>🎉 Vos tickets gagnants</h2>
          {wonTickets.map((t) => (
            <div key={t.id} className="raffle__won-card">
              <div>
                <strong>Ticket #{t.ticketNumber}</strong> — {prizeEmoji(t.wonPrize?.type || '')} {t.wonPrize?.label}
              </div>
              <div className="raffle__won-claim">
                {t.claimStatus === 'UNCLAIMED' && (
                  <span className="raffle__claim raffle__claim--pending">
                    À réclamer sur Discord
                    {t.claimDeadline && ` avant le ${new Date(t.claimDeadline).toLocaleString()}`}
                  </span>
                )}
                {t.claimStatus === 'CLAIMED' && <span className="raffle__claim raffle__claim--ok">✅ Lot remis</span>}
                {t.claimStatus === 'EXPIRED' && <span className="raffle__claim raffle__claim--expired">⏰ Délai expiré</span>}
              </div>
            </div>
          ))}
          <p className="raffle__won-hint">
            Pour récupérer un lot, ouvre un ticket « Réclamation tombola » sur le Discord avant la fin du délai.
          </p>
        </section>
      )}

      {/* Mes tickets actifs */}
      <section className="raffle__mine">
        <h2>Vos tickets en lice ({activeTickets.length})</h2>
        {activeTickets.length === 0 ? (
          <p className="raffle__mine-empty">Vous n'avez pas encore de ticket en lice. Achetez-en pour participer aux tirages !</p>
        ) : (
          <div className="raffle__ticket-numbers">
            {activeTickets.map((t) => (
              <span key={t.id} className="raffle__ticket-chip">#{t.ticketNumber}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

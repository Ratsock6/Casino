import { useState, useEffect } from 'react';
import {
  getRaffleCampaignsApi,
  createRaffleCampaignApi,
  openRaffleCampaignApi,
  endRaffleCampaignApi,
  deleteRaffleCampaignApi,
  executeRaffleDrawApi,
  getRaffleWinnersApi,
  markRaffleClaimedApi,
  type AdminRaffleCampaign,
  type AdminRaffleWinner,
} from '../../api/admin.api';

type PrizeForm = { type: 'CHIPS' | 'VIP' | 'CUSTOM'; label: string; value: string; quantity: number };
type DrawForm = { label: string; scheduledAt: string; prizes: PrizeForm[] };

const emptyPrize = (): PrizeForm => ({ type: 'CHIPS', label: '', value: '', quantity: 1 });
const emptyDraw = (): DrawForm => ({ label: '', scheduledAt: '', prizes: [emptyPrize()] });

export default function RaffleAdminTab() {
  const [campaigns, setCampaigns] = useState<AdminRaffleCampaign[]>([]);
  const [winners, setWinners] = useState<AdminRaffleWinner[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Formulaire de création
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ticketPrice, setTicketPrice] = useState('1000');
  const [maxTickets, setMaxTickets] = useState('50');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [draws, setDraws] = useState<DrawForm[]>([emptyDraw()]);

  const load = async () => {
    setLoading(true);
    try {
      const [c, w] = await Promise.all([getRaffleCampaignsApi(), getRaffleWinnersApi()]);
      setCampaigns(c);
      setWinners(w);
    } catch (e: any) {
      setMsg(`❌ ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 4000);
  };

  // ── Actions campagne ────────────────────────────────────────────────────────
  const handleOpen = async (id: string) => {
    try {
      await openRaffleCampaignApi(id);
      flash('✅ Campagne ouverte.');
      load();
    } catch (e: any) {
      flash(`❌ ${e.response?.data?.message || e.message}`);
    }
  };

  const handleEnd = async (id: string) => {
    if (!confirm('Terminer cette campagne ? Les achats seront fermés.')) return;
    try {
      await endRaffleCampaignApi(id);
      flash('✅ Campagne terminée.');
      load();
    } catch (e: any) {
      flash(`❌ ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce brouillon de campagne ?')) return;
    try {
      await deleteRaffleCampaignApi(id);
      flash('✅ Brouillon supprimé.');
      load();
    } catch (e: any) {
      flash(`❌ ${e.response?.data?.message || e.message}`);
    }
  };

  const handleExecuteDraw = async (drawId: string) => {
    if (!confirm('Lancer ce tirage maintenant ? Action irréversible.')) return;
    try {
      const res = await executeRaffleDrawApi(drawId);
      flash(`✅ Tirage effectué : ${res.awarded}/${res.totalPrizeSlots} lot(s) attribué(s).`);
      load();
    } catch (e: any) {
      flash(`❌ ${e.response?.data?.message || e.message}`);
    }
  };

  const handleClaim = async (ticketId: string) => {
    try {
      await markRaffleClaimedApi(ticketId);
      flash('✅ Lot marqué comme remis.');
      load();
    } catch (e: any) {
      flash(`❌ ${e.response?.data?.message || e.message}`);
    }
  };

  // ── Formulaire dynamique ──────────────────────────────────────────────────────
  const addDraw = () => setDraws([...draws, emptyDraw()]);
  const removeDraw = (i: number) => setDraws(draws.filter((_, idx) => idx !== i));
  const updateDraw = (i: number, patch: Partial<DrawForm>) =>
    setDraws(draws.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const addPrize = (di: number) =>
    setDraws(draws.map((d, idx) => (idx === di ? { ...d, prizes: [...d.prizes, emptyPrize()] } : d)));
  const removePrize = (di: number, pi: number) =>
    setDraws(draws.map((d, idx) => (idx === di ? { ...d, prizes: d.prizes.filter((_, p) => p !== pi) } : d)));
  const updatePrize = (di: number, pi: number, patch: Partial<PrizeForm>) =>
    setDraws(
      draws.map((d, idx) =>
        idx === di ? { ...d, prizes: d.prizes.map((p, p2) => (p2 === pi ? { ...p, ...patch } : p)) } : d,
      ),
    );

  const resetForm = () => {
    setName('');
    setDescription('');
    setTicketPrice('1000');
    setMaxTickets('50');
    setStartsAt('');
    setEndsAt('');
    setDraws([emptyDraw()]);
  };

  const handleCreate = async () => {
    if (!name || !startsAt || !endsAt) {
      flash('❌ Nom, date de début et date de fin sont requis.');
      return;
    }
    try {
      await createRaffleCampaignApi({
        name,
        description: description || undefined,
        ticketPrice: parseInt(ticketPrice, 10),
        maxTicketsPerUser: parseInt(maxTickets, 10),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        draws: draws.map((d) => ({
          label: d.label || undefined,
          scheduledAt: new Date(d.scheduledAt).toISOString(),
          prizes: d.prizes.map((p) => ({
            type: p.type,
            label: p.label,
            value: p.value || undefined,
            quantity: p.quantity,
          })),
        })),
      });
      flash('✅ Campagne créée (en brouillon).');
      resetForm();
      setShowForm(false);
      load();
    } catch (e: any) {
      flash(`❌ ${e.response?.data?.message || e.message}`);
    }
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { DRAFT: '#888', OPEN: '#4caf7d', ENDED: '#e05c5c' };
    return (
      <span style={{ color: colors[s] || '#888', fontWeight: 600 }}>
        {s === 'DRAFT' ? 'Brouillon' : s === 'OPEN' ? 'Ouverte' : 'Terminée'}
      </span>
    );
  };

  const claimBadge = (s: string | null) => {
    if (!s) return '—';
    const map: Record<string, [string, string]> = {
      UNCLAIMED: ['#e0a85c', 'En attente'],
      CLAIMED: ['#4caf7d', 'Remis'],
      EXPIRED: ['#e05c5c', 'Expiré'],
    };
    const [color, label] = map[s] || ['#888', s];
    return <span style={{ color, fontWeight: 600 }}>{label}</span>;
  };

  return (
    <div className="admin__raffle">
      {msg && <div className="admin__action-msg">{msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>🎰 Tombola</h2>
        <button className="admin__btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Annuler' : '➕ Nouvelle campagne'}
        </button>
      </div>

      {/* ── Formulaire de création ── */}
      {showForm && (
        <div className="admin__card" style={{ marginBottom: 24, padding: 16 }}>
          <h3>Créer une campagne</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <label>
              Nom
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tombola de lancement" />
            </label>
            <label>
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(optionnel)" />
            </label>
            <label>
              Prix du ticket (jetons)
              <input type="number" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} />
            </label>
            <label>
              Max tickets / joueur
              <input type="number" value={maxTickets} onChange={(e) => setMaxTickets(e.target.value)} />
            </label>
            <label>
              Début
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label>
              Fin
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
          </div>

          {/* Tirages */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Tirages ({draws.length})</h4>
              <button className="admin__btn admin__btn--small" onClick={addDraw}>➕ Ajouter un tirage</button>
            </div>

            {draws.map((d, di) => (
              <div key={di} className="admin__card" style={{ padding: 12, marginTop: 12, background: '#1a1a1a' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <label style={{ flex: 1 }}>
                    Libellé
                    <input value={d.label} onChange={(e) => updateDraw(di, { label: e.target.value })} placeholder={`Tirage #${di + 1}`} />
                  </label>
                  <label style={{ flex: 1 }}>
                    Date du tirage
                    <input type="datetime-local" value={d.scheduledAt} onChange={(e) => updateDraw(di, { scheduledAt: e.target.value })} />
                  </label>
                  {draws.length > 1 && (
                    <button className="admin__btn admin__btn--danger admin__btn--small" onClick={() => removeDraw(di)}>🗑️</button>
                  )}
                </div>

                {/* Lots du tirage */}
                <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid #2e2e2e' }}>
                  {d.prizes.map((p, pi) => (
                    <div key={pi} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
                      <label>
                        Type
                        <select value={p.type} onChange={(e) => updatePrize(di, pi, { type: e.target.value as PrizeForm['type'] })}>
                          <option value="CHIPS">Jetons</option>
                          <option value="VIP">VIP</option>
                          <option value="CUSTOM">Objet RP</option>
                        </select>
                      </label>
                      <label style={{ flex: 1 }}>
                        Libellé
                        <input value={p.label} onChange={(e) => updatePrize(di, pi, { label: e.target.value })} placeholder="1 000 000 jetons" />
                      </label>
                      <label>
                        Valeur
                        <input value={p.value} onChange={(e) => updatePrize(di, pi, { value: e.target.value })} placeholder="montant / 1_MONTH" />
                      </label>
                      <label style={{ width: 70 }}>
                        Nb gagnants
                        <input type="number" min={1} value={p.quantity} onChange={(e) => updatePrize(di, pi, { quantity: parseInt(e.target.value, 10) || 1 })} />
                      </label>
                      {d.prizes.length > 1 && (
                        <button className="admin__btn admin__btn--danger admin__btn--small" onClick={() => removePrize(di, pi)}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className="admin__btn admin__btn--small" style={{ marginTop: 8 }} onClick={() => addPrize(di)}>➕ Ajouter un lot</button>
                </div>
              </div>
            ))}
          </div>

          <button className="admin__btn" style={{ marginTop: 16 }} onClick={handleCreate}>
            ✅ Créer la campagne
          </button>
        </div>
      )}

      {loading && <div className="admin__loading">Chargement...</div>}

      {/* ── Liste des campagnes ── */}
      <div className="admin__table-wrapper">
        <table className="admin__table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Statut</th>
              <th>Prix</th>
              <th>Max/joueur</th>
              <th>Tickets vendus</th>
              <th>Tirages</th>
              <th>Période</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{statusBadge(c.status)}</td>
                <td>{parseInt(c.ticketPrice, 10).toLocaleString()} 🪙</td>
                <td>{c.maxTicketsPerUser}</td>
                <td>{c.totalTicketsSold ?? 0}</td>
                <td>{c.draws.length}</td>
                <td className="admin__table-date">
                  {new Date(c.startsAt).toLocaleDateString()} → {new Date(c.endsAt).toLocaleDateString()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.status === 'DRAFT' && (
                      <>
                        <button className="admin__btn admin__btn--small" onClick={() => handleOpen(c.id)}>Ouvrir</button>
                        <button className="admin__btn admin__btn--danger admin__btn--small" onClick={() => handleDelete(c.id)}>Suppr.</button>
                      </>
                    )}
                    {c.status === 'OPEN' && (
                      <button className="admin__btn admin__btn--danger admin__btn--small" onClick={() => handleEnd(c.id)}>Terminer</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && !loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>Aucune campagne</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Détail des tirages par campagne (pour lancer un tirage) ── */}
      {campaigns.map((c) => (
        <div key={c.id} style={{ marginTop: 16 }}>
          <h4 style={{ color: '#c9a84c' }}>{c.name} — tirages</h4>
          <div className="admin__table-wrapper">
            <table className="admin__table">
              <thead>
                <tr><th>Tirage</th><th>Date prévue</th><th>Statut</th><th>Lots</th><th>Action</th></tr>
              </thead>
              <tbody>
                {c.draws.map((d) => (
                  <tr key={d.id}>
                    <td>{d.label || '—'}</td>
                    <td className="admin__table-date">{new Date(d.scheduledAt).toLocaleString()}</td>
                    <td>{d.status === 'DONE' ? '✅ Effectué' : '⏳ En attente'}</td>
                    <td className="admin__table-muted">
                      {d.prizes.map((p) => `${p.quantity}× ${p.label}`).join(', ')}
                    </td>
                    <td>
                      {d.status !== 'DONE' && c.status !== 'DRAFT' && (
                        <button className="admin__btn admin__btn--small" onClick={() => handleExecuteDraw(d.id!)}>🎲 Tirer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* ── Gagnants ── */}
      <h3 style={{ marginTop: 24 }}>🏆 Gagnants</h3>
      <div className="admin__table-wrapper">
        <table className="admin__table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Gagnant</th>
              <th>Discord</th>
              <th>Lot</th>
              <th>Tirage</th>
              <th>Réclamation</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {winners.map((w) => (
              <tr key={w.ticketId}>
                <td>#{w.ticketNumber}</td>
                <td className="admin__table-username">{w.winner.username}</td>
                <td className="admin__table-muted">{w.winner.discordUsername || w.winner.discordId || '—'}</td>
                <td>{w.prize?.label || '—'}</td>
                <td className="admin__table-muted">{w.draw?.label || '—'}</td>
                <td>{claimBadge(w.claimStatus)}</td>
                <td>
                  {w.claimStatus === 'UNCLAIMED' && (
                    <button className="admin__btn admin__btn--small" onClick={() => handleClaim(w.ticketId)}>Marquer remis</button>
                  )}
                </td>
              </tr>
            ))}
            {winners.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>Aucun gagnant pour l'instant</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

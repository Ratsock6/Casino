import React, { useState, useEffect, useRef } from 'react';
import { useWalletStore } from '../../store/wallet.store';
import { spinSlotsApi } from '../../api/slots.api';
import type { SlotSpinResponse, CascadeStep, SlotMachineInfo } from '../../api/slots.api';

interface Props {
  machine: SlotMachineInfo;
  onBack: () => void;
}

interface CascadeResult {
  isWin: boolean;
  payout: number;
  bet: number;
  cascades: number;
}

const BET_PRESETS = [100, 500, 1000, 5000];
const SPIN_COUNTS = [1, 5, 10, 25];
const EMPTY_GRID = Array(9).fill('✨');

const CascadeSlotMachine: React.FC<Props> = ({ machine, onBack }) => {
  const { balance, setBalance } = useWalletStore();
  const [bet, setBet] = useState<number>(100);
  const [spinCount, setSpinCount] = useState<number>(1);
  const [currentSpinIndex, setCurrentSpinIndex] = useState<number>(0);

  const [grid, setGrid] = useState<string[]>(EMPTY_GRID);
  const [highlight, setHighlight] = useState<number[]>([]);
  const [exploding, setExploding] = useState<number[]>([]);
  const [dropping, setDropping] = useState<number[]>([]);
  const [cascadeBadge, setCascadeBadge] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [history, setHistory] = useState<CascadeResult[]>([]);

  const skipRef = useRef(false);
  const cancelRef = useRef(false);
  useEffect(() => () => { cancelRef.current = true; }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const animateCascade = async (steps: CascadeStep[]): Promise<number> => {
    let runningTotal = 0;
    let cascadeCount = 0;

    for (let s = 0; s < steps.length; s++) {
      if (cancelRef.current) return cascadeCount;
      const step = steps[s];

      setGrid(step.grid.map((c) => c.display));
      setExploding([]);
      if (step.cascadeLevel > 0) {
        setDropping(Array.from({ length: 9 }, (_, i) => i));
        await sleep(skipRef.current ? 60 : 280);
        setDropping([]);
      }
      await sleep(skipRef.current ? 40 : 200);
      if (cancelRef.current) return cascadeCount;

      if (step.winningPositions.length > 0) {
        cascadeCount++;
        setHighlight(step.winningPositions);
        const stepWin = step.winningLines.reduce((sum, l) => sum + l.amount, 0);
        runningTotal += stepWin;
        setLastPayout(runningTotal);
        if (step.cascadeMultiplier > 1) {
          setCascadeBadge(step.cascadeMultiplier);
        }
        setStatusMsg(
          step.cascadeLevel > 0
            ? `⚡ Cascade ×${step.cascadeMultiplier} ! +${stepWin.toLocaleString()} 🪙`
            : `+${stepWin.toLocaleString()} 🪙`,
        );
        await sleep(skipRef.current ? 80 : 550);
        if (cancelRef.current) return cascadeCount;
        setExploding(step.winningPositions);
        setHighlight([]);
        await sleep(skipRef.current ? 60 : 320);
        setCascadeBadge(null);
      } else {
        setHighlight([]);
        setExploding([]);
      }
    }
    setExploding([]);
    setHighlight([]);
    setCascadeBadge(null);
    return cascadeCount;
  };

  const runSpin = async (currentBalance: number): Promise<number> => {
    setLastPayout(null);
    setStatusMsg('');
    setHighlight([]);
    setExploding([]);

    const shuffle = setInterval(() => {
      if (skipRef.current) return;
      setGrid(Array.from({ length: 9 }, () =>
        machine.symbols[Math.floor(Math.random() * machine.symbols.length)].display,
      ));
    }, 70);
    await sleep(skipRef.current ? 100 : 450);
    clearInterval(shuffle);

    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const data: SlotSpinResponse = await spinSlotsApi(bet, key, machine.id);

    setBalance(Number(data.balanceAfterBet));

    const steps: CascadeStep[] = data.display?.steps ?? [];
    const cascades = await animateCascade(steps);

    setBalance(Number(data.balanceAfterSettlement));
    setLastPayout(data.payout > 0 ? data.payout : 0);
    setStatusMsg(
      data.payout > 0
        ? `🎉 Gain : ${data.payout.toLocaleString()} 🪙${cascades > 1 ? ` (${cascades} cascades)` : ''}`
        : 'Pas de gain',
    );

    setHistory((prev) => [
      { isWin: data.payout > 0, payout: data.payout, bet, cascades },
      ...prev.slice(0, 9),
    ]);

    return Number(data.balanceAfterSettlement);
  };

  const handleSpin = async () => {
    if (loading) return;
    const sanitizedBet = Math.floor(bet);
    if (!sanitizedBet || sanitizedBet <= 0) return setError('La mise doit être supérieure à 0.');
    if (sanitizedBet * spinCount > balance) return setError('Solde insuffisant pour tous les spins.');

    setError('');
    setLoading(true);
    skipRef.current = false;
    setHistory([]);

    let currentBalance = balance;
    for (let i = 0; i < spinCount; i++) {
      if (cancelRef.current) break;
      setCurrentSpinIndex(i + 1);
      try {
        currentBalance = await runSpin(currentBalance);
        if (currentBalance < sanitizedBet && i < spinCount - 1) {
          setStatusMsg('Solde épuisé, arrêt des spins.');
          break;
        }
        if (i < spinCount - 1 && !skipRef.current) {
          await sleep(900);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Erreur lors du spin.');
        break;
      }
    }
    setLoading(false);
    setCurrentSpinIndex(0);
  };

  const totalWin = history.filter((s) => s.isWin).reduce((a, s) => a + s.payout, 0);
  const totalBet = history.reduce((a, s) => a + s.bet, 0);

  return (
    <div className="cascade-machine">
      <div className="cascade-machine__header">
        <button className="cascade-machine__back" onClick={onBack}>← Machines</button>
        <h1 className="cascade-machine__title">{machine.name}</h1>
        <span className="cascade-machine__header-spacer" />
      </div>

      <p className="cascade-machine__balance">
        Solde : <strong>{balance.toLocaleString()} jetons</strong>
      </p>

      <div className="cascade-machine__grid-wrap">
        {cascadeBadge && (
          <div className="cascade-machine__badge">×{cascadeBadge}</div>
        )}
        <div className="cascade-machine__grid">
          {grid.map((symbol, i) => (
            <div
              key={i}
              className={[
                'cascade-machine__cell',
                highlight.includes(i) ? 'cascade-machine__cell--win' : '',
                exploding.includes(i) ? 'cascade-machine__cell--explode' : '',
                dropping.includes(i) ? 'cascade-machine__cell--drop' : '',
              ].join(' ')}
            >
              <span>{symbol}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cascade-machine__status">
        {loading && spinCount > 1 && (
          <p className="cascade-machine__counter">Spin <strong>{currentSpinIndex}</strong> / {spinCount}</p>
        )}
        {statusMsg && (
          <p className={`cascade-machine__info ${lastPayout && lastPayout > 0 ? 'cascade-machine__info--win' : ''}`}>
            {statusMsg}
          </p>
        )}
        {error && <p className="cascade-machine__error">{error}</p>}
      </div>

      <div className="cascade-machine__controls">
        <div className="cascade-machine__field">
          <label>Mise par spin</label>
          <input
            type="number"
            min={1}
            value={bet}
            disabled={loading}
            onChange={(e) => setBet(Number(e.target.value))}
            className="cascade-machine__bet-input"
          />
          <div className="cascade-machine__presets">
            {BET_PRESETS.map((p) => (
              <button
                key={p}
                className={bet === p ? 'active' : ''}
                disabled={loading}
                onClick={() => setBet(p)}
              >
                {p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="cascade-machine__field">
          <label>Nombre de spins</label>
          <div className="cascade-machine__presets">
            {SPIN_COUNTS.map((c) => (
              <button
                key={c}
                className={spinCount === c ? 'active' : ''}
                disabled={loading}
                onClick={() => setSpinCount(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {spinCount > 1 && (
            <p className="cascade-machine__total-bet">
              Mise totale : <strong>{(Math.floor(bet) * spinCount).toLocaleString()} 🪙</strong>
            </p>
          )}
        </div>
      </div>

      <div className="cascade-machine__actions">
        <button className="cascade-machine__spin" onClick={handleSpin} disabled={loading}>
          {loading ? '🎰 ...' : spinCount > 1 ? `Lancer ${spinCount} spins` : 'SPIN'}
        </button>
        {loading && spinCount > 1 && !skipRef.current && (
          <button className="cascade-machine__skip" onClick={() => { skipRef.current = true; }}>
            ⏩ Passer les animations
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="cascade-machine__history">
          <div className="cascade-machine__history-summary">
            <span>Spins : <strong>{history.length}</strong></span>
            <span>Misé : <strong>{totalBet.toLocaleString()} 🪙</strong></span>
            <span className={totalWin - totalBet >= 0 ? 'pos' : 'neg'}>
              Net : <strong>{totalWin - totalBet >= 0 ? '+' : ''}{(totalWin - totalBet).toLocaleString()} 🪙</strong>
            </span>
          </div>
          <div className="cascade-machine__history-list">
            {history.map((h, i) => (
              <div
                key={i}
                className={`cascade-machine__history-item ${h.isWin ? 'win' : 'loss'}`}
                title={h.cascades > 1 ? `${h.cascades} cascades` : ''}
              >
                {h.isWin ? `+${h.payout.toLocaleString()}` : `−${h.bet.toLocaleString()}`}
                {h.cascades > 1 && <span className="cascade-machine__history-chain">⚡{h.cascades}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cascade-machine__paytable">
        <h3>Table des gains (×mise)</h3>
        <div className="cascade-machine__paytable-grid">
          {machine.symbols.map((s) => (
            <div key={s.id} className="cascade-machine__paytable-item">
              <span className="cascade-machine__paytable-symbol">{s.display}</span>
              <span className="cascade-machine__paytable-mult">×{s.payoutMultiplier}</span>
            </div>
          ))}
        </div>
        <p className="cascade-machine__paytable-note">
          Alignez 3 symboles identiques (lignes horizontales ou diagonales). Les gains explosent et de nouvelles gemmes tombent : chaque cascade augmente le multiplicateur ! 🌟 remplace n'importe quel symbole.
        </p>
      </div>
    </div>
  );
};

export default CascadeSlotMachine;

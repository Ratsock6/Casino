import React, { useState, useRef } from 'react';
import { useWalletStore } from '../store/wallet.store';
import { spinSlotsApi } from '../api/slots.api';
import type { SlotSpinResponse } from '../api/slots.api';
import { SYMBOL_DISPLAY } from '../utils/slots.utils';
import '../styles/pages/slots.scss';

const SYMBOLS_LIST = ['🍒', '🍋', '🎰', '7️⃣', '💎'];

const RULES = [
  { symbol: 'CHERRY', emoji: '🍒', label: 'Cerise', multiplier: 2, color: '#e05c5c' },
  { symbol: 'LEMON', emoji: '🍋', label: 'Citron', multiplier: 3, color: '#e0c85c' },
  { symbol: 'BAR', emoji: '🎰', label: 'Bar', multiplier: 5, color: '#c9a84c' },
  { symbol: 'SEVEN', emoji: '7️⃣', label: 'Seven', multiplier: 10, color: '#4caf7d' },
  { symbol: 'DIAMOND', emoji: '💎', label: 'Diamond', multiplier: 20, color: '#5cc8e0' },
];

interface SpinResult {
  reels: string[];
  isWin: boolean;
  payout: number;
  multiplier: number;
  winningSymbol: string;
  bet: number;
}

const SlotsPage = () => {
  const { balance, setBalance } = useWalletStore();

  const [bet, setBet] = useState<number>(100);
  const [spinCount, setSpinCount] = useState<number>(1);
  const [reels, setReels] = useState<string[]>(['❓', '❓', '❓']);
  const [spinning, setSpinning] = useState<boolean[]>([false, false, false]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const [winSymbol, setWinSymbol] = useState<string | null>(null);
  const [currentPayout, setCurrentPayout] = useState<number | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState<number | null>(null);
  const [spinHistory, setSpinHistory] = useState<SpinResult[]>([]);
  const [skipped, setSkipped] = useState(false);
  const skipRef = useRef(false);

  // Anime un rouleau avec défilement de symboles
  const animateReel = (reelIndex: number, finalSymbol: string, delay: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      setSpinning((prev) => {
        const next = [...prev];
        next[reelIndex] = true;
        return next;
      });

      const intervalMs = 80;
      let elapsed = 0;

      const interval = setInterval(() => {
        if (skipRef.current) {
          clearInterval(interval);
          setReels((prev) => {
            const next = [...prev];
            next[reelIndex] = SYMBOL_DISPLAY[finalSymbol]?.emoji || finalSymbol;
            return next;
          });
          setSpinning((prev) => {
            const next = [...prev];
            next[reelIndex] = false;
            return next;
          });
          resolve();
          return;
        }

        setReels((prev) => {
          const next = [...prev];
          next[reelIndex] = SYMBOLS_LIST[Math.floor(Math.random() * SYMBOLS_LIST.length)];
          return next;
        });

        elapsed += intervalMs;
        if (elapsed >= duration) {
          clearInterval(interval);
          setReels((prev) => {
            const next = [...prev];
            next[reelIndex] = SYMBOL_DISPLAY[finalSymbol]?.emoji || finalSymbol;
            return next;
          });
          setSpinning((prev) => {
            const next = [...prev];
            next[reelIndex] = false;
            return next;
          });
          resolve();
        }
      }, intervalMs);
    });
  };

  const runSpin = async (currentBalance: number): Promise<number> => {
    skipRef.current = false;
    setSkipped(false);
    setResult(null);
    setWinSymbol(null);
    setCurrentPayout(null);
    setCurrentMultiplier(null);
    setReels(['🔄', '🔄', '🔄']);


    const idempotencyKey = crypto.randomUUID();
    const data: SlotSpinResponse = await spinSlotsApi(bet, idempotencyKey);

    // Lance les 3 rouleaux en décalé
    await Promise.all([
      animateReel(0, data.reels[0], 0, 2000),
      animateReel(1, data.reels[1], 200, 2300),
      animateReel(2, data.reels[2], 400, 2600),
    ]);

    setCurrentPayout(data.payout);
    setCurrentMultiplier(data.multiplier);
    setWinSymbol(data.winningSymbol);
    setResult(data.isWin ? 'win' : 'loss');

    const newBalance = parseFloat(data.balanceAfterBet) + data.payout;
    setBalance(newBalance);

    setSpinHistory((prev) => [
      {
        reels: data.reels,
        isWin: data.isWin,
        payout: data.payout,
        multiplier: data.multiplier,
        winningSymbol: data.winningSymbol,
        bet,
      },
      ...prev.slice(0, 9),
    ]);

    return newBalance;
  };

  const [currentSpinIndex, setCurrentSpinIndex] = useState<number>(0);

  const handleSpin = async () => {
    if (loading) return;
    if (bet <= 0) return setError('La mise doit être supérieure à 0.');
    if (bet * spinCount > balance) return setError('Solde insuffisant pour tous les spins.');

    setError('');
    setLoading(true);
    setSpinHistory([]);

    let currentBalance = balance;

    for (let i = 0; i < spinCount; i++) {
      setCurrentSpinIndex(i + 1);
      try {
        currentBalance = await runSpin(currentBalance);
        if (i < spinCount - 1 && !skipRef.current) {
          // Pause visible entre chaque spin pour voir le résultat
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Une erreur est survenue.');
        setReels(['❓', '❓', '❓']);
        break;
      }
    }

    setLoading(false);
  };

  const handleSkip = () => {
    skipRef.current = true;
    setSkipped(true);
  };

  const totalWin = spinHistory.filter((s) => s.isWin).reduce((acc, s) => acc + s.payout, 0);
  const totalLoss = spinHistory.filter((s) => !s.isWin).reduce((acc, s) => acc + s.bet, 0);

  return (
    <div className="slots">

      <div className="slots__header">
        <h1 className="slots__title">Machines à Sous</h1>
        <p className="slots__balance">
          Solde : <strong>{balance.toLocaleString()} jetons</strong>
        </p>
      </div>

      <div className="slots__machine">
        <div className="slots__reels">
          {reels.map((symbol, index) => (
            <div
              key={index}
              className={`slots__reel ${spinning[index] ? 'slots__reel--spinning' : ''} ${result === 'win' && !spinning[index] ? 'slots__reel--win' : ''}`}
              style={{
                borderColor: result === 'win' && winSymbol && !spinning[index]
                  ? SYMBOL_DISPLAY[winSymbol]?.color
                  : undefined,
              }}
            >
              {symbol}
            </div>
          ))}
        </div>

        {result && !loading && (
          <div className={`slots__result slots__result--${result}`}>
            {result === 'win'
              ? `✨ Gagné ! +${currentPayout?.toLocaleString()} jetons (x${currentMultiplier})`
              : `💸 Perdu ! -${bet.toLocaleString()} jetons`}
          </div>
        )}

        {loading && (
          <div className="slots__live">
            {spinCount > 1 && (
              <p className="slots__live-counter">
                Spin <strong>{currentSpinIndex}</strong> / {spinCount}
              </p>
            )}
            {result && (
              <div className={`slots__live-result slots__live-result--${result}`}>
                {result === 'win'
                  ? `✨ +${currentPayout?.toLocaleString()} jetons (x${currentMultiplier})`
                  : `💸 -${bet.toLocaleString()} jetons`}
              </div>
            )}
            <button className="slots__skip-btn" onClick={handleSkip}>
              ⏭ Passer l'animation
            </button>
          </div>
        )}
      </div>

      <div className="slots__controls">
        <div className="slots__bet">
          <label>Mise par spin</label>
          <div className="slots__bet-inputs">
            <button onClick={() => setBet(Math.max(10, bet - 100))}>−</button>
            <input
              type="number"
              value={bet}
              min={10}
              onChange={(e) => setBet(Number(e.target.value))}
            />
            <button onClick={() => setBet(bet + 100)}>+</button>
          </div>
          <div className="slots__bet-presets">
            {[100, 500, 1000, 5000].map((preset) => (
              <button
                key={preset}
                className={bet === preset ? 'active' : ''}
                onClick={() => setBet(preset)}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="slots__spincount">
          <label>Nombre de spins</label>
          <div className="slots__spincount-inputs">
            {[1, 2, 5, 10].map((count) => (
              <button
                key={count}
                className={spinCount === count ? 'active' : ''}
                onClick={() => setSpinCount(count)}
              >
                {count}x
              </button>
            ))}
          </div>
          {spinCount > 1 && (
            <p className="slots__spincount-total">
              Mise totale : <strong>{(bet * spinCount).toLocaleString()} jetons</strong>
            </p>
          )}
        </div>

        {error && <p className="slots__error">{error}</p>}

        <button
          className="slots__spin-btn"
          onClick={handleSpin}
          disabled={loading}
        >
          {loading
            ? `Spin en cours...`
            : spinCount > 1
              ? `🎰 Lancer ${spinCount} spins`
              : '🎰 Lancer'}
        </button>
      </div>

      {/* Résumé rafale */}
      {spinHistory.length > 1 && !loading && (
        <div className="slots__summary">
          <h3 className="slots__summary-title">Résumé de la rafale</h3>
          <div className="slots__summary-stats">
            <div className="slots__summary-stat slots__summary-stat--win">
              <span>Gains</span>
              <strong>+{totalWin.toLocaleString()} jetons</strong>
            </div>
            <div className="slots__summary-stat slots__summary-stat--loss">
              <span>Pertes</span>
              <strong>-{totalLoss.toLocaleString()} jetons</strong>
            </div>
            <div className={`slots__summary-stat ${totalWin - totalLoss >= 0 ? 'slots__summary-stat--win' : 'slots__summary-stat--loss'}`}>
              <span>Net</span>
              <strong>{totalWin - totalLoss >= 0 ? '+' : ''}{(totalWin - totalLoss).toLocaleString()} jetons</strong>
            </div>
          </div>
          <div className="slots__history">
            {spinHistory.map((spin, i) => (
              <div key={i} className={`slots__history-row slots__history-row--${spin.isWin ? 'win' : 'loss'}`}>
                <span className="slots__history-reels">
                  {spin.reels.map((s) => SYMBOL_DISPLAY[s]?.emoji || s).join(' ')}
                </span>
                <span className="slots__history-result">
                  {spin.isWin
                    ? `+${spin.payout.toLocaleString()} (x${spin.multiplier})`
                    : `-${spin.bet.toLocaleString()}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Règles */}
      <div className="slots__rules">
        <h3 className="slots__rules-title">Règles & Gains</h3>
        <p className="slots__rules-desc">
          Obtenez <strong>3 symboles identiques</strong> pour gagner. Plus le symbole est rare, plus le gain est élevé.
        </p>
        <div className="slots__rules-table">
          {RULES.map((rule) => (
            <div key={rule.symbol} className="slots__rule-row">
              <div className="slots__rule-symbols">
                <span>{rule.emoji}</span>
                <span>{rule.emoji}</span>
                <span>{rule.emoji}</span>
              </div>
              <div className="slots__rule-info">
                <span className="slots__rule-label" style={{ color: rule.color }}>
                  {rule.label}
                </span>
                <span className="slots__rule-multiplier">x{rule.multiplier}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default SlotsPage;
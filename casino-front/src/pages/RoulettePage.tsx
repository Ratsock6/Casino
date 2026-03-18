import React, { useState } from 'react';
import { useWalletStore } from '../store/wallet.store';
import { spinRouletteApi } from '../api/roulette.api';
import type { RouletteBet, RouletteBetType } from '../types/game.types';
import { getNumberColor, WHEEL_ORDER } from '../utils/roulette.utils';
import '../styles/pages/roulette.scss';

const CHIP_VALUES = [50, 100, 500, 1000, 5000];

const BET_MULTIPLIERS: Record<RouletteBetType, number> = {
  STRAIGHT: 36, SPLIT: 18, STREET: 12, CORNER: 9, SIX_LINE: 6,
  RED: 2, BLACK: 2, EVEN: 2, ODD: 2, LOW: 2, HIGH: 2,
  DOZEN_1: 3, DOZEN_2: 3, DOZEN_3: 3,
  COLUMN_1: 3, COLUMN_2: 3, COLUMN_3: 3,
};

const GRID_ROWS = Array.from({ length: 12 }, (_, i) => [
  i * 3 + 1,
  i * 3 + 2,
  i * 3 + 3,
]);

type RouletteSpinResponse = import('../types/game.types').RouletteSpinResponse;

const RoulettePage = () => {
  const { balance, setBalance } = useWalletStore();

  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [winningColor, setWinningColor] = useState<'red' | 'black' | 'green' | null>(null);
  const [results, setResults] = useState<RouletteSpinResponse['bets'] | null>(null);
  const [totalPayout, setTotalPayout] = useState<number | null>(null);
  const [totalBet, setTotalBet] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [lastBets, setLastBets] = useState<RouletteBet[]>([]);
  const [history, setHistory] = useState<{ number: number; color: string }[]>([]);

  const totalBetAmount = bets.reduce((acc, b) => acc + b.amount, 0);

  const placeBet = (type: RouletteBetType, numbers?: number[]) => {
    setBets((prev) => {
      const existing = prev.find(
        (b) => b.type === type && JSON.stringify(b.numbers) === JSON.stringify(numbers)
      );
      if (existing) {
        return prev.map((b) =>
          b.type === type && JSON.stringify(b.numbers) === JSON.stringify(numbers)
            ? { ...b, amount: b.amount + selectedChip }
            : b
        );
      }
      return [...prev, { type, numbers, amount: selectedChip }];
    });
  };

  const removeBet = (type: string, numbers?: number[]) => {
    setBets((prev) =>
      prev.filter(
        (b) => !(b.type === type && JSON.stringify(b.numbers) === JSON.stringify(numbers))
      )
    );
  };

  const getBetAmount = (type: string, numbers?: number[]): number => {
    const bet = bets.find(
      (b) => b.type === type && JSON.stringify(b.numbers) === JSON.stringify(numbers)
    );
    return bet?.amount || 0;
  };

  const handleSpin = async (overrideBets?: RouletteBet[]) => {
    const activeBets = Array.isArray(overrideBets) ? overrideBets : bets;

    if (spinning) return;
    if (activeBets.length === 0) return setError('Placez au moins un pari.');
    const totalAmount = activeBets.reduce((acc, b) => acc + b.amount, 0);
    if (totalAmount > balance) return setError('Solde insuffisant.');

    setError('');
    setSpinning(true);
    setWinningNumber(null);
    setResults(null);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const idempotencyKey = crypto.randomUUID();

    try {
      const data = await spinRouletteApi(activeBets, idempotencyKey);

      const numberIndex = WHEEL_ORDER.indexOf(data.winningNumber);
      const segmentAngle = 360 / 37;
      const targetAngle = numberIndex * segmentAngle;
      const finalAngle = wheelAngle + 360 * 6 + (360 - targetAngle);
      setWheelAngle(finalAngle);

      setTimeout(() => {
        setWinningNumber(data.winningNumber);
        setWinningColor(data.winningColor.toLowerCase() as 'red' | 'black' | 'green');
        setResults(data.bets);
        setTotalPayout(data.totalPayout);
        setTotalBet(data.totalBet);
        setBalance(parseFloat(data.balanceAfterSettlement));
        setLastBets(activeBets);
        setBets([]);
        setHistory((prev) => [
          { number: data.winningNumber, color: data.winningColor.toLowerCase() },
          ...prev.slice(0, 14),
        ]);
        setSpinning(false);
      }, 3500);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
      setSpinning(false);
    }
  };

  return (
    <div className="roulette">

      {/* Header */}
      <div className="roulette__header">
        <h1 className="roulette__title">Roulette Européenne</h1>
        <p className="roulette__balance">
          Solde : <strong>{balance.toLocaleString()} jetons</strong>
        </p>
      </div>

      {history.length > 0 && (
        <div className="roulette__history">
          <span className="roulette__history-label">Derniers tirages</span>
          <div className="roulette__history-list">
            {history.map((item, i) => (
              <div
                key={i}
                className={`roulette__history-ball roulette__history-ball--${item.color}`}
              >
                {item.number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roue + Résumé */}
      <div className="roulette__top">
        <div className="roulette__wheel-area">
          <div className="roulette__wheel-container">
            <div
              className="roulette__wheel"
              style={{
                transform: `rotate(${wheelAngle}deg)`,
                transition: spinning
                  ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                  : 'none',
              }}
            >
              {WHEEL_ORDER.map((num, i) => {
                const angle = (i * 360) / 37;
                const color = getNumberColor(num);
                return (
                  <div
                    key={num}
                    className={`roulette__segment roulette__segment--${color}`}
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <span
                      className="roulette__segment-number"
                      style={{ transform: 'rotate(90deg)' }}
                    >
                      {num}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="roulette__wheel-center">
              {winningNumber !== null ? (
                <div className={`roulette__winning roulette__winning--${winningColor}`}>
                  {winningNumber}
                </div>
              ) : (
                <div className="roulette__wheel-logo">♠</div>
              )}
            </div>
            <div className="roulette__wheel-marker" />
          </div>
        </div>

        {/* Résumé côté droit */}
        <div className="roulette__side">
          {winningNumber !== null && results ? (
            <div className="roulette__summary">
              <div className={`roulette__summary-winning roulette__summary-winning--${winningColor}`}>
                Numéro gagnant : <strong>{winningNumber}</strong>
              </div>
              <div className="roulette__summary-bets">
                {results.map((bet, i) => (
                  <div
                    key={i}
                    className={`roulette__summary-row roulette__summary-row--${bet.isWin ? 'win' : 'loss'}`}
                  >
                    <span className="roulette__summary-type">{bet.type}</span>
                    <span className="roulette__summary-mise">{bet.amount.toLocaleString()}</span>
                    <span className="roulette__summary-result">
                      {bet.isWin
                        ? `+${bet.payout.toLocaleString()}`
                        : `-${bet.amount.toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className={`roulette__summary-total roulette__summary-total--${totalPayout! > totalBet! ? 'win'
                : totalPayout === totalBet ? 'push'
                  : 'loss'
                }`}>
                {totalPayout! > totalBet!
                  ? `✨ Net : +${(totalPayout! - totalBet!).toLocaleString()} jetons`
                  : totalPayout === totalBet
                    ? `Push — Mise remboursée`
                    : `💸 Perdu ! -${totalBet!.toLocaleString()} jetons`}
              </div>
              {lastBets.length > 0 && bets.length === 0 && (
                <button
                  className="roulette__summary-replay"
                  onClick={() => handleSpin(lastBets)}
                >
                  🔄 Rejouer
                </button>
              )}
            </div>
          ) : (
            <div className="roulette__side-empty">
              <p>Les résultats<br />apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>

      {/* Sélection jetons */}
      <div className="roulette__chips">
        <p className="roulette__chips-label">Valeur du jeton</p>
        <div className="roulette__chips-list">
          {CHIP_VALUES.map((chip) => (
            <button
              key={chip}
              className={`roulette__chip ${selectedChip === chip ? 'roulette__chip--active' : ''}`}
              onClick={() => setSelectedChip(chip)}
            >
              {chip.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="roulette__table">

        {/* Zéro */}
        <button
          className="roulette__cell roulette__cell--green roulette__cell--zero"
          onClick={() => placeBet('STRAIGHT', [0])}
        >
          0
          {getBetAmount('STRAIGHT', [0]) > 0 && (
            <span className="roulette__chip-on">{getBetAmount('STRAIGHT', [0])}</span>
          )}
        </button>

        {/* Grille */}
        <div className="roulette__grid">
          {GRID_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="roulette__grid-group">
              {/* Ligne de numéros */}
              <div className="roulette__row">
                {row.map((num, colIndex) => {
                  const color = getNumberColor(num);
                  const amount = getBetAmount('STRAIGHT', [num]);
                  const nextNum = row[colIndex + 1];

                  return (
                    <React.Fragment key={num}>
                      {/* Cellule numéro */}
                      <button
                        className={`roulette__cell roulette__cell--${color}`}
                        onClick={() => placeBet('STRAIGHT', [num])}
                      >
                        {num}
                        {amount > 0 && <span className="roulette__chip-on">{amount}</span>}
                      </button>

                      {/* Split horizontal — entre ce num et le suivant sur la même ligne */}
                      {nextNum && (
                        <button
                          className="roulette__split-h"
                          onClick={() => placeBet('SPLIT', [num, nextNum].sort((a, b) => a - b))}
                          title={`Split ${num}-${nextNum}`}
                        >
                          {getBetAmount('SPLIT', [num, nextNum].sort((a, b) => a - b)) > 0 && (
                            <span className="roulette__chip-on">
                              {getBetAmount('SPLIT', [num, nextNum].sort((a, b) => a - b))}
                            </span>
                          )}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Street */}
                <button
                  className="roulette__street-btn"
                  onClick={() => placeBet('STREET', row)}
                >
                  {getBetAmount('STREET', row) > 0
                    ? <span className="roulette__chip-on">{getBetAmount('STREET', row)}</span>
                    : '▶'}
                </button>
              </div>

              {/* Six line entre cette ligne et la suivante */}
              {/* Ligne de splits verticaux + corners entre cette row et la suivante */}
              {GRID_ROWS[rowIndex + 1] && (
                <div className="roulette__between-rows">
                  {row.map((num, colIndex) => {
                    const nextRow = GRID_ROWS[rowIndex + 1];
                    const numBelow = nextRow[colIndex];
                    const nextNum = row[colIndex + 1];
                    const nextNumBelow = nextRow[colIndex + 1];

                    return (
                      <React.Fragment key={num}>
                        {/* Split vertical — entre ce num et celui en dessous */}
                        <button
                          className="roulette__split-v"
                          onClick={() => placeBet('SPLIT', [num, numBelow].sort((a, b) => a - b))}
                          title={`Split ${num}-${numBelow}`}
                        >
                          {getBetAmount('SPLIT', [num, numBelow].sort((a, b) => a - b)) > 0 && (
                            <span className="roulette__chip-on">
                              {getBetAmount('SPLIT', [num, numBelow].sort((a, b) => a - b))}
                            </span>
                          )}
                        </button>

                        {/* Corner — entre 4 numéros */}
                        {nextNum && nextNumBelow && (
                          <button
                            className="roulette__corner-btn"
                            onClick={() => placeBet('CORNER', [num, nextNum, numBelow, nextNumBelow].sort((a, b) => a - b))}
                            title={`Corner ${num}-${nextNum}-${numBelow}-${nextNumBelow}`}
                          >
                            {getBetAmount('CORNER', [num, nextNum, numBelow, nextNumBelow].sort((a, b) => a - b)) > 0 && (
                              <span className="roulette__chip-on">
                                {getBetAmount('CORNER', [num, nextNum, numBelow, nextNumBelow].sort((a, b) => a - b))}
                              </span>
                            )}
                          </button>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {/* Spacer pour aligner avec street-btn */}
                  <div className="roulette__between-spacer" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Colonnes */}
        <div className="roulette__columns">
          {(['COLUMN_1', 'COLUMN_2', 'COLUMN_3'] as const).map((col, i) => {
            const labels = ['Col 1', 'Col 2', 'Col 3'];
            const amount = getBetAmount(col);
            return (
              <button
                key={col}
                className="roulette__col-btn"
                onClick={() => placeBet(col)}
              >
                {labels[i]}
                {amount > 0 && <span className="roulette__chip-on">{amount}</span>}
              </button>
            );
          })}
        </div>

      </div>

      {/* Paris extérieurs bas */}
      <div className="roulette__outside">
        <div className="roulette__outside-row">
          {(['DOZEN_1', 'DOZEN_2', 'DOZEN_3'] as const).map((d, i) => {
            const labels = ['1-12', '13-24', '25-36'];
            const amount = getBetAmount(d);
            return (
              <button key={d} className="roulette__outside-btn" onClick={() => placeBet(d)}>
                {labels[i]}
                {amount > 0 && <span className="roulette__chip-on">{amount}</span>}
              </button>
            );
          })}
        </div>
        <div className="roulette__outside-row">
          {[
            { label: '1-18', type: 'LOW' as const },
            { label: 'Pair', type: 'EVEN' as const },
            { label: '🔴 Rouge', type: 'RED' as const },
            { label: '⚫ Noir', type: 'BLACK' as const },
            { label: 'Impair', type: 'ODD' as const },
            { label: '19-36', type: 'HIGH' as const },
          ].map((bet) => {
            const amount = getBetAmount(bet.type);
            return (
              <button
                key={bet.type}
                className={`roulette__outside-btn ${bet.type === 'RED' ? 'roulette__outside-btn--red' : ''} ${bet.type === 'BLACK' ? 'roulette__outside-btn--black' : ''}`}
                onClick={() => placeBet(bet.type)}
              >
                {bet.label}
                {amount > 0 && <span className="roulette__chip-on">{amount}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Résumé des paris */}
      {bets.length > 0 && (
        <div className="roulette__bets">
          <div className="roulette__bets-actions">
            <button className="roulette__bets-clear" onClick={() => setBets([])}>
              Tout effacer
            </button>
          </div>
          <div className="roulette__bets-list">
            {bets.map((bet, i) => (
              <div key={i} className="roulette__bet-row">
                <span className="roulette__bet-type">{bet.type}</span>
                <span className="roulette__bet-numbers">
                  {bet.numbers && bet.numbers.length <= 6
                    ? bet.numbers.join(', ')
                    : bet.numbers
                      ? `${bet.numbers.length} numéros`
                      : '—'}
                </span>
                <span className="roulette__bet-multiplier">x{BET_MULTIPLIERS[bet.type]}</span>
                <span className="roulette__bet-amount">{bet.amount.toLocaleString()}</span>
                <button
                  className="roulette__bet-remove"
                  onClick={() => removeBet(bet.type, bet.numbers)}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="roulette__error">{error}</p>}

      <button
        className="roulette__spin-btn"
        onClick={handleSpin}
        disabled={spinning || bets.length === 0}
      >
        {spinning ? '🎡 La roue tourne...' : '🎡 Lancer la roue'}
      </button>

    </div>
  );
};

export default RoulettePage;
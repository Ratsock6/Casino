import React from 'react';
import type { SlotMachineInfo } from '../../api/slots.api';

interface Props {
  machines: SlotMachineInfo[];
  onSelect: (machineId: string) => void;
}

// Aperçu visuel par thème (dégradé + symboles emblématiques)
const THEME_PREVIEW: Record<string, { gradient: string; emoji: string }> = {
  CLASSIC: { gradient: 'linear-gradient(135deg, #7a1f1f, #c9a84c)', emoji: '🎰' },
  GEMSTONE: { gradient: 'linear-gradient(135deg, #2a1f5e, #3fb6c9)', emoji: '💎' },
};

const MECHANIC_LABEL: Record<string, string> = {
  CLASSIC_3: '3 rouleaux · 3 identiques',
  CASCADE_3X3: 'Grille 3×3 · Cascades',
};

const SlotsSelection: React.FC<Props> = ({ machines, onSelect }) => {
  return (
    <div className="slots-selection">
      <h1 className="slots-selection__title">🎰 Choisissez votre machine</h1>
      <p className="slots-selection__subtitle">
        Chaque machine a sa propre mécanique et son propre style.
      </p>

      <div className="slots-selection__grid">
        {machines.map((m) => {
          const preview = THEME_PREVIEW[m.theme] ?? THEME_PREVIEW.CLASSIC;
          return (
            <button
              key={m.id}
              className="slots-selection__card"
              onClick={() => onSelect(m.id)}
            >
              <div
                className="slots-selection__card-banner"
                style={{ background: preview.gradient }}
              >
                <span className="slots-selection__card-emoji">{preview.emoji}</span>
                <div className="slots-selection__card-symbols">
                  {m.symbols.slice(0, 5).map((s) => (
                    <span key={s.id}>{s.display}</span>
                  ))}
                </div>
              </div>
              <div className="slots-selection__card-body">
                <h2 className="slots-selection__card-name">{m.name}</h2>
                <span className="slots-selection__card-mechanic">
                  {MECHANIC_LABEL[m.mechanic] ?? m.mechanic}
                </span>
                <p className="slots-selection__card-desc">{m.description}</p>
                <div className="slots-selection__card-footer">
                  <span className="slots-selection__card-play">Jouer →</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SlotsSelection;

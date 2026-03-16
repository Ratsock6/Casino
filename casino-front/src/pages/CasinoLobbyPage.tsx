import { CasinoCard } from "../components/ui/CasinoCard";
import { PageHeader } from "../components/ui/PageHeader";

export function CasinoLobbyPage() {
  return (
    <div>
      <PageHeader
        title="Diamond Casino"
        subtitle="L’élégance du jeu, la tension du hasard."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        <CasinoCard>
          <h3>🎰 Slots</h3>
          <p style={{ color: "var(--text-muted)" }}>
            Machines à sous premium avec animations et jackpots.
          </p>
        </CasinoCard>

        <CasinoCard>
          <h3>🎡 Roulette</h3>
          <p style={{ color: "var(--text-muted)" }}>
            Roulette européenne avec paris réalistes.
          </p>
        </CasinoCard>

        <CasinoCard>
          <h3>🃏 Blackjack</h3>
          <p style={{ color: "var(--text-muted)" }}>
            Affronte le dealer dans une ambiance de grand casino.
          </p>
        </CasinoCard>
      </div>
    </div>
  );
}
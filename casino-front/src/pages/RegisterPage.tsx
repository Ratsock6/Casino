import { CasinoButton } from "../components/ui/CasinoButton";
import { CasinoCard } from "../components/ui/CasinoCard";
import { CasinoInput } from "../components/ui/CasinoInput";

export function RegisterPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <CasinoCard>
          <h1 className="gold-text">Inscription</h1>
          <div style={{ display: "grid", gap: 14 }}>
            <CasinoInput placeholder="Pseudo" />
            <CasinoInput placeholder="Prénom" />
            <CasinoInput placeholder="Nom" />
            <CasinoInput placeholder="Date de naissance (AAAA-MM-JJ)" type="date" />
            <CasinoInput placeholder="Mot de passe" type="password" />
            <CasinoButton>Créer un compte</CasinoButton>
          </div>
        </CasinoCard>
      </div>
    </div>
  );
}
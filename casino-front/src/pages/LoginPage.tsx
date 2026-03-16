import { CasinoButton } from "../components/ui/CasinoButton";
import { CasinoCard } from "../components/ui/CasinoCard";
import { CasinoInput } from "../components/ui/CasinoInput";

export function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <CasinoCard>
          <h1 className="gold-text">Connexion</h1>
          <div style={{ display: "grid", gap: 14 }}>
            <CasinoInput placeholder="Nom d'utilisateur" />
            <CasinoInput placeholder="Mot de passe" type="password" />
            <CasinoButton>Se connecter</CasinoButton>
          </div>
        </CasinoCard>
      </div>
    </div>
  );
}
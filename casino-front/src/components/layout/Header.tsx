import { useAuthStore } from "../../store/auth.store";

export function Header() {
  const user = useAuthStore((state) => state.user);

  return (
    <header
      style={{
        padding: "20px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backdropFilter: "blur(8px)",
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Bienvenue au
        </div>
        <div className="gold-text" style={{ fontSize: 20, fontWeight: 700 }}>
          Diamond Casino
        </div>
      </div>

      <div
        className="casino-panel"
        style={{
          padding: "10px 14px",
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>Jetons</span>
        <strong>{user?.balance ?? "0"}</strong>
      </div>
    </header>
  );
}
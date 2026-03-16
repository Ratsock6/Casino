import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Lobby" },
  { to: "/slots", label: "Slots" },
  { to: "/roulette", label: "Roulette" },
  { to: "/blackjack", label: "Blackjack" },
  { to: "/profile", label: "Profil" },
];

export function Sidebar() {
  return (
    <aside
      style={{
        borderRight: "1px solid rgba(255,255,255,0.06)",
        padding: 24,
        background: "rgba(0,0,0,0.14)",
      }}
    >
      <div style={{ marginBottom: 30 }}>
        <div className="gold-text" style={{ fontSize: 26, fontWeight: 800 }}>
          Diamond
        </div>
        <div style={{ opacity: 0.8 }}>Casino</div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              padding: "12px 14px",
              borderRadius: 12,
              background: isActive ? "rgba(201,168,93,0.14)" : "transparent",
              border: isActive
                ? "1px solid rgba(201,168,93,0.25)"
                : "1px solid transparent",
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
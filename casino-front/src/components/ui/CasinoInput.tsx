import { InputHTMLAttributes } from "react";

export function CasinoInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "var(--text)",
        borderRadius: 14,
        padding: "12px 14px",
        outline: "none",
      }}
    />
  );
}
import { ButtonHTMLAttributes } from "react";

export function CasinoButton({
  children,
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        border: "1px solid rgba(201, 168, 93, 0.35)",
        background:
          "linear-gradient(180deg, rgba(201,168,93,0.18), rgba(201,168,93,0.08))",
        color: "var(--text)",
        borderRadius: 14,
        padding: "12px 18px",
        fontWeight: 600,
        boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
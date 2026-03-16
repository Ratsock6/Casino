import { PropsWithChildren } from "react";

export function CasinoCard({ children }: PropsWithChildren) {
  return (
    <div className="casino-panel" style={{ padding: 20 }}>
      {children}
    </div>
  );
}
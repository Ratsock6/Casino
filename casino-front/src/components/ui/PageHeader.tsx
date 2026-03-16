interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ margin: 0, fontSize: 32 }} className="gold-text">
        {title}
      </h1>
      {subtitle ? (
        <p style={{ marginTop: 8, color: "var(--text-muted)" }}>{subtitle}</p>
      ) : null}
    </div>
  );
}
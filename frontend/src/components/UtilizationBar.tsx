export function UtilizationBar({ value, size = "normal" }: { value: number; size?: "normal" | "thin" }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? "var(--dash-red)" : pct >= 70 ? "var(--dash-amber)" : "var(--dash-green)";
  return (
    <div className={`ipam-util-bar ipam-util-bar--${size}`}>
      <div className="ipam-util-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

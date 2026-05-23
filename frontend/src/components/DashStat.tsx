import React from "react";

export function DashStat({ label, value, sub, icon, accent }: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  accent: "teal" | "green" | "red" | "purple" | "blue" | "indigo";
}) {
  return (
    <div className={`dash-stat dash-stat--${accent}`}>
      <div className="dash-stat-icon">{icon}</div>
      <div className="dash-stat-body">
        <strong className="dash-stat-value">{value.toLocaleString()}</strong>
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-sub">{sub}</span>
      </div>
    </div>
  );
}

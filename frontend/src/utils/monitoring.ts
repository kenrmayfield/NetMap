import type { MonitorHistoryPoint } from "../api/client";
import type { Incident } from "../types";

export const BEAT_COLOR: Record<string, string> = {
  online:  "#2dba7c",
  offline: "#e05050",
  unknown: "#7a8fa0",
};

export const HB_MAX_BEATS = 120;

export const MON_COL_WIDTHS_KEY = "netmap.mon_col_widths_v8";
// 6 resizable cols: Device | 24h | 7d | Avg RTT | Services | Checked  (Status+Fav fixed)
export const MON_COL_COUNT = 6;
export const MON_DEFAULT_COL_WIDTHS = [420, 100, 100, 100, 100, 100];

export function beatBg(status: string) {
  return BEAT_COLOR[status] ?? BEAT_COLOR.unknown;
}

export function sampleHistory(full: MonitorHistoryPoint[]): MonitorHistoryPoint[] {
  if (full.length <= HB_MAX_BEATS) return full;
  return Array.from({ length: HB_MAX_BEATS }, (_, i) =>
    full[Math.round(i * (full.length - 1) / (HB_MAX_BEATS - 1))],
  );
}

export function computeIncidents(history: MonitorHistoryPoint[]): Incident[] {
  const incidents: Incident[] = [];
  let incidentStart: string | null = null;
  for (const h of history) {
    const isDown = h.status === "offline";
    if (isDown && incidentStart === null) {
      incidentStart = h.checked_at;
    } else if (!isDown && incidentStart !== null) {
      const durationMin = Math.round((new Date(h.checked_at).getTime() - new Date(incidentStart).getTime()) / 60_000);
      incidents.push({ start: incidentStart, end: h.checked_at, durationMin });
      incidentStart = null;
    }
  }
  if (incidentStart !== null) incidents.push({ start: incidentStart, end: null, durationMin: null });
  return incidents.reverse();
}

export function loadMonColWidths(): number[] | null {
  try {
    const raw = window.localStorage.getItem(MON_COL_WIDTHS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length === MON_COL_COUNT && parsed.every((v) => typeof v === "number" && v >= 40)) {
      return parsed as number[];
    }
  } catch { /* ignore */ }
  return null;
}

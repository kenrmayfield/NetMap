import type { DevicePayload } from "./api/client";

export type SecurityFilters = {
  q: string;
  src_ip: string;
  dst_ip: string;
  src_port: string;
  dst_port: string;
  action: string;
  protocol: string;
  interface: string;
  start_time: string;
  end_time: string;
};

export const emptySecurityFilters: SecurityFilters = {
  q: "",
  src_ip: "",
  dst_ip: "",
  src_port: "",
  dst_port: "",
  action: "",
  protocol: "",
  interface: "",
  start_time: "",
  end_time: "",
};

export type ImportRow = Partial<DevicePayload> & { ip_address: string; _rowError?: string };

export interface Incident {
  start: string;
  end: string | null;
  durationMin: number | null;
}

export type DiagramLayout = {
  groups: Array<{ id: string; label: string }>;
  positions: Record<string, { x: number; y: number }>;
};

export type DiagramLayoutOptions = {
  maxDevicesPerRow?: number;
  spacingScale?: number;
  groupOptions?: Record<string, { spacingScale?: number; maxDevicesPerRow?: number }>;
};

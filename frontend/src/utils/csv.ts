import type { ImportRow } from "../types";

const COLUMN_ALIASES: Record<string, string> = {
  ip: "ip_address", "ip address": "ip_address", ipaddress: "ip_address", "ip_address": "ip_address",
  host: "hostname", name: "hostname", hostname: "hostname",
  "display name": "display_name", displayname: "display_name", label: "display_name", display_name: "display_name", "friendly name": "display_name",
  mac: "mac_address", "mac address": "mac_address", macaddress: "mac_address", mac_address: "mac_address",
  vendor: "vendor", manufacturer: "vendor", make: "vendor",
  type: "device_type", "device type": "device_type", devicetype: "device_type", device_type: "device_type",
  vlan: "vlan_id", "vlan id": "vlan_id", vlanid: "vlan_id", vlan_id: "vlan_id",
  group: "topology_group", "topology group": "topology_group", topology_group: "topology_group", vlan_group: "topology_group", "vlan group": "topology_group",
  site: "topology_group", location: "topology_group",
  notes: "notes", description: "notes", note: "notes",
  tags: "tags", tag: "tags", labels: "tags",
};

function normalizeHeader(h: string): string {
  return COLUMN_ALIASES[h.toLowerCase().trim()] ?? h.toLowerCase().trim();
}

export function rowsToImportRows(raw: Record<string, string>[]): ImportRow[] {
  return raw.map((obj) => {
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      mapped[normalizeHeader(k)] = v;
    }
    const ip = (mapped["ip_address"] ?? "").trim();
    if (!ip) return { ip_address: "", _rowError: "Missing IP address" } as ImportRow;
    const tags = mapped["tags"] ? mapped["tags"].split(",").map((t) => t.trim()).filter(Boolean) : [];
    return {
      ip_address: ip,
      display_name: mapped["display_name"]?.trim() || null,
      hostname: mapped["hostname"]?.trim() || null,
      mac_address: mapped["mac_address"]?.trim() || null,
      vendor: mapped["vendor"]?.trim() || null,
      device_type: mapped["device_type"]?.trim() || null,
      vlan_id: mapped["vlan_id"]?.trim() || null,
      topology_group: mapped["topology_group"]?.trim() || null,
      notes: mapped["notes"]?.trim() || null,
      tags,
    } as ImportRow;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) { result.push(cur); cur = ""; }
    else cur += ch;
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

function parseJSON(text: string): Record<string, string>[] {
  const data = JSON.parse(text);
  const arr: unknown[] = Array.isArray(data) ? data : data.devices ?? data.items ?? data.data ?? [];
  return arr.map((item) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k] = v.join(",");
      else out[k] = v != null ? String(v) : "";
    }
    return out;
  });
}

export async function parseImportFile(file: File): Promise<Record<string, string>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "json") return parseJSON(await file.text());
  if (ext === "xlsx" || ext === "xls") throw new Error("XLSX import is not supported. Please export your data as CSV and import that instead.");
  return parseCSV(await file.text());
}

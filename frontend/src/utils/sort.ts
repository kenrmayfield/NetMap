import type { Device } from "../api/client";
import { ipSortKey } from "./ip";

export function deviceTypeSortRank(device: Device) {
  const normalized = `${device.device_type ?? ""} ${device.icon}`.toLowerCase();
  if (normalized.includes("firewall") || normalized.includes("gateway")) return 0;
  if (normalized.includes("router")) return 1;
  if (normalized.includes("switch")) return 2;
  if (normalized.includes("server") || normalized.includes("nas") || normalized.includes("cloud")) return 3;
  if (normalized.includes("wireless") || normalized.includes("ap") || normalized.includes("wifi")) return 4;
  if (normalized.includes("workstation") || normalized.includes("laptop") || normalized.includes("desktop")) return 5;
  return 6;
}

export function compareDevices(left: Device, right: Device) {
  const typeDiff = deviceTypeSortRank(left) - deviceTypeSortRank(right);
  if (typeDiff !== 0) return typeDiff;
  const nameDiff = (left.hostname ?? "").toLowerCase().localeCompare((right.hostname ?? "").toLowerCase());
  if (nameDiff !== 0) return nameDiff;
  return ipSortKey(left.ip_address).localeCompare(ipSortKey(right.ip_address));
}

export function groupCategoryRank(group: string) {
  const value = group.toLowerCase();
  if (value === "ungrouped" || value.includes("default")) return "900";
  if (value.includes("wan") || value.includes("internet") || value.includes("edge") || value.includes("perimeter") || value.includes("dmz")) return "000";
  if (value.includes("core") || value.includes("infra") || value.includes("mgmt") || value.includes("management") || value.includes("network")) return "100";
  if (value.includes("server") || value.includes("compute") || value.includes("datacenter") || value.includes("dc") || value.includes("storage") || value.includes("nas")) return "200";
  if (value.includes("user") || value.includes("client") || value.includes("workstation") || value.includes("corp") || value.includes("office") || value.includes("lan")) return "300";
  if (value.includes("wifi") || value.includes("wireless") || value.includes("wlan") || value.includes("guest")) return "400";
  if (value.includes("iot") || value.includes("ot") || value.includes("camera") || value.includes("voice")) return "500";
  if (value.includes("lab") || value.includes("test") || value.includes("dev")) return "600";
  return "700";
}

export function groupSortKey(group: string) {
  const normalized = group.trim();
  const categoryRank = groupCategoryRank(normalized);
  const vlanMatch = normalized.match(/^VLAN\s+(\d+)/i);
  if (vlanMatch) return `${categoryRank}-vlan-${vlanMatch[1].padStart(6, "0")}-${normalized.toLowerCase()}`;
  const cidrMatch = normalized.match(/(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})/);
  if (cidrMatch) return `${categoryRank}-cidr-${ipSortKey(cidrMatch[1])}-${cidrMatch[2].padStart(2, "0")}-${normalized.toLowerCase()}`;
  return `${categoryRank}-name-${ipSortKey(normalized.toLowerCase())}`;
}

export function compareGroupLabels(left: string, right: string) {
  return groupSortKey(left).localeCompare(groupSortKey(right));
}

export function deviceHierarchyLevel(device: Device) {
  const normalizedType = `${device.device_type ?? ""} ${device.icon}`.toLowerCase();
  if (normalizedType.includes("firewall") || normalizedType.includes("gateway")) return 0;
  if (normalizedType.includes("router")) return 1;
  if (normalizedType.includes("switch")) return 2;
  if (normalizedType.includes("server") || normalizedType.includes("nas") || normalizedType.includes("cloud")) return 3;
  if (normalizedType.includes("wireless") || normalizedType.includes("ap") || normalizedType.includes("wifi")) return 4;
  if (normalizedType.includes("workstation") || normalizedType.includes("printer") || normalizedType.includes("phone")) return 5;
  return 4;
}

export function devicesByHierarchy(devices: Device[]) {
  const lanes = new Map<number, Device[]>();
  devices
    .slice()
    .sort((left, right) => {
      const levelDiff = deviceHierarchyLevel(left) - deviceHierarchyLevel(right);
      if (levelDiff !== 0) return levelDiff;
      return compareDevices(left, right);
    })
    .forEach((device) => {
      const level = deviceHierarchyLevel(device);
      const lane = lanes.get(level) ?? [];
      lane.push(device);
      lanes.set(level, lane);
    });
  return [...lanes.entries()].sort(([left], [right]) => left - right).map(([, lane]) => lane);
}

export function groupRepresentativeDeviceId(devices: Device[], groupName: string): number | null {
  const candidates = devices
    .filter((device) => device.topology_group === groupName)
    .sort((left, right) => {
      const levelDelta = deviceHierarchyLevel(left) - deviceHierarchyLevel(right);
      if (levelDelta !== 0) return levelDelta;
      return compareDevices(left, right);
    });
  return candidates[0]?.id ?? null;
}
